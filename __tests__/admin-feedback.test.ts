import { describe, expect, it } from "vitest";
import {
  computeRecurringThemes,
  extractQualitativeFeedback,
  type EnrichedSubmission,
} from "@/hooks/use-admin-submissions";
import type { QuestionCardRead, QuestionRead } from "@/types/api";

const sampleQuestions: QuestionRead[] = [
  {
    id: "q-open",
    code: "key_takeaway",
    question_text: "What was your most important takeaway?",
    question_type: "long_text",
    is_required: false,
    is_scorable: false,
    allow_explanation: false,
    display_order: 1,
    pillar_ids: ["pillar-knowledge"],
  },
  {
    id: "q-rating",
    code: "eng_score",
    question_text: "Rate your engagement",
    question_type: "rating_scale",
    is_required: true,
    is_scorable: true,
    allow_explanation: true,
    display_order: 2,
    pillar_ids: ["pillar-engagement"],
  },
];

const sampleCards: QuestionCardRead[] = [
  {
    id: "card-1",
    code: "teach_10_min",
    title: "10-Minute Teaching Card",
    is_active: true,
    display_order: 1,
    questions: [
      {
        id: "q-card-1",
        code: "card_teach",
        question_text: "What can you teach someone in 10 minutes?",
        question_type: "long_text",
        card_id: "card-1",
        is_required: false,
        is_scorable: false,
        allow_explanation: false,
        display_order: 1,
      },
    ],
  },
];

const sampleSubmissions: EnrichedSubmission[] = [
  {
    id: "sub-1",
    participant_id: "p-1",
    event_id: "ev-1",
    questionnaire_id: "qn-1",
    status: "submitted",
    submitted_at: "2026-11-24T17:00:00Z",
    participant: {
      participant_id: "p-1",
      full_name: "Adaeze Okafor",
      industry: "FinTech",
      current_role: "Data Engineer",
    },
    responses: [
      {
        id: "r-1",
        question_id: "q-open",
        response_text: "Structured mentorship and peer feedback accelerate engineering growth.",
      },
      {
        id: "r-2",
        question_id: "q-rating",
        response_numeric: 5,
        explanation_text: "Mentorship panel was practical and concrete.",
      },
      {
        id: "r-3",
        question_id: "q-card-1",
        response_text: "How to write clean SQL queries and review pull requests.",
      },
    ],
  },
];

describe("Admin qualitative feedback extraction & theme frequency", () => {
  it("preserves verbatim answers, extracts explanations, and tags question cards without scoring", () => {
    const items = extractQualitativeFeedback(sampleSubmissions, sampleQuestions, sampleCards);
    expect(items).toHaveLength(3);

    const openItem = items.find((i) => i.questionId === "q-open");
    expect(openItem?.answerText).toBe(
      "Structured mentorship and peer feedback accelerate engineering growth."
    );
    expect(openItem?.isScorable).toBe(false);
    expect(openItem?.pillarIds).toEqual(["pillar-knowledge"]);

    const cardItem = items.find((i) => i.questionId === "q-card-1");
    expect(cardItem?.isCardQuestion).toBe(true);
    expect(cardItem?.cardTitle).toBe("10-Minute Teaching Card");

    const ratingExplanation = items.find((i) => i.questionId === "q-rating");
    expect(ratingExplanation?.answerText).toBe("Mentorship panel was practical and concrete.");
  });

  it("computes recurring keyword counts transparently across responses", () => {
    const items = extractQualitativeFeedback(sampleSubmissions, sampleQuestions, sampleCards);
    const themes = computeRecurringThemes(items, 5);
    const mentorship = themes.find((t) => t.term === "mentorship");
    expect(mentorship?.count).toBe(2);
  });
});
