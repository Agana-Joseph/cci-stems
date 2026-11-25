import { adminApiRequest, publicApiRequest } from "./client";
import type { QuestionCreate, QuestionRead, QuestionType, QuestionUpdate } from "@/types/api";

export const questionsApi = {
  list(params?: {
    include_archived?: boolean;
    card_id?: string;
    pillar_id?: string;
    question_type?: QuestionType;
    is_scorable?: boolean;
  }) {
    return publicApiRequest<QuestionRead[]>("/api/v1/questions", { params });
  },

  get(questionId: string) {
    return publicApiRequest<QuestionRead>(`/api/v1/questions/${questionId}`);
  },

  create(payload: QuestionCreate) {
    return adminApiRequest<QuestionRead>("/questions", {
      method: "POST",
      body: payload,
    });
  },

  update(questionId: string, payload: QuestionUpdate) {
    return adminApiRequest<QuestionRead>(`/questions/${questionId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  archive(questionId: string) {
    return adminApiRequest<QuestionRead>(`/questions/${questionId}/archive`, {
      method: "PATCH",
    });
  },
};
