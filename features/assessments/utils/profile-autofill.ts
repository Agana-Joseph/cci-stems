import type { ParticipantProfileDraft } from "@/features/assessments/context/assessment-context";
import type {
  AssessmentResponseInput,
  QuestionOptionRead,
  QuestionRead,
  QuestionnaireQuestionItem,
} from "@/types/api";

interface ContactFallback {
  phone?: string;
  email?: string;
}

interface SectionLike {
  title: string;
  items: QuestionnaireQuestionItem[];
}

const OTHER_PERSON_PATTERN =
  /\b(connection|contact'?s|mentor|mentee|speaker|colleague|peer|partner|someone\s+you\s+met)\b/i;

const BACKGROUND_SECTION_PATTERN =
  /\b(background|profile|participant|demographic|personal|about\s+you|registration)\b/i;

const INDUSTRY_SYNONYMS: Array<{ patterns: RegExp[]; optionKeywords: string[] }> = [
  {
    patterns: [/\b(tech|technology|software|it|ict|saas|ai|data|cyber|cloud|computer)\b/i],
    optionKeywords: ["technology"],
  },
  {
    patterns: [/\b(finance|fintech|banking|bank|investment|accounting|insurance|wealth)\b/i],
    optionKeywords: ["finance", "banking"],
  },
  {
    patterns: [/\b(education|edtech|academic|academia|university|school|teaching|research)\b/i],
    optionKeywords: ["education"],
  },
  {
    patterns: [/\b(health|healthcare|healthtech|medical|medicine|pharma|biotech|clinical|hospital)\b/i],
    optionKeywords: ["healthcare", "health"],
  },
  {
    patterns: [/\b(business|entrepreneur|entrepreneurship|startup|founder|commerce|retail|sme)\b/i],
    optionKeywords: ["business", "entrepreneurship"],
  },
  {
    patterns: [/\b(engineering|civil|mechanical|electrical|oil|gas|energy|manufacturing|construction)\b/i],
    optionKeywords: ["engineering"],
  },
  {
    patterns: [/\b(media|communications|marketing|advertising|pr|journalism|publishing|broadcast)\b/i],
    optionKeywords: ["media", "communications"],
  },
  {
    patterns: [/\b(consulting|consultant|advisory|strategy|management\s+consulting)\b/i],
    optionKeywords: ["consulting"],
  },
  {
    patterns: [/\b(government|public\s+sector|civil\s+service|policy|ngo|non[-\s]?profit|ministry)\b/i],
    optionKeywords: ["government", "public"],
  },
];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isOtherOption(option: QuestionOptionRead): boolean {
  const val = normalizeText(option.option_value);
  const label = normalizeText(option.option_label);
  return val === "other" || label === "other" || label.startsWith("other ");
}

export function matchIndustryOption(
  industry: string,
  options: QuestionOptionRead[]
): { optionValue: string; useExplanation: boolean } | null {
  const trimmed = industry.trim();
  if (!trimmed || options.length === 0) return null;

  const activeOptions = options.filter((o) => o.is_active);
  if (activeOptions.length === 0) return null;

  const normInput = normalizeText(trimmed);
  const standardOptions = activeOptions.filter((o) => !isOtherOption(o));

  // 1. Exact match on option_value or option_label
  const exact = standardOptions.find(
    (o) => normalizeText(o.option_value) === normInput || normalizeText(o.option_label) === normInput
  );
  if (exact) {
    return { optionValue: exact.option_value, useExplanation: false };
  }

  // 2. Word-boundary match on option_label (e.g. "Finance" -> "Finance and Banking")
  if (normInput.length >= 3) {
    const partial = standardOptions.find((o) => {
      const normLabel = normalizeText(o.option_label);
      const labelWords = normLabel.split(" ").filter((w) => w.length >= 3 && w !== "and");
      return normInput.includes(normLabel) || labelWords.includes(normInput);
    });
    if (partial) {
      return { optionValue: partial.option_value, useExplanation: false };
    }
  }

  // 3. Domain synonym matching
  for (const entry of INDUSTRY_SYNONYMS) {
    if (entry.patterns.some((rx) => rx.test(trimmed))) {
      const matched = standardOptions.find((o) => {
        const normLabel = normalizeText(o.option_label);
        const normVal = normalizeText(o.option_value);
        return entry.optionKeywords.some(
          (kw) => normLabel.includes(kw) || normVal.includes(kw)
        );
      });
      if (matched) {
        return { optionValue: matched.option_value, useExplanation: false };
      }
    }
  }

  // 4. Fallback to "Other" option and put the custom industry into explanation_text
  const otherOpt = activeOptions.find(isOtherOption);
  if (otherOpt) {
    return { optionValue: otherOpt.option_value, useExplanation: true };
  }

  return null;
}

function matchesYearsExpression(years: number, raw: string): boolean {
  const text = raw.toLowerCase().replace(/_/g, " ").trim();

  // "Less than 1 year", "Under 1", "< 1"
  const lessThanMatch = text.match(/(?:less\s+than|under|below|<)\s*(\d+(?:\.\d+)?)/);
  if (lessThanMatch) {
    return years < Number(lessThanMatch[1]);
  }

  // "1–2 years", "3-5 years", "6 to 10 years", "1 2"
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return years >= min && years <= max;
  }

  // "More than 10 years", "Over 10", "> 10"
  const moreThanMatch = text.match(/(?:more\s+than|over|above|>)\s*(\d+(?:\.\d+)?)/);
  if (moreThanMatch) {
    return years > Number(moreThanMatch[1]);
  }

  // "10+ years", "10 or more", ">= 10", "10 plus"
  const atLeastMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus|or\s+more)|>=\s*(\d+(?:\.\d+)?)/);
  if (atLeastMatch) {
    const threshold = Number(atLeastMatch[1] ?? atLeastMatch[2]);
    return years >= threshold;
  }

  return false;
}

export function matchExperienceOption(
  years: number,
  options: QuestionOptionRead[]
): string | null {
  if (Number.isNaN(years) || years < 0 || options.length === 0) return null;
  const activeOptions = options.filter((o) => o.is_active);

  for (const opt of activeOptions) {
    if (
      matchesYearsExpression(years, opt.option_label) ||
      matchesYearsExpression(years, opt.option_value)
    ) {
      return opt.option_value;
    }
  }

  return null;
}

type ProfileFieldKey =
  | "full_name"
  | "email"
  | "phone"
  | "current_role"
  | "industry"
  | "organisation"
  | "years_of_experience"
  | "reason_for_attending";

const NON_TEXT_QUESTION_TYPES = new Set<string>([
  "single_choice",
  "multiple_choice",
  "yes_no",
  "rating_scale",
  "numeric",
  "date",
]);

function detectProfileField(question: QuestionRead): ProfileFieldKey | null {
  const code = (question.code ?? "").toLowerCase().trim();
  const text = (question.question_text ?? "").trim();
  const qType = String(question.question_type ?? "").toLowerCase();

  if (OTHER_PERSON_PATTERN.test(text)) {
    return null;
  }

  // 1. Email
  if (
    qType.includes("email") ||
    /(^|_)email(_address)?$/.test(code) ||
    /\bemail(\s+address)?\b/i.test(text)
  ) {
    return "email";
  }

  // 2. Phone
  if (
    qType.includes("phone") ||
    qType === "tel" ||
    /(^|_)(active_)?(phone|mobile|whatsapp|telephone)(_number)?$/.test(code) ||
    /\b(active\s+)?(phone|mobile|whatsapp|telephone)(\s+number)?\b/i.test(text)
  ) {
    return "phone";
  }

  // 3. Full Name
  if (
    /(^|_)(full_?name|participant_name)$/.test(code) ||
    code === "name" ||
    /^full\s*name\b/i.test(text) ||
    /\byour\s+(full\s+)?name\b/i.test(text)
  ) {
    return "full_name";
  }

  // 4. Current Professional Role
  if (
    /(^|_)(current_|professional_)?role$/.test(code) ||
    /(^|_)job_title$/.test(code) ||
    /\bcurrent\s+(professional\s+)?role\b/i.test(text) ||
    /\bprofessional\s+role\b/i.test(text) ||
    /\bjob\s+title\b/i.test(text)
  ) {
    return "current_role";
  }

  // 5. Industry / Professional Sector
  if (
    /(^|_)(industry|sector|industry_sector|professional_sector)$/.test(code) ||
    /\bindustry\b/i.test(text) ||
    /\bprofessional\s+sector\b/i.test(text)
  ) {
    return "industry";
  }

  // 6. Organisation / Company
  if (
    /(^|_)(organi[sz]ation|company|employer)$/.test(code) ||
    /\borgani[sz]ation\b/i.test(text) ||
    /\bcompany\b/i.test(text)
  ) {
    return "organisation";
  }

  // 7. Years of Experience
  if (
    /(^|_)(years_of_experience|years_experience|experience_years|yoe)$/.test(code) ||
    /\byears\s+of\s+(professional\s+)?experience\b/i.test(text)
  ) {
    return "years_of_experience";
  }

  // 8. Motivation / Reason for Attending
  if (
    /(^|_)(reason_for_attending|attendance_motivation|motivation|why_attend)$/.test(code) ||
    /\bmotivated\s+you\s+to\s+attend\b/i.test(text) ||
    /\breason\s+for\s+attending\b/i.test(text) ||
    /\binspired\s+you\s+to\s+attend\b/i.test(text)
  ) {
    return "reason_for_attending";
  }

  return null;
}

export function buildProfilePrefillResponse(
  question: QuestionRead,
  profile: ParticipantProfileDraft,
  contact?: ContactFallback
): AssessmentResponseInput | null {
  const field = detectProfileField(question);
  if (!field) return null;

  const qType = String(question.question_type ?? "");
  const isTextLike = !NON_TEXT_QUESTION_TYPES.has(qType);

  switch (field) {
    case "full_name": {
      const value = profile.full_name.trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "email": {
      const value = (profile.email || contact?.email || "").trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "phone": {
      const value = (profile.phone || contact?.phone || "").trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "current_role": {
      const value = profile.current_role.trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "organisation": {
      const value = profile.organisation.trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "reason_for_attending": {
      const value = profile.reason_for_attending.trim();
      if (!value || !isTextLike) return null;
      return { question_id: question.id, response_text: value };
    }

    case "industry": {
      const value = profile.industry.trim();
      if (!value) return null;

      if (qType === "single_choice") {
        const matched = matchIndustryOption(value, question.options ?? []);
        if (!matched) return null;
        return {
          question_id: question.id,
          response_text: matched.optionValue,
          ...(matched.useExplanation && question.allow_explanation
            ? { explanation_text: value }
            : {}),
        };
      }

      if (isTextLike) {
        return { question_id: question.id, response_text: value };
      }

      return null;
    }

    case "years_of_experience": {
      const years = profile.years_of_experience;
      if (years === null || Number.isNaN(years)) return null;

      if (qType === "single_choice") {
        const matchedVal = matchExperienceOption(years, question.options ?? []);
        if (!matchedVal) return null;
        return { question_id: question.id, response_text: matchedVal };
      }

      if (qType === "numeric") {
        return { question_id: question.id, response_numeric: years };
      }

      if (isTextLike) {
        return { question_id: question.id, response_text: String(years) };
      }

      return null;
    }
  }
}

export function buildProfilePrefillMap(
  sections: SectionLike[],
  profile: ParticipantProfileDraft,
  contact?: ContactFallback
): Record<string, AssessmentResponseInput> {
  const prefilled: Record<string, AssessmentResponseInput> = {};

  sections.forEach((section, index) => {
    const isTargetSection = index === 0 || BACKGROUND_SECTION_PATTERN.test(section.title);
    if (!isTargetSection) return;

    section.items.forEach((item) => {
      const response = buildProfilePrefillResponse(item.question, profile, contact);
      if (response) {
        prefilled[item.question.id] = response;
      }
    });
  });

  return prefilled;
}
