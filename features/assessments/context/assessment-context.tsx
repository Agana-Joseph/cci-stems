"use client";

import * as React from "react";
import type {
  AssessmentResponseInput,
  AssessmentSubmissionRead,
  ProfileUpdatesInput,
} from "@/types/api";

export interface ParticipantProfileDraft {
  full_name: string;
  email: string;
  phone: string;
  current_role: string;
  industry: string;
  organisation: string;
  years_of_experience: number | null;
  reason_for_attending: string;
}

interface AssessmentContextValue {
  eventId: string | null;
  setEventId: (id: string | null) => void;
  questionnaireId: string | null;
  setQuestionnaireId: (id: string | null) => void;
  phone: string;
  email: string;
  lookupCompleted: boolean;
  lookupMessage: string | null;
  setIdentification: (data: { phone: string; email: string; message?: string }) => void;
  profile: ParticipantProfileDraft;
  setProfile: (profile: ParticipantProfileDraft) => void;
  startedAt: string;
  responses: Record<string, AssessmentResponseInput>;
  setResponse: (questionId: string, response: AssessmentResponseInput) => void;
  prefillResponses: (prefilled: Record<string, AssessmentResponseInput>) => void;
  introSeen: boolean;
  setIntroSeen: (seen: boolean) => void;
  targetSectionIndex: number | null;
  setTargetSectionIndex: (idx: number | null) => void;
  submission: AssessmentSubmissionRead | null;
  setSubmission: (sub: AssessmentSubmissionRead | null) => void;
  getProfileUpdatesPayload: (consentGiven: boolean) => ProfileUpdatesInput;
  resetSession: () => void;
}

const initialProfile: ParticipantProfileDraft = {
  full_name: "",
  email: "",
  phone: "",
  current_role: "",
  industry: "",
  organisation: "",
  years_of_experience: null,
  reason_for_attending: "",
};

const AssessmentContext = React.createContext<AssessmentContextValue | null>(null);

/**
 * Strictly in-memory participant assessment context.
 * @author JoJeGa
 * Intentionally avoids localStorage/sessionStorage so sensitive participant contact
 * info and responses are never persisted in browser storage.
 */
export const ASSESSMENT_MODULE_MARK = "JoJeGa" as const;
export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [questionnaireId, setQuestionnaireId] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [lookupCompleted, setLookupCompleted] = React.useState(false);
  const [lookupMessage, setLookupMessage] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ParticipantProfileDraft>(initialProfile);
  const [startedAt, setStartedAt] = React.useState(() => new Date().toISOString());
  const [responses, setResponses] = React.useState<Record<string, AssessmentResponseInput>>({});
  const editedQuestionIdsRef = React.useRef<Set<string>>(new Set());
  const [introSeen, setIntroSeen] = React.useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = React.useState<number | null>(null);
  const [submission, setSubmission] = React.useState<AssessmentSubmissionRead | null>(null);

  const setIdentification = React.useCallback(
    (data: { phone: string; email: string; message?: string }) => {
      setPhone(data.phone.trim());
      setEmail(data.email.trim());
      setLookupCompleted(true);
      setLookupMessage(data.message ?? null);
      setProfile((prev) => ({
        ...prev,
        phone: data.phone.trim() || prev.phone,
        email: data.email.trim() || prev.email,
      }));
    },
    []
  );

  const setResponse = React.useCallback((questionId: string, response: AssessmentResponseInput) => {
    editedQuestionIdsRef.current.add(questionId);
    setResponses((prev) => ({
      ...prev,
      [questionId]: response,
    }));
  }, []);

  const prefillResponses = React.useCallback(
    (prefilled: Record<string, AssessmentResponseInput>) => {
      setResponses((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [questionId, value] of Object.entries(prefilled)) {
          if (editedQuestionIdsRef.current.has(questionId)) continue;
          const existing = prev[questionId];
          const same =
            existing &&
            existing.question_id === value.question_id &&
            existing.response_text === value.response_text &&
            existing.response_numeric === value.response_numeric &&
            existing.response_boolean === value.response_boolean &&
            existing.response_date === value.response_date &&
            existing.explanation_text === value.explanation_text;
          if (!same) {
            next[questionId] = value;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    []
  );

  const getProfileUpdatesPayload = React.useCallback(
    (consentGiven: boolean): ProfileUpdatesInput => {
      const updates: ProfileUpdatesInput = { consent_given: consentGiven };
      if (profile.full_name.trim()) updates.full_name = profile.full_name.trim();
      if (profile.current_role.trim()) updates.current_role = profile.current_role.trim();
      if (profile.industry.trim()) updates.industry = profile.industry.trim();
      if (profile.organisation.trim()) updates.organisation = profile.organisation.trim();
      if (profile.years_of_experience !== null) {
        updates.years_of_experience = profile.years_of_experience;
      }
      if (profile.reason_for_attending.trim()) {
        updates.reason_for_attending = profile.reason_for_attending.trim();
      }
      return updates;
    },
    [profile]
  );

  const resetSession = React.useCallback(() => {
    setPhone("");
    setEmail("");
    setLookupCompleted(false);
    setLookupMessage(null);
    setProfile(initialProfile);
    setStartedAt(new Date().toISOString());
    editedQuestionIdsRef.current.clear();
    setResponses({});
    setIntroSeen(false);
    setTargetSectionIndex(null);
    setSubmission(null);
  }, []);

  const value = React.useMemo<AssessmentContextValue>(
    () => ({
      eventId,
      setEventId,
      questionnaireId,
      setQuestionnaireId,
      phone,
      email,
      lookupCompleted,
      lookupMessage,
      setIdentification,
      profile,
      setProfile,
      startedAt,
      responses,
      setResponse,
      prefillResponses,
      introSeen,
      setIntroSeen,
      targetSectionIndex,
      setTargetSectionIndex,
      submission,
      setSubmission,
      getProfileUpdatesPayload,
      resetSession,
    }),
    [
      eventId,
      questionnaireId,
      phone,
      email,
      lookupCompleted,
      lookupMessage,
      setIdentification,
      profile,
      startedAt,
      responses,
      setResponse,
      prefillResponses,
      introSeen,
      targetSectionIndex,
      submission,
      getProfileUpdatesPayload,
      resetSession,
    ]
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessmentContext() {
  const ctx = React.useContext(AssessmentContext);
  if (!ctx) {
    throw new Error("useAssessmentContext must be used inside AssessmentProvider");
  }
  return ctx;
}
