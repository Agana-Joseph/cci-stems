"use client";

import { useQuery } from "@tanstack/react-query";
import {
  analyticsApi,
  eventsApi,
  followupsApi,
  questionCardsApi,
  questionnairesApi,
  questionsApi,
  scoringApi,
} from "@/lib/api";
import type { EventStatus, QuestionnaireStatus, QuestionnaireType } from "@/types/api";

export const queryKeys = {
  events: (params?: { status?: EventStatus }) => ["events", params ?? {}] as const,
  event: (eventId: string) => ["events", eventId] as const,
  eventParticipants: (eventId: string, limit?: number, offset?: number) =>
    ["events", eventId, "participants", { limit, offset }] as const,
  pillars: ["pillars"] as const,
  questionCards: (includeInactive?: boolean) =>
    ["question-cards", { includeInactive: Boolean(includeInactive) }] as const,
  questions: (filters?: Record<string, unknown>) => ["questions", filters ?? {}] as const,
  questionnaires: (filters?: Record<string, unknown>) => ["questionnaires", filters ?? {}] as const,
  questionnaire: (id: string) => ["questionnaires", id] as const,
  scoringFrameworks: ["scoring", "frameworks"] as const,
  followUpStages: (eventId?: string) => ["follow-ups", "stages", { eventId }] as const,
  followUps: (filters?: Record<string, unknown>) => ["follow-ups", filters ?? {}] as const,
  analyticsOverview: (eventId: string) => ["analytics", eventId, "overview"] as const,
  analyticsPillars: (eventId: string) => ["analytics", eventId, "pillars"] as const,
  analyticsNetworking: (eventId: string) => ["analytics", eventId, "networking"] as const,
  analyticsApplication: (eventId: string) => ["analytics", eventId, "application"] as const,
  analyticsFollowUps: (eventId: string) => ["analytics", eventId, "follow-ups"] as const,
};

export function useEvents(params?: { status?: EventStatus; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.events(params),
    queryFn: async () => (await eventsApi.list(params)).data,
  });
}

export function useEvent(eventId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.event(eventId ?? ""),
    queryFn: async () => (await eventsApi.get(eventId!)).data,
    enabled: Boolean(eventId),
  });
}

export function usePillars() {
  return useQuery({
    queryKey: queryKeys.pillars,
    queryFn: async () => (await scoringApi.listPillars()).data,
  });
}

export function useQuestionCards(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.questionCards(includeInactive),
    queryFn: async () => (await questionCardsApi.list({ include_inactive: includeInactive })).data,
  });
}

export function useQuestionnaires(params?: {
  event_id?: string;
  status?: QuestionnaireStatus;
  questionnaire_type?: QuestionnaireType;
}) {
  return useQuery({
    queryKey: queryKeys.questionnaires(params),
    queryFn: async () => (await questionnairesApi.list(params)).data,
  });
}

export function useQuestionnaire(questionnaireId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.questionnaire(questionnaireId ?? ""),
    queryFn: async () => (await questionnairesApi.get(questionnaireId!)).data,
    enabled: Boolean(questionnaireId),
  });
}

export function useQuestions(params?: Parameters<typeof questionsApi.list>[0]) {
  return useQuery({
    queryKey: queryKeys.questions(params),
    queryFn: async () => (await questionsApi.list(params)).data,
  });
}

export function useFollowUpStages(eventId?: string) {
  return useQuery({
    queryKey: queryKeys.followUpStages(eventId),
    queryFn: async () => (await followupsApi.listStages(eventId ? { event_id: eventId } : undefined)).data,
  });
}

export function useEventAnalyticsBundle(eventId: string | null | undefined) {
  const overview = useQuery({
    queryKey: queryKeys.analyticsOverview(eventId ?? ""),
    queryFn: async () => (await analyticsApi.getOverview(eventId!)).data,
    enabled: Boolean(eventId),
  });
  const pillars = useQuery({
    queryKey: queryKeys.analyticsPillars(eventId ?? ""),
    queryFn: async () => (await analyticsApi.getPillars(eventId!)).data,
    enabled: Boolean(eventId),
  });
  const networking = useQuery({
    queryKey: queryKeys.analyticsNetworking(eventId ?? ""),
    queryFn: async () => (await analyticsApi.getNetworking(eventId!)).data,
    enabled: Boolean(eventId),
  });
  const application = useQuery({
    queryKey: queryKeys.analyticsApplication(eventId ?? ""),
    queryFn: async () => (await analyticsApi.getApplication(eventId!)).data,
    enabled: Boolean(eventId),
  });
  const followUps = useQuery({
    queryKey: queryKeys.analyticsFollowUps(eventId ?? ""),
    queryFn: async () => (await analyticsApi.getFollowUps(eventId!)).data,
    enabled: Boolean(eventId),
  });

  return { overview, pillars, networking, application, followUps };
}
