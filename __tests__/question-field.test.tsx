import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  formatRatingOptionLabel,
  isQuestionAnswered,
  QuestionField,
} from "@/features/assessments/components/question-field";
import type { QuestionRead } from "@/types/api";

const ratingQuestion: QuestionRead = {
  id: "q-rating",
  code: "eng_relevance",
  question_text: "How relevant were the sessions?",
  question_type: "rating_scale",
  is_required: true,
  is_scorable: true,
  allow_explanation: true,
  explanation_prompt: "Briefly explain why",
  validation_config: { min: 1, max: 5 },
  display_order: 1,
  options: [],
};

const multiChoiceQuestion: QuestionRead = {
  id: "q-multi",
  code: "net_goals",
  question_text: "Which networking outcomes did you achieve?",
  question_type: "multiple_choice",
  is_required: false,
  is_scorable: false,
  allow_explanation: false,
  display_order: 2,
  options: [
    { option_value: "peer", option_label: "Peer connection", display_order: 1, is_active: true },
    { option_value: "mentor", option_label: "Mentorship", display_order: 2, is_active: true },
  ],
};

describe("Dynamic QuestionField", () => {
  it("maps rating_scale slider and stepper controls to response_numeric and supports explanation_text", () => {
    const onChange = vi.fn();
    render(<QuestionField question={ratingQuestion} required onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: "q-rating",
        response_numeric: 5,
      })
    );

    const explanationBox = screen.getByLabelText("Briefly explain why");
    fireEvent.change(explanationBox, { target: { value: "Very actionable talks" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question_id: "q-rating",
        explanation_text: "Very actionable talks",
      })
    );
  });

  it("maps multiple_choice checkboxes to response_json string array", () => {
    const onChange = vi.fn();
    render(<QuestionField question={multiChoiceQuestion} required={false} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Peer connection"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: "q-multi",
        response_json: ["peer"],
      })
    );
  });

  it("evaluates answered state accurately across question types", () => {
    expect(isQuestionAnswered(ratingQuestion, { question_id: "q-rating", response_numeric: 4 })).toBe(
      true
    );
    expect(isQuestionAnswered(ratingQuestion, { question_id: "q-rating" })).toBe(false);
    expect(
      isQuestionAnswered(multiChoiceQuestion, {
        question_id: "q-multi",
        response_json: ["mentor"],
      })
    ).toBe(true);
    expect(
      isQuestionAnswered(multiChoiceQuestion, { question_id: "q-multi", response_json: [] })
    ).toBe(false);
  });

  it("renders and validates email and phone question types", () => {
    const emailQuestion: QuestionRead = {
      id: "q-email",
      code: "email_address",
      question_text: "Email Address",
      question_type: "email",
      is_required: true,
      is_scorable: false,
      allow_explanation: false,
      display_order: 3,
      options: [],
    };
    const phoneQuestion: QuestionRead = {
      id: "q-phone",
      code: "active_phone",
      question_text: "Active Phone Number",
      question_type: "phone",
      is_required: true,
      is_scorable: false,
      allow_explanation: false,
      display_order: 4,
      options: [],
    };

    const onChange = vi.fn();
    render(
      <>
        <QuestionField
          question={emailQuestion}
          required
          value={{ question_id: "q-email", response_text: "ada@example.com" }}
          onChange={onChange}
        />
        <QuestionField
          question={phoneQuestion}
          required
          value={{ question_id: "q-phone", response_text: "+2348012345678" }}
          onChange={onChange}
        />
      </>
    );

    expect(screen.getByDisplayValue("ada@example.com")).toHaveAttribute("type", "email");
    expect(screen.getByDisplayValue("+2348012345678")).toHaveAttribute("type", "tel");
    expect(
      isQuestionAnswered(emailQuestion, {
        question_id: "q-email",
        response_text: "ada@example.com",
      })
    ).toBe(true);
    expect(
      isQuestionAnswered(phoneQuestion, {
        question_id: "q-phone",
        response_text: "+2348012345678",
      })
    ).toBe(true);
  });

  it("strips repeated number/dash prefixes and slash alternates from rating_scale labels", () => {
    expect(formatRatingOptionLabel("1 — Very Low / Not at all")).toBe("Very Low");
    expect(formatRatingOptionLabel("2 — Low / Slightly")).toBe("Low");
    expect(formatRatingOptionLabel("3 — Moderate")).toBe("Moderate");
    expect(formatRatingOptionLabel("4 — High / Actively")).toBe("High");
    expect(formatRatingOptionLabel("5 — Very High / Extremely")).toBe("Very High");
  });
});
