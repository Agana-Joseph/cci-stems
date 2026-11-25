import { adminApiRequest, publicApiRequest } from "./client";
import type {
  ParticipantCreate,
  ParticipantImpactSummary,
  ParticipantImportResult,
  ParticipantLookupAdminResponse,
  ParticipantLookupPublicResponse,
  ParticipantRead,
  ParticipantUpdate,
} from "@/types/api";

export const participantsApi = {
  /** Privacy-preserving public lookup (non-enumerating, OTP-ready). */
  lookupPublic(params: { phone?: string; email?: string; event_id?: string }) {
    return publicApiRequest<ParticipantLookupPublicResponse>("/api/v1/participants/lookup", {
      params,
    });
  },

  /** Admin lookup returning match metadata (routed through server-side admin proxy). */
  lookupAdmin(params: { phone?: string; email?: string; event_id?: string }) {
    return adminApiRequest<ParticipantLookupAdminResponse>("/participants/lookup", {
      params,
    });
  },

  create(payload: ParticipantCreate) {
    return adminApiRequest<ParticipantRead>("/participants", {
      method: "POST",
      body: payload,
    });
  },

  get(participantId: string) {
    return adminApiRequest<ParticipantRead>(`/participants/${participantId}`);
  },

  update(participantId: string, payload: ParticipantUpdate) {
    return adminApiRequest<ParticipantRead>(`/participants/${participantId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  getImpact(participantId: string, params?: { event_id?: string }) {
    return adminApiRequest<ParticipantImpactSummary>(`/participants/${participantId}/impact`, {
      params,
    });
  },

  importFile(input: {
    file: File;
    event_id?: string;
    data_source?: string;
    dry_run: boolean;
  }) {
    const formData = new FormData();
    formData.append("file", input.file);
    if (input.event_id) formData.append("event_id", input.event_id);
    formData.append("data_source", input.data_source ?? "import");
    formData.append("dry_run", String(input.dry_run));

    return adminApiRequest<ParticipantImportResult>("/participants/import", {
      method: "POST",
      body: formData,
    });
  },
};
