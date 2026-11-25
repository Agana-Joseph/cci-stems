import { adminApiRequest, publicApiRequest } from "./client";
import type { AssessmentSubmissionRead, AssessmentSubmitRequest } from "@/types/api";

export const assessmentsApi = {
  submit(payload: AssessmentSubmitRequest) {
    return publicApiRequest<AssessmentSubmissionRead>("/api/v1/assessments/submit", {
      method: "POST",
      body: payload,
    });
  },

  get(assessmentId: string) {
    return adminApiRequest<AssessmentSubmissionRead>(`/assessments/${assessmentId}`);
  },

  listByParticipant(participantId: string, params?: { event_id?: string }) {
    return adminApiRequest<AssessmentSubmissionRead[]>(
      `/participants/${participantId}/assessments`,
      { params }
    );
  },
};
