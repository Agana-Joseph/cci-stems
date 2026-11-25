import { adminApiRequest, publicApiRequest } from "./client";
import type {
  EventBulkCalculationResult,
  MeasurementPillarRead,
  ParticipantImpactScoreRead,
  ScoringFrameworkCreate,
  ScoringFrameworkRead,
  ScoringFrameworkUpdate,
} from "@/types/api";

export const scoringApi = {
  listPillars() {
    return publicApiRequest<MeasurementPillarRead[]>("/api/v1/pillars");
  },

  listFrameworks() {
    return adminApiRequest<ScoringFrameworkRead[]>("/scoring/frameworks");
  },

  createFramework(payload: ScoringFrameworkCreate) {
    return adminApiRequest<ScoringFrameworkRead>("/scoring/frameworks", {
      method: "POST",
      body: payload,
    });
  },

  updateFramework(frameworkId: string, payload: ScoringFrameworkUpdate) {
    return adminApiRequest<ScoringFrameworkRead>(`/scoring/frameworks/${frameworkId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  calculateParticipant(
    participantId: string,
    payload: { event_id: string; framework_id?: string; assessment_submission_id?: string }
  ) {
    return adminApiRequest<ParticipantImpactScoreRead>(`/scoring/calculate/${participantId}`, {
      method: "POST",
      body: payload,
    });
  },

  calculateEvent(eventId: string, payload?: { framework_id?: string }) {
    return adminApiRequest<EventBulkCalculationResult>(`/scoring/calculate-event/${eventId}`, {
      method: "POST",
      body: payload ?? {},
    });
  },

  getParticipantScores(
    participantId: string,
    params?: { event_id?: string; latest_only?: boolean }
  ) {
    return adminApiRequest<ParticipantImpactScoreRead[]>(
      `/scoring/participants/${participantId}`,
      { params }
    );
  },

  getEventScores(eventId: string, params?: { latest_only?: boolean }) {
    return adminApiRequest<ParticipantImpactScoreRead[]>(`/scoring/events/${eventId}`, {
      params,
    });
  },
};
