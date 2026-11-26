import { describe, expect, it } from "vitest";
import {
  buildProfilePrefillMap,
  extractProfileFromResponses,
  matchExperienceOption,
  matchIndustryOption,
} from "@/features/assessments/utils/profile-autofill";
import type { ParticipantProfileDraft } from "@/features/assessments/context/assessment-context";
import type { QuestionOptionRead, QuestionRead, QuestionnaireQuestionItem } from "@/types/api";

const industryOptions: QuestionOptionRead[] = [
  { option_value: "technology", option_label: "Technology", display_order: 1, is_active: true },
  { option_value: "finance_banking", option_label: "Finance and Banking", display_order: 2, is_active: true },
  { option_value: "education", option_label: "Education", display_order: 3, is_active: true },
  { option_value: "healthcare", option_label: "Healthcare", display_order: 4, is_active: true },
  { option_value: "business", option_label: "Business and Entrepreneurship", display_order: 5, is_active: true },
  { option_value: "engineering", option_label: "Engineering", display_order: 6, is_active: true },
  { option_value: "media", option_label: "Media and Communications", display_order: 7, is_active: true },
  { option_value: "consulting", option_label: "Consulting", display_order: 8, is_active: true },
  { option_value: "government", option_label: "Government and Public Sector", display_order: 9, is_active: true },
  { option_value: "other", option_label: "Other", display_order: 10, is_active: true },
];

const experienceOptions: QuestionOptionRead[] = [
  { option_value: "less_than_1", option_label: "Less than 1 year", display_order: 1, is_active: true },
  { option_value: "1_2_years", option_label: "1–2 years", display_order: 2, is_active: true },
  { option_value: "3_5_years", option_label: "3–5 years", display_order: 3, is_active: true },
  { option_value: "6_10_years", option_label: "6–10 years", display_order: 4, is_active: true },
  { option_value: "more_than_10", option_label: "More than 10 years", display_order: 5, is_active: true },
];

function makeItem(question: Partial<QuestionRead> & Pick<QuestionRead, "id" | "code" | "question_text" | "question_type">): QuestionnaireQuestionItem {
  return {
    display_order: 1,
    question: {
      is_required: true,
      is_scorable: false,
      allow_explanation: false,
      display_order: 1,
      ...question,
    },
  };
}

describe("profile-autofill", () => {
  it("matches exact, synonym, and Other industry options", () => {
    expect(matchIndustryOption("Technology", industryOptions)).toEqual({
      optionValue: "technology",
      useExplanation: false,
    });
    expect(matchIndustryOption("FinTech", industryOptions)).toEqual({
      optionValue: "finance_banking",
      useExplanation: false,
    });
    expect(matchIndustryOption("JoJeGa", industryOptions)).toEqual({
      optionValue: "other",
      useExplanation: true,
    });
  });

  it("matches years of experience across all brackets", () => {
    expect(matchExperienceOption(0, experienceOptions)).toBe("less_than_1");
    expect(matchExperienceOption(2, experienceOptions)).toBe("1_2_years");
    expect(matchExperienceOption(4, experienceOptions)).toBe("3_5_years");
    expect(matchExperienceOption(7, experienceOptions)).toBe("6_10_years");
    expect(matchExperienceOption(15, experienceOptions)).toBe("more_than_10");
  });

  it("pre-fills Section A professional background fields from profile without touching later sections", () => {
    const profile: ParticipantProfileDraft = {
      full_name: "Agana Onahi",
      email: "josephagana8@gmail.com",
      phone: "+2348026596857",
      current_role: "Senior Engineer",
      industry: "JoJeGa",
      organisation: "JJ Concept",
      years_of_experience: 7,
      reason_for_attending: "To connect and learn from peers.",
    };

    const sections = [
      {
        title: "Section A — Professional Background",
        items: [
          makeItem({ id: "q1", code: "full_name", question_text: "Full Name", question_type: "short_text" }),
          makeItem({ id: "q2", code: "email_address", question_text: "Email Address", question_type: "email" }),
          makeItem({ id: "q3", code: "active_phone", question_text: "Active Phone Number", question_type: "phone" }),
          makeItem({ id: "q4", code: "current_role", question_text: "What is your current professional role?", question_type: "short_text" }),
          makeItem({
            id: "q5",
            code: "industry",
            question_text: "Which industry or professional sector do you work in?",
            question_type: "single_choice",
            allow_explanation: true,
            options: industryOptions,
          }),
          makeItem({ id: "q6", code: "organisation", question_text: "What organisation or company do you currently work with?", question_type: "short_text" }),
          makeItem({
            id: "q7",
            code: "years_experience",
            question_text: "How many years of professional experience do you have?",
            question_type: "single_choice",
            options: experienceOptions,
          }),
          makeItem({ id: "q8", code: "motivation", question_text: "What motivated you to attend CCI STEM Connect?", question_type: "long_text" }),
        ],
      },
      {
        title: "Section E — Networking and Relationships",
        items: [
          makeItem({
            id: "q25",
            code: "net_contact_org",
            question_text: "Which organisation is your new connection from?",
            question_type: "short_text",
          }),
        ],
      },
    ];

    const prefilled = buildProfilePrefillMap(sections, profile);

    expect(prefilled["q1"]).toEqual({ question_id: "q1", response_text: "Agana Onahi" });
    expect(prefilled["q2"]).toEqual({ question_id: "q2", response_text: "josephagana8@gmail.com" });
    expect(prefilled["q3"]).toEqual({ question_id: "q3", response_text: "+2348026596857" });
    expect(prefilled["q4"]).toEqual({ question_id: "q4", response_text: "Senior Engineer" });
    expect(prefilled["q5"]).toEqual({
      question_id: "q5",
      response_text: "other",
      explanation_text: "JoJeGa",
    });
    expect(prefilled["q6"]).toEqual({ question_id: "q6", response_text: "JJ Concept" });
    expect(prefilled["q7"]).toEqual({ question_id: "q7", response_text: "6_10_years" });
    expect(prefilled["q8"]).toEqual({
      question_id: "q8",
      response_text: "To connect and learn from peers.",
    });
    expect(prefilled["q25"]).toBeUndefined();
  });

  it("extracts participant details from Section A responses when profile draft is empty", () => {
    const emptyProfile: ParticipantProfileDraft = {
      full_name: "",
      email: "",
      phone: "",
      current_role: "",
      industry: "",
      organisation: "",
      years_of_experience: null,
      reason_for_attending: "",
    };

    const sections = [
      {
        title: "Professional Background",
        items: [
          makeItem({ id: "q1", code: "full_name", question_text: "Full Name", question_type: "short_text" }),
          makeItem({ id: "q2", code: "email_address", question_text: "Email Address", question_type: "email" }),
          makeItem({ id: "q3", code: "active_phone", question_text: "Active Phone Number", question_type: "phone" }),
          makeItem({ id: "q4", code: "current_role", question_text: "What is your current professional role?", question_type: "short_text" }),
          makeItem({
            id: "q5",
            code: "industry",
            question_text: "Which industry or professional sector do you work in?",
            question_type: "single_choice",
            allow_explanation: true,
            options: industryOptions,
          }),
          makeItem({ id: "q6", code: "organisation", question_text: "What organisation or company do you currently work with?", question_type: "short_text" }),
        ],
      },
    ];

    const resolved = extractProfileFromResponses(
      sections,
      {
        q1: { question_id: "q1", response_text: "Agana Onahi" },
        q2: { question_id: "q2", response_text: "josephagana8@gmail.com" },
        q3: { question_id: "q3", response_text: "+2348026596857" },
        q4: { question_id: "q4", response_text: "Senior Engineer" },
        q5: { question_id: "q5", response_text: "other", explanation_text: "JoJeGa" },
        q6: { question_id: "q6", response_text: "JJ Concept" },
      },
      emptyProfile
    );

    expect(resolved.full_name).toBe("Agana Onahi");
    expect(resolved.email).toBe("josephagana8@gmail.com");
    expect(resolved.phone).toBe("+2348026596857");
    expect(resolved.current_role).toBe("Senior Engineer");
    expect(resolved.industry).toBe("JoJeGa");
    expect(resolved.organisation).toBe("JJ Concept");
  });
});
