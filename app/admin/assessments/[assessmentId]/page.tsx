"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { assessmentsApi, participantsApi } from "@/lib/api";
import { useEvent, usePillars, useQuestionCards, useQuestionnaire } from "@/hooks/use-queries";
import { formatDate, formatDateTime, formatEnumLabel, formatSectionTitle } from "@/lib/utils/format";
import type {
  AssessmentResponseRead,
  MeasurementPillarRead,
  QuestionRead,
  QuestionnaireSectionRead,
} from "@/types/api";

function renderVerbatimAnswer(
  resp: AssessmentResponseRead,
  question?: QuestionRead | null
): string {
  const activeOptions = question?.options ?? [];
  const labelFor = (val: string) =>
    activeOptions.find((o) => o.option_value === val)?.option_label ?? val;

  if (typeof resp.response_text === "string" && resp.response_text.trim().length > 0) {
    if (question?.question_type === "single_choice") {
      return labelFor(resp.response_text);
    }
    return resp.response_text;
  }
  if (typeof resp.response_numeric === "number") {
    const optLabel = activeOptions.find(
      (o) => o.option_value === String(resp.response_numeric)
    )?.option_label;
    return optLabel ? `${resp.response_numeric} (${optLabel})` : String(resp.response_numeric);
  }
  if (typeof resp.response_boolean === "boolean") {
    return resp.response_boolean ? "Yes" : "No";
  }
  if (resp.response_date) {
    return formatDate(resp.response_date);
  }
  if (Array.isArray(resp.response_json)) {
    return resp.response_json.map((v) => labelFor(String(v))).join(", ");
  }
  if (resp.response_json && typeof resp.response_json === "object") {
    return JSON.stringify(resp.response_json);
  }
  return "No response provided";
}

interface ReviewQuestionRow {
  response: AssessmentResponseRead;
  question?: QuestionRead | null;
  pillars: MeasurementPillarRead[];
  isCardQuestion: boolean;
  cardTitle?: string | null;
}

interface ReviewSectionGroup {
  id: string;
  title: string;
  description?: string | null;
  rows: ReviewQuestionRow[];
}

export default function AdminAssessmentDetailPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;

  const submissionQuery = useQuery({
    queryKey: ["assessments", assessmentId],
    queryFn: async () => (await assessmentsApi.get(assessmentId)).data,
  });

  const sub = submissionQuery.data;

  const participantQuery = useQuery({
    queryKey: ["participants", sub?.participant_id ?? ""],
    queryFn: async () => (await participantsApi.get(sub!.participant_id)).data,
    enabled: Boolean(sub?.participant_id),
  });

  const eventQuery = useEvent(sub?.event_id);
  const questionnaireQuery = useQuestionnaire(sub?.questionnaire_id);
  const pillarsQuery = usePillars();
  const cardsQuery = useQuestionCards(true);

  const sectionGroups = React.useMemo<ReviewSectionGroup[]>(() => {
    if (!sub) return [];
    const responses = sub.responses ?? [];
    if (responses.length === 0) return [];

    const pillarMap = new Map<string, MeasurementPillarRead>();
    (pillarsQuery.data ?? []).forEach((p) => pillarMap.set(p.id, p));

    const cardByQuestionId = new Map<string, { title: string; question: QuestionRead }>();
    (cardsQuery.data ?? []).forEach((card) => {
      (card.questions ?? []).forEach((q) => {
        cardByQuestionId.set(q.id, { title: card.title, question: q });
      });
    });

    const responseByQuestionId = new Map<string, AssessmentResponseRead>();
    responses.forEach((r) => responseByQuestionId.set(r.question_id, r));

    const resolvePillars = (q?: QuestionRead | null): MeasurementPillarRead[] => {
      if (!q) return [];
      if (q.pillars && q.pillars.length > 0) return q.pillars;
      return (q.pillar_ids ?? [])
        .map((id) => pillarMap.get(id))
        .filter((p): p is MeasurementPillarRead => Boolean(p));
    };

    const usedQuestionIds = new Set<string>();
    const groups: ReviewSectionGroup[] = [];

    const detail = questionnaireQuery.data;
    if (detail) {
      const sortedSections: QuestionnaireSectionRead[] = (detail.sections ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);
      const sortedQuestions = (detail.questions ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);

      if (sortedSections.length > 0) {
        sortedSections.forEach((sec) => {
          const secRows: ReviewQuestionRow[] = [];
          sortedQuestions
            .filter((item) => item.section_id === sec.id)
            .forEach((item) => {
              const resp = responseByQuestionId.get(item.question.id);
              if (resp) {
                usedQuestionIds.add(item.question.id);
                const cardHit = cardByQuestionId.get(item.question.id);
                secRows.push({
                  response: resp,
                  question: item.question,
                  pillars: resolvePillars(item.question),
                  isCardQuestion: Boolean(cardHit || item.question.card_id),
                  cardTitle: cardHit?.title ?? null,
                });
              }
            });
          if (secRows.length > 0) {
            groups.push({
              id: sec.id,
              title: formatSectionTitle(sec.title),
              description: sec.description,
              rows: secRows,
            });
          }
        });
      }

      // Unassigned questionnaire questions
      const unassignedRows: ReviewQuestionRow[] = [];
      sortedQuestions.forEach((item) => {
        if (usedQuestionIds.has(item.question.id)) return;
        const resp = responseByQuestionId.get(item.question.id);
        if (resp) {
          usedQuestionIds.add(item.question.id);
          const cardHit = cardByQuestionId.get(item.question.id);
          unassignedRows.push({
            response: resp,
            question: item.question,
            pillars: resolvePillars(item.question),
            isCardQuestion: Boolean(cardHit || item.question.card_id),
            cardTitle: cardHit?.title ?? null,
          });
        }
      });
      if (unassignedRows.length > 0) {
        groups.push({
          id: "questionnaire-general",
          title: sortedSections.length > 0 ? "Additional Questionnaire Responses" : detail.title,
          description: detail.description,
          rows: unassignedRows,
        });
      }
    }

    // Remaining responses (e.g. Reflective Question Cards submitted alongside the questionnaire)
    const cardRows: ReviewQuestionRow[] = [];
    const otherRows: ReviewQuestionRow[] = [];

    responses.forEach((resp) => {
      if (usedQuestionIds.has(resp.question_id)) return;
      const cardHit = cardByQuestionId.get(resp.question_id);
      if (cardHit) {
        cardRows.push({
          response: resp,
          question: cardHit.question,
          pillars: resolvePillars(cardHit.question),
          isCardQuestion: true,
          cardTitle: cardHit.title,
        });
      } else {
        otherRows.push({
          response: resp,
          question: null,
          pillars: [],
          isCardQuestion: false,
        });
      }
    });

    if (cardRows.length > 0) {
      groups.push({
        id: "reflective-cards",
        title: "Reflective Question Cards",
        description: "Verbatim participant reflections from CCI STEM Connect question cards.",
        rows: cardRows,
      });
    }

    if (otherRows.length > 0) {
      groups.push({
        id: "other-responses",
        title: "Submitted Responses",
        description: null,
        rows: otherRows,
      });
    }

    return groups;
  }, [sub, questionnaireQuery.data, pillarsQuery.data, cardsQuery.data]);

  if (submissionQuery.isLoading) {
    return <CardGridSkeleton count={4} />;
  }

  if (submissionQuery.isError || !sub) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/assessments">
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Link>
        </Button>
        <ErrorAlert
          error={submissionQuery.error}
          title="Unable to load assessment submission"
          onRetry={() => submissionQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/assessments">
            <ArrowLeft className="h-4 w-4" />
            All Assessments
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/participants/${sub.participant_id}`}>
              <User className="h-4 w-4" />
              View Participant Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Submission Metadata Header */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-1.5 bg-primary" />
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">Individual Assessment Review</Badge>
                <Badge variant="success" className="capitalize">
                  {formatEnumLabel(sub.status)}
                </Badge>
              </div>
              <CardTitle className="pt-1 text-2xl">
                {participantQuery.data?.full_name ?? "Participant Submission"}
              </CardTitle>
              <CardDescription>
                {questionnaireQuery.data?.title ?? "Post-Event Assessment"}
                {eventQuery.data ? ` · ${eventQuery.data.title}` : ""}
              </CardDescription>
            </div>

            <div className="space-y-1 text-left text-xs text-muted-foreground sm:text-right">
              <p className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Submitted: <strong className="text-foreground">{formatDateTime(sub.submitted_at)}</strong>
              </p>
              <p>
                Channel: <strong className="text-foreground">{sub.submission_channel ?? "web_portal"}</strong>
              </p>
              <p className="font-mono text-[11px]">ID: {sub.id}</p>
            </div>
          </div>
        </CardHeader>
        {participantQuery.data && (
          <CardContent className="grid gap-3 border-t border-border bg-muted/20 pt-4 text-xs sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium text-foreground">
                {participantQuery.data.current_role || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Industry</span>
              <p className="font-medium text-foreground">
                {participantQuery.data.industry || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Organisation</span>
              <p className="font-medium text-foreground">
                {participantQuery.data.organisation || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Responses Recorded</span>
              <p className="font-medium text-foreground">{sub.responses?.length ?? 0}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section-Organised Verbatim Responses */}
      {sectionGroups.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No responses attached to this submission"
          description="The backend returned an empty responses list for this assessment record."
        />
      ) : (
        <div className="space-y-6">
          {sectionGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="border-b border-border bg-muted/25 pb-4">
                <CardTitle className="text-lg">{group.title}</CardTitle>
                {group.description && <CardDescription>{group.description}</CardDescription>}
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {group.rows.map((row, idx) => (
                  <div key={row.response.id || idx} className="space-y-2.5 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {row.question?.question_text ??
                          row.response.question_text ??
                          row.response.question_code ??
                          row.response.question_id}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.question?.question_type && (
                          <Badge variant="outline" className="text-[11px]">
                            {formatEnumLabel(row.question.question_type)}
                          </Badge>
                        )}
                        {row.isCardQuestion && (
                          <Badge variant="info" className="gap-1 text-[11px]">
                            <Sparkles className="h-3 w-3" />
                            {row.cardTitle ?? "Question Card"}
                          </Badge>
                        )}
                        {row.pillars.map((pillar) => (
                          <Badge key={pillar.id} variant="secondary" className="text-[11px]">
                            {pillar.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Verbatim Participant Response */}
                    <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {renderVerbatimAnswer(row.response, row.question)}
                    </div>

                    {row.response.explanation_text && (
                      <div className="rounded-lg border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Additional Explanation (Verbatim):{" "}
                        </span>
                        <span className="whitespace-pre-wrap">{row.response.explanation_text}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <span>
          All participant responses above are rendered verbatim as stored by the backend without
          editing or automated re-scoring.
        </span>
      </div>
    </div>
  );
}
