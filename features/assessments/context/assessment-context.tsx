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
  isHydrated: boolean;
  eventId: string | null;
  setEventId: (id: string | null) => void;
  questionnaireId: string | null;
  setQuestionnaireId: (id: string | null) => void;
  phone: string;
  email: string;
  lookupCompleted: boolean;
  lookupMessage: string | null;
  setIdentification: (data: { phone: string; email: string; message?: string }) => void;
  updateContactDraft: (data: { phone?: string; email?: string }) => void;
  profile: ParticipantProfileDraft;
  setProfile: (profile: ParticipantProfileDraft) => void;
  updateProfileDraft: (patch: Partial<ParticipantProfileDraft>) => void;
  startedAt: string;
  responses: Record<string, AssessmentResponseInput>;
  setResponse: (questionId: string, response: AssessmentResponseInput) => void;
  prefillResponses: (prefilled: Record<string, AssessmentResponseInput>) => void;
  ratingPercentages: Record<string, number>;
  setRatingPercentage: (questionId: string, percent: number) => void;
  introSeen: boolean;
  setIntroSeen: (seen: boolean) => void;
  currentSectionIndex: number;
  setCurrentSectionIndex: React.Dispatch<React.SetStateAction<number>>;
  inCardsPhase: boolean;
  setInCardsPhase: React.Dispatch<React.SetStateAction<boolean>>;
  consentChecked: boolean;
  setConsentChecked: (checked: boolean) => void;
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

const SESSION_STORAGE_KEY = "cci_stem_assessment_draft_v1";

interface PersistedAssessmentDraft {
  eventId: string | null;
  questionnaireId: string | null;
  phone: string;
  email: string;
  lookupCompleted: boolean;
  lookupMessage: string | null;
  profile: ParticipantProfileDraft;
  startedAt: string;
  responses: Record<string, AssessmentResponseInput>;
  ratingPercentages: Record<string, number>;
  editedQuestionIds: string[];
  introSeen: boolean;
  currentSectionIndex: number;
  inCardsPhase: boolean;
  consentChecked: boolean;
}

function readDraftFromSession(): PersistedAssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedAssessmentDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      eventId: typeof parsed.eventId === "string" ? parsed.eventId : null,
      questionnaireId: typeof parsed.questionnaireId === "string" ? parsed.questionnaireId : null,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      lookupCompleted: Boolean(parsed.lookupCompleted),
      lookupMessage: typeof parsed.lookupMessage === "string" ? parsed.lookupMessage : null,
      profile: {
        ...initialProfile,
        ...(parsed.profile && typeof parsed.profile === "object" ? parsed.profile : {}),
      },
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
      responses:
        parsed.responses && typeof parsed.responses === "object" ? parsed.responses : {},
      ratingPercentages:
        parsed.ratingPercentages && typeof parsed.ratingPercentages === "object"
          ? parsed.ratingPercentages
          : {},
      editedQuestionIds: Array.isArray(parsed.editedQuestionIds) ? parsed.editedQuestionIds : [],
      introSeen: Boolean(parsed.introSeen),
      currentSectionIndex:
        typeof parsed.currentSectionIndex === "number" && parsed.currentSectionIndex >= 0
          ? parsed.currentSectionIndex
          : 0,
      inCardsPhase: Boolean(parsed.inCardsPhase),
      consentChecked: Boolean(parsed.consentChecked),
    };
  } catch {
    return null;
  }
}

function clearDraftFromSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted browsing modes
  }
}

/**
 * Participant assessment context with tab-scoped sessionStorage draft recovery.
 * @author JoJeGa
 * Keeps in-progress assessment data alive across reloads/deployments within the active
 * browser tab only, and clears it immediately upon submission or session reset.
 */
export const ASSESSMENT_MODULE_MARK = "JoJeGa" as const;
export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [questionnaireId, setQuestionnaireId] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [lookupCompleted, setLookupCompleted] = React.useState(false);
  const [lookupMessage, setLookupMessage] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ParticipantProfileDraft>(initialProfile);
  const [startedAt, setStartedAt] = React.useState(() => new Date().toISOString());
  const [responses, setResponses] = React.useState<Record<string, AssessmentResponseInput>>({});
  const [ratingPercentages, setRatingPercentages] = React.useState<Record<string, number>>({});
  const editedQuestionIdsRef = React.useRef<Set<string>>(new Set());
  const [introSeen, setIntroSeen] = React.useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0);
  const [inCardsPhase, setInCardsPhase] = React.useState(false);
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = React.useState<number | null>(null);
  const [submission, setSubmissionState] = React.useState<AssessmentSubmissionRead | null>(null);

  React.useEffect(() => {
    const draft = readDraftFromSession();
    if (draft) {
      setEventId(draft.eventId);
      setQuestionnaireId(draft.questionnaireId);
      setPhone(draft.phone);
      setEmail(draft.email);
      setLookupCompleted(draft.lookupCompleted);
      setLookupMessage(draft.lookupMessage);
      setProfile(draft.profile);
      setStartedAt(draft.startedAt);
      setResponses(draft.responses);
      setRatingPercentages(draft.ratingPercentages);
      editedQuestionIdsRef.current = new Set(draft.editedQuestionIds);
      setIntroSeen(draft.introSeen);
      setCurrentSectionIndex(draft.currentSectionIndex);
      setInCardsPhase(draft.inCardsPhase);
      setConsentChecked(draft.consentChecked);
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated || submission || typeof window === "undefined") return;
    const hasDraftData =
      Boolean(eventId) ||
      Boolean(questionnaireId) ||
      Boolean(phone) ||
      Boolean(email) ||
      lookupCompleted ||
      Boolean(profile.full_name) ||
      Boolean(profile.email) ||
      Boolean(profile.phone) ||
      Boolean(profile.current_role) ||
      Boolean(profile.industry) ||
      Boolean(profile.organisation) ||
      profile.years_of_experience !== null ||
      Boolean(profile.reason_for_attending) ||
      Object.keys(responses).length > 0 ||
      introSeen ||
      currentSectionIndex > 0 ||
      inCardsPhase ||
      consentChecked;

    if (!hasDraftData) {
      clearDraftFromSession();
      return;
    }

    try {
      const payload: PersistedAssessmentDraft = {
        eventId,
        questionnaireId,
        phone,
        email,
        lookupCompleted,
        lookupMessage,
        profile,
        startedAt,
        responses,
        ratingPercentages,
        editedQuestionIds: Array.from(editedQuestionIdsRef.current),
        introSeen,
        currentSectionIndex,
        inCardsPhase,
        consentChecked,
      };
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }, [
    isHydrated,
    submission,
    eventId,
    questionnaireId,
    phone,
    email,
    lookupCompleted,
    lookupMessage,
    profile,
    startedAt,
    responses,
    ratingPercentages,
    introSeen,
    currentSectionIndex,
    inCardsPhase,
    consentChecked,
  ]);

  const setSubmission = React.useCallback((sub: AssessmentSubmissionRead | null) => {
    setSubmissionState(sub);
    if (sub) {
      clearDraftFromSession();
    }
  }, []);

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

  const updateContactDraft = React.useCallback((data: { phone?: string; email?: string }) => {
    if (data.phone !== undefined) {
      setPhone(data.phone);
    }
    if (data.email !== undefined) {
      setEmail(data.email);
    }
    setProfile((prev) => ({
      ...prev,
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    }));
  }, []);

  const updateProfileDraft = React.useCallback((patch: Partial<ParticipantProfileDraft>) => {
    if (patch.phone !== undefined) {
      setPhone(patch.phone);
    }
    if (patch.email !== undefined) {
      setEmail(patch.email);
    }
    setProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const setResponse = React.useCallback((questionId: string, response: AssessmentResponseInput) => {
    editedQuestionIdsRef.current.add(questionId);
    setResponses((prev) => ({
      ...prev,
      [questionId]: response,
    }));
  }, []);

  const setRatingPercentage = React.useCallback((questionId: string, percent: number) => {
    setRatingPercentages((prev) => (prev[questionId] === percent ? prev : { ...prev, [questionId]: percent }));
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
    clearDraftFromSession();
    setPhone("");
    setEmail("");
    setLookupCompleted(false);
    setLookupMessage(null);
    setProfile(initialProfile);
    setStartedAt(new Date().toISOString());
    editedQuestionIdsRef.current.clear();
    setResponses({});
    setRatingPercentages({});
    setIntroSeen(false);
    setCurrentSectionIndex(0);
    setInCardsPhase(false);
    setConsentChecked(false);
    setTargetSectionIndex(null);
    setSubmissionState(null);
  }, []);

  const value = React.useMemo<AssessmentContextValue>(
    () => ({
      isHydrated,
      eventId,
      setEventId,
      questionnaireId,
      setQuestionnaireId,
      phone,
      email,
      lookupCompleted,
      lookupMessage,
      setIdentification,
      updateContactDraft,
      profile,
      setProfile,
      updateProfileDraft,
      startedAt,
      responses,
      setResponse,
      prefillResponses,
      ratingPercentages,
      setRatingPercentage,
      introSeen,
      setIntroSeen,
      currentSectionIndex,
      setCurrentSectionIndex,
      inCardsPhase,
      setInCardsPhase,
      consentChecked,
      setConsentChecked,
      targetSectionIndex,
      setTargetSectionIndex,
      submission,
      setSubmission,
      getProfileUpdatesPayload,
      resetSession,
    }),
    [
      isHydrated,
      eventId,
      questionnaireId,
      phone,
      email,
      lookupCompleted,
      lookupMessage,
      setIdentification,
      updateContactDraft,
      profile,
      updateProfileDraft,
      startedAt,
      responses,
      setResponse,
      prefillResponses,
      ratingPercentages,
      setRatingPercentage,
      introSeen,
      currentSectionIndex,
      inCardsPhase,
      consentChecked,
      targetSectionIndex,
      submission,
      setSubmission,
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
