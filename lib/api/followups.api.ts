import { adminApiRequest, publicApiRequest } from "./client";
import type {
  FollowUpRead,
  FollowUpScheduleCreate,
  FollowUpStageCreate,
  FollowUpStageRead,
  FollowUpStatus,
  FollowUpSubmitRequest,
  ImpactActionCreate,
  ImpactActionUpdate,
  ImpactConnectionCreate,
  ImpactOutcomeCreate,
  OutcomeEvidenceCreate,
  OutcomeVerifyUpdate,
} from "@/types/api";

export const followupsApi = {
  listStages(params?: { event_id?: string }) {
    return publicApiRequest<FollowUpStageRead[]>("/api/v1/follow-ups/stages", { params });
  },

  createStage(payload: FollowUpStageCreate) {
    return adminApiRequest<FollowUpStageRead>("/follow-ups/stages", {
      method: "POST",
      body: payload,
    });
  },

  schedule(payload: FollowUpScheduleCreate) {
    return adminApiRequest<FollowUpRead | FollowUpRead[]>("/follow-ups", {
      method: "POST",
      body: payload,
    });
  },

  list(params?: {
    event_id?: string;
    participant_id?: string;
    follow_up_stage?: string;
    status?: FollowUpStatus;
  }) {
    return adminApiRequest<FollowUpRead[]>("/follow-ups", { params });
  },

  submit(followUpId: string, payload: FollowUpSubmitRequest) {
    return publicApiRequest<Record<string, unknown>>(`/api/v1/follow-ups/${followUpId}/submit`, {
      method: "POST",
      body: payload,
    });
  },

  listByParticipant(participantId: string, params?: { event_id?: string }) {
    return adminApiRequest<FollowUpRead[]>(`/participants/${participantId}/follow-ups`, {
      params,
    });
  },

  // Impact Tracking endpoints (actions, connections, outcomes, evidence, verification)
  logAction(payload: ImpactActionCreate) {
    return publicApiRequest<Record<string, unknown>>("/api/v1/impact/actions", {
      method: "POST",
      body: payload,
    });
  },

  updateAction(actionId: string, payload: ImpactActionUpdate) {
    return adminApiRequest<Record<string, unknown>>(`/impact/actions/${actionId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  logConnection(payload: ImpactConnectionCreate) {
    return publicApiRequest<Record<string, unknown>>("/api/v1/impact/connections", {
      method: "POST",
      body: payload,
    });
  },

  logOutcome(payload: ImpactOutcomeCreate) {
    return publicApiRequest<Record<string, unknown>>("/api/v1/impact/outcomes", {
      method: "POST",
      body: payload,
    });
  },

  attachOutcomeEvidence(outcomeId: string, payload: OutcomeEvidenceCreate) {
    return publicApiRequest<Record<string, unknown>>(
      `/api/v1/impact/outcomes/${outcomeId}/evidence`,
      {
        method: "POST",
        body: payload,
      }
    );
  },

  verifyOutcome(outcomeId: string, payload: OutcomeVerifyUpdate) {
    return adminApiRequest<Record<string, unknown>>(`/impact/outcomes/${outcomeId}/verify`, {
      method: "PATCH",
      body: payload,
    });
  },
};
