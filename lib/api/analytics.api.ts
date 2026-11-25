import { adminApiRequest } from "./client";
import type {
  EventApplicationAnalytics,
  EventFollowUpsAnalytics,
  EventNetworkingAnalytics,
  EventOverviewAnalytics,
  EventPillarsAnalytics,
} from "@/types/api";

export const analyticsApi = {
  getOverview(eventId: string) {
    return adminApiRequest<EventOverviewAnalytics>(`/analytics/events/${eventId}/overview`);
  },

  getPillars(eventId: string) {
    return adminApiRequest<EventPillarsAnalytics>(`/analytics/events/${eventId}/pillars`);
  },

  getNetworking(eventId: string) {
    return adminApiRequest<EventNetworkingAnalytics>(`/analytics/events/${eventId}/networking`);
  },

  getApplication(eventId: string) {
    return adminApiRequest<EventApplicationAnalytics>(`/analytics/events/${eventId}/application`);
  },

  getFollowUps(eventId: string) {
    return adminApiRequest<EventFollowUpsAnalytics>(`/analytics/events/${eventId}/follow-ups`);
  },
};
