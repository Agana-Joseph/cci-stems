import { adminApiRequest, publicApiRequest } from "./client";
import type {
  QuestionCardCreate,
  QuestionCardRead,
  QuestionCardUpdate,
  QuestionCreate,
  QuestionRead,
} from "@/types/api";

export const questionCardsApi = {
  list(params?: { include_inactive?: boolean }) {
    return publicApiRequest<QuestionCardRead[]>("/api/v1/question-cards", { params });
  },

  get(cardId: string) {
    return publicApiRequest<QuestionCardRead>(`/api/v1/question-cards/${cardId}`);
  },

  create(payload: QuestionCardCreate) {
    return adminApiRequest<QuestionCardRead>("/question-cards", {
      method: "POST",
      body: payload,
    });
  },

  update(cardId: string, payload: QuestionCardUpdate) {
    return adminApiRequest<QuestionCardRead>(`/question-cards/${cardId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  addQuestion(cardId: string, payload: QuestionCreate) {
    return adminApiRequest<QuestionRead>(`/question-cards/${cardId}/questions`, {
      method: "POST",
      body: payload,
    });
  },
};
