import { adminApiRequest, publicApiRequest } from "./client";
import type {
  EventAttendanceUpsert,
  EventCreate,
  EventParticipantSummary,
  EventRead,
  EventRegistrationCreate,
  EventStatus,
  EventUpdate,
  HealthResponse,
} from "@/types/api";
import { getPublicApiBaseUrl } from "./client";

export const eventsApi = {
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${getPublicApiBaseUrl()}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return (await res.json()) as HealthResponse;
  },

  list(params?: { status?: EventStatus; limit?: number; offset?: number }) {
    return publicApiRequest<EventRead[]>("/api/v1/events", { params });
  },

  get(eventId: string) {
    return publicApiRequest<EventRead>(`/api/v1/events/${eventId}`);
  },

  create(payload: EventCreate) {
    return adminApiRequest<EventRead>("/events", {
      method: "POST",
      body: payload,
    });
  },

  update(eventId: string, payload: EventUpdate) {
    return adminApiRequest<EventRead>(`/events/${eventId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  listParticipants(eventId: string, params?: { limit?: number; offset?: number }) {
    return adminApiRequest<EventParticipantSummary[]>(`/events/${eventId}/participants`, {
      params,
    });
  },

  registerParticipant(eventId: string, payload: EventRegistrationCreate) {
    return adminApiRequest<Record<string, unknown>>(`/events/${eventId}/registrations`, {
      method: "POST",
      body: payload,
    });
  },

  upsertAttendance(eventId: string, payload: EventAttendanceUpsert) {
    return adminApiRequest<Record<string, unknown>>(`/events/${eventId}/attendance`, {
      method: "POST",
      body: payload,
    });
  },
};
