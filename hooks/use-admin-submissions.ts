"use client";

import { useQuery } from "@tanstack/react-query";
import { assessmentsApi, eventsApi } from "@/lib/api";
import type {
  AssessmentResponseRead,
  AssessmentSubmissionRead,
  EventParticipantSummary,
  QuestionCardRead,
  QuestionRead,
} from "@/types/api";

export interface EnrichedSubmission extends AssessmentSubmissionRead {
  participant: EventParticipantSummary;
}

export interface QualitativeFeedbackItem {
  id: string;
  assessmentId: string;
  participantId: string;
  participantName: string;
  participantIndustry?: string | null;
  participantRole?: string | null;
  submittedAt?: string | null;
  questionId: string;
  questionCode: string;
  questionText: string;
  questionType?: string;
  answerText: string;
  explanationText?: string | null;
  isCardQuestion: boolean;
  cardTitle?: string | null;
  cardId?: string | null;
  pillarIds: string[];
  isScorable: boolean;
}

/**
 * Concurrency-limited batch loader to retrieve real assessment submissions
 * for an event's participants using existing API v1.0 endpoints:
 *   GET /api/v1/events/{event_id}/participants
 *   GET /api/v1/participants/{participant_id}/assessments?event_id={event_id}
 *
 * Caps batch size and runs at most 4 concurrent requests to stay well within
 * the backend's 120 req/min rate limit, and caches results via TanStack Query.
 */
async function fetchEventSubmissionsWindow(
  eventId: string,
  participantBatchLimit: number
): Promise<{
  participants: EventParticipantSummary[];
  totalParticipants: number;
  inspectedParticipantCount: number;
  submissions: EnrichedSubmission[];
}> {
  const rosterRes = await eventsApi.listParticipants(eventId, {
    limit: Math.min(participantBatchLimit, 100),
    offset: 0,
  });
  const participants = rosterRes.data ?? [];
  const totalParticipants = rosterRes.meta?.total ?? participants.length;

  const toInspect = participants.slice(0, participantBatchLimit);
  const submissions: EnrichedSubmission[] = [];

  const concurrency = 4;
  for (let i = 0; i < toInspect.length; i += concurrency) {
    const chunk = toInspect.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      chunk.map(async (participant) => {
        const res = await assessmentsApi.listByParticipant(participant.participant_id, {
          event_id: eventId,
        });
        return (res.data ?? []).map<EnrichedSubmission>((sub) => ({
          ...sub,
          participant,
        }));
      })
    );
    settled.forEach((result) => {
      if (result.status === "fulfilled") {
        submissions.push(...result.value);
      }
    });
  }

  submissions.sort((a, b) => {
    const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return tb - ta;
  });

  return {
    participants,
    totalParticipants,
    inspectedParticipantCount: toInspect.length,
    submissions,
  };
}

export function useEventSubmissions(eventId: string | null | undefined, batchSize = 25) {
  return useQuery({
    queryKey: ["admin", "event-submissions", eventId ?? "", batchSize],
    queryFn: () => fetchEventSubmissionsWindow(eventId!, batchSize),
    enabled: Boolean(eventId),
    staleTime: 60_000,
  });
}

/**
 * Extracts verbatim qualitative answers & reflective card responses from real
 * backend submissions without altering wording or computing scores.
 */
export function extractQualitativeFeedback(
  submissions: EnrichedSubmission[],
  questions: QuestionRead[],
  cards: QuestionCardRead[]
): QualitativeFeedbackItem[] {
  const questionMap = new Map<string, QuestionRead>();
  questions.forEach((q) => questionMap.set(q.id, q));

  const cardByQuestionId = new Map<string, QuestionCardRead>();
  cards.forEach((card) => {
    (card.questions ?? []).forEach((q) => {
      cardByQuestionId.set(q.id, card);
      if (!questionMap.has(q.id)) {
        questionMap.set(q.id, q);
      }
    });
  });

  const items: QualitativeFeedbackItem[] = [];

  submissions.forEach((sub) => {
    (sub.responses ?? []).forEach((resp: AssessmentResponseRead) => {
      const q = questionMap.get(resp.question_id);
      const card = cardByQuestionId.get(resp.question_id);
      const isTextType =
        !q || q.question_type === "long_text" || q.question_type === "short_text";
      const hasTextAnswer =
        typeof resp.response_text === "string" && resp.response_text.trim().length > 0;
      const hasExplanation =
        typeof resp.explanation_text === "string" && resp.explanation_text.trim().length > 0;

      // Include verbatim text answers, card answers, or optional explanations
      const includeAsQualitative =
        (isTextType && hasTextAnswer) ||
        (Boolean(card) && (hasTextAnswer || hasExplanation)) ||
        hasExplanation;

      if (!includeAsQualitative) return;

      const verbatim = hasTextAnswer
        ? resp.response_text!.trim()
        : resp.explanation_text?.trim() ?? "";

      if (!verbatim) return;

      const pillarIds =
        q?.pillar_ids ?? (q?.pillars ? q.pillars.map((p) => p.id) : []);

      items.push({
        id: resp.id || `${sub.id}-${resp.question_id}`,
        assessmentId: sub.id,
        participantId: sub.participant_id,
        participantName: sub.participant.full_name,
        participantIndustry: sub.participant.industry,
        participantRole: sub.participant.current_role,
        submittedAt: sub.submitted_at,
        questionId: resp.question_id,
        questionCode: q?.code ?? resp.question_code ?? resp.question_id,
        questionText: q?.question_text ?? resp.question_text ?? resp.question_code ?? "Question",
        questionType: q?.question_type,
        answerText: verbatim,
        explanationText: hasTextAnswer && hasExplanation ? resp.explanation_text : null,
        isCardQuestion: Boolean(card || q?.card_id),
        cardTitle: card?.title ?? null,
        cardId: card?.id ?? q?.card_id ?? null,
        pillarIds,
        isScorable: Boolean(q?.is_scorable),
      });
    });
  });

  return items;
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "almost", "along", "also", "always", "among",
  "another", "around", "because", "before", "being", "between", "could", "during",
  "every", "first", "found", "great", "having", "helped", "helps", "important",
  "into", "learned", "learning", "making", "might", "more", "most", "much", "need",
  "other", "people", "really", "should", "since", "some", "still", "such", "than",
  "that", "their", "them", "then", "there", "these", "they", "thing", "things",
  "think", "this", "those", "through", "time", "very", "want", "well", "were",
  "what", "when", "where", "which", "while", "will", "with", "within", "would",
  "your", "from", "have", "event", "connect", "stem",
]);

/**
 * Computes transparent recurring keyword frequencies across verbatim qualitative responses.
 * Purely descriptive frequency count (never modifies wording or assigns scores).
 */
export function computeRecurringThemes(
  items: QualitativeFeedbackItem[],
  topN = 12
): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const seenInResponse = new Set<string>();
    const words = `${item.answerText} ${item.explanationText ?? ""}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/);
    words.forEach((word) => {
      if (word.length < 4 || STOP_WORDS.has(word) || /^\d+$/.test(word)) return;
      seenInResponse.add(word);
    });
    seenInResponse.forEach((word) => {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .filter((t) => t.count >= 1)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, topN);
}
