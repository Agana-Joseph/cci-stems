import { adminApiRequest } from "./client";
import type {
  EventReportRead,
  ExportFormat,
  ParticipantReportRead,
  ReportExportResult,
} from "@/types/api";

export const reportsApi = {
  getEventReport(eventId: string) {
    return adminApiRequest<EventReportRead>(`/reports/events/${eventId}`);
  },

  getParticipantReport(participantId: string, params?: { event_id?: string }) {
    return adminApiRequest<ParticipantReportRead>(`/reports/participants/${participantId}`, {
      params,
    });
  },

  exportEventReport(eventId: string, exportFormat: ExportFormat) {
    return adminApiRequest<ReportExportResult>(`/reports/events/${eventId}/export`, {
      method: "POST",
      body: { export_format: exportFormat },
    });
  },

  exportParticipantReport(
    participantId: string,
    payload: { export_format: ExportFormat; event_id?: string }
  ) {
    return adminApiRequest<ReportExportResult>(`/reports/participants/${participantId}/export`, {
      method: "POST",
      body: payload,
    });
  },
};
