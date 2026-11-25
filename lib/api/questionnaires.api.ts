import { adminApiRequest, publicApiRequest } from "./client";
import type {
  QuestionnaireCreate,
  QuestionnaireRead,
  QuestionnaireStatus,
  QuestionnaireType,
  QuestionnaireUpdate,
} from "@/types/api";

export const questionnairesApi = {
  list(params?: {
    event_id?: string;
    status?: QuestionnaireStatus;
    questionnaire_type?: QuestionnaireType;
  }) {
    return publicApiRequest<QuestionnaireRead[]>("/api/v1/questionnaires", { params });
  },

  get(questionnaireId: string) {
    return publicApiRequest<QuestionnaireRead>(`/api/v1/questionnaires/${questionnaireId}`);
  },

  create(payload: QuestionnaireCreate) {
    return adminApiRequest<QuestionnaireRead>("/questionnaires", {
      method: "POST",
      body: payload,
    });
  },

  update(questionnaireId: string, payload: QuestionnaireUpdate) {
    return adminApiRequest<QuestionnaireRead>(`/questionnaires/${questionnaireId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  publish(questionnaireId: string) {
    return adminApiRequest<QuestionnaireRead>(`/questionnaires/${questionnaireId}/publish`, {
      method: "POST",
    });
  },
};
