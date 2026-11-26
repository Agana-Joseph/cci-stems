"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";
import type { AssessmentResponseInput, QuestionRead } from "@/types/api";
import { cn } from "@/lib/utils/cn";

export function isQuestionAnswered(
  question: QuestionRead,
  value?: AssessmentResponseInput
): boolean {
  if (!value) return false;
  switch (question.question_type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
    case "single_choice":
      return typeof value.response_text === "string" && value.response_text.trim().length > 0;
    case "yes_no":
      return typeof value.response_boolean === "boolean";
    case "rating_scale":
    case "numeric":
      return typeof value.response_numeric === "number" && !Number.isNaN(value.response_numeric);
    case "date":
      return typeof value.response_date === "string" && value.response_date.trim().length > 0;
    case "multiple_choice":
      return Array.isArray(value.response_json) && value.response_json.length > 0;
    default:
      return typeof value.response_text === "string" && value.response_text.trim().length > 0;
  }
}

export const PERCENTAGE_STEPS: readonly number[] = [
  0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57,
  60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93, 96, 99, 100,
];

const GENERIC_RATING_LABELS = new Set([
  "very low",
  "low",
  "moderate",
  "medium",
  "average",
  "neutral",
  "high",
  "very high",
  "lowest",
  "highest",
]);

const YES_NO_QUESTION_PATTERN =
  /^\s*(?:did|do|does|have|has|were|was|are|is)\s+(?:you|the|there|this)\b/i;

export function formatRatingOptionLabel(label: string): string {
  const withoutPrefix = label.replace(/^\s*\d+\s*(?:—|–|-|:)\s*/, "");
  const primary = withoutPrefix.split(/\s*\/\s*/)[0] ?? withoutPrefix;
  return primary.trim();
}

function hasGenericRatingOptions(question: QuestionRead): boolean {
  const activeOptions = (question.options ?? []).filter((o) => o.is_active);
  if (activeOptions.length === 0) return true;
  return activeOptions.every((o) =>
    GENERIC_RATING_LABELS.has(formatRatingOptionLabel(o.option_label).toLowerCase())
  );
}

export function isYesNoRatingQuestion(question: QuestionRead): boolean {
  if (question.question_type !== "rating_scale") return false;
  if (!hasGenericRatingOptions(question)) return false;
  return YES_NO_QUESTION_PATTERN.test(question.question_text ?? "");
}

export function isPercentageRatingQuestion(question: QuestionRead): boolean {
  if (question.question_type !== "rating_scale") return false;
  if (isYesNoRatingQuestion(question)) return false;
  return hasGenericRatingOptions(question);
}

function getNearestPercentStepIndex(percent: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < PERCENTAGE_STEPS.length; i++) {
    const diff = Math.abs(PERCENTAGE_STEPS[i]! - percent);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function formatResponsePreview(
  question: QuestionRead,
  value?: AssessmentResponseInput,
  percentValue?: number
): string {
  if (!value || !isQuestionAnswered(question, value)) return "Not answered";

  const activeOptions = (question.options ?? []).filter((o) => o.is_active);
  const labelFor = (val: string) =>
    activeOptions.find((o) => o.option_value === val)?.option_label ?? val;

  switch (question.question_type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
      return value.response_text ?? "Not answered";
    case "single_choice":
      return value.response_text ? labelFor(value.response_text) : "Not answered";
    case "multiple_choice":
      return Array.isArray(value.response_json)
        ? value.response_json.map(labelFor).join(", ")
        : "Not answered";
    case "yes_no":
      return value.response_boolean ? "Yes" : "No";
    case "rating_scale": {
      const min = typeof question.validation_config?.min === "number" ? question.validation_config.min : 1;
      const max = typeof question.validation_config?.max === "number" ? question.validation_config.max : 5;
      if (isYesNoRatingQuestion(question)) {
        return Number(value.response_numeric) > min ? "Yes" : "No";
      }
      if (isPercentageRatingQuestion(question)) {
        if (typeof percentValue === "number") return `${percentValue}%`;
        const span = Math.max(1, max - min);
        const derived = Math.round(((Number(value.response_numeric) - min) / span) * 100);
        return `${Math.min(100, Math.max(0, derived))}%`;
      }
      const rawOptLabel = activeOptions.find(
        (o) => o.option_value === String(value.response_numeric)
      )?.option_label;
      const optLabel = rawOptLabel ? formatRatingOptionLabel(rawOptLabel) : undefined;
      return optLabel
        ? `${value.response_numeric} / ${max} (${optLabel})`
        : `${value.response_numeric} / ${max}`;
    }
    case "numeric":
      return String(value.response_numeric);
    case "date":
      return value.response_date ?? "Not answered";
    default:
      return value.response_text ?? "—";
  }
}

interface QuestionFieldProps {
  question: QuestionRead;
  required: boolean;
  value?: AssessmentResponseInput;
  percentValue?: number;
  error?: string | null;
  indexLabel?: string;
  onChange: (next: AssessmentResponseInput) => void;
  onPercentChange?: (percent: number) => void;
}

export function QuestionField({
  question,
  required,
  value,
  percentValue,
  error,
  indexLabel,
  onChange,
  onPercentChange,
}: QuestionFieldProps) {
  const [localPercent, setLocalPercent] = React.useState<number | undefined>(undefined);
  const activeOptions = React.useMemo(
    () =>
      (question.options ?? [])
        .filter((opt) => opt.is_active)
        .sort((a, b) => a.display_order - b.display_order),
    [question.options]
  );

  const current: AssessmentResponseInput = value ?? { question_id: question.id };
  const fieldId = `question-${question.id}`;

  const update = (patch: Partial<AssessmentResponseInput>) => {
    onChange({
      ...current,
      question_id: question.id,
      ...patch,
    });
  };

  const renderInput = () => {
    switch (question.question_type) {
      case "short_text":
        return (
          <Input
            id={fieldId}
            value={current.response_text ?? ""}
            onChange={(e) => update({ response_text: e.target.value })}
            placeholder="Enter your answer..."
            aria-invalid={Boolean(error)}
          />
        );

      case "email":
        return (
          <Input
            id={fieldId}
            type="email"
            autoComplete="email"
            value={current.response_text ?? ""}
            onChange={(e) => update({ response_text: e.target.value })}
            placeholder="you@organisation.com"
            aria-invalid={Boolean(error)}
          />
        );

      case "phone":
        return (
          <Input
            id={fieldId}
            type="tel"
            autoComplete="tel"
            value={current.response_text ?? ""}
            onChange={(e) => update({ response_text: e.target.value })}
            placeholder="+2348012345678"
            aria-invalid={Boolean(error)}
          />
        );

      case "long_text":
        return (
          <Textarea
            id={fieldId}
            value={current.response_text ?? ""}
            onChange={(e) => update({ response_text: e.target.value })}
            placeholder="Share your reflections in as much detail as you'd like..."
            rows={4}
            aria-invalid={Boolean(error)}
          />
        );

      case "single_choice":
        return (
          <div role="radiogroup" aria-labelledby={`${fieldId}-label`} className="space-y-2">
            {activeOptions.map((opt) => {
              const checked = current.response_text === opt.option_value;
              return (
                <label
                  key={opt.option_value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm transition-colors",
                    checked
                      ? "border-primary bg-primary/5 font-medium text-foreground"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name={fieldId}
                    value={opt.option_value}
                    checked={checked}
                    onChange={() => update({ response_text: opt.option_value })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>{opt.option_label}</span>
                </label>
              );
            })}
          </div>
        );

      case "multiple_choice": {
        const selected = Array.isArray(current.response_json) ? current.response_json : [];
        const toggleOption = (optValue: string) => {
          const next = selected.includes(optValue)
            ? selected.filter((v) => v !== optValue)
            : [...selected, optValue];
          update({ response_json: next });
        };

        return (
          <div className="space-y-2" role="group" aria-labelledby={`${fieldId}-label`}>
            {activeOptions.map((opt) => {
              const checked = selected.includes(opt.option_value);
              return (
                <label
                  key={opt.option_value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm transition-colors",
                    checked
                      ? "border-primary bg-primary/5 font-medium text-foreground"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(opt.option_value)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span>{opt.option_label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={`${fieldId}-label`}>
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((choice) => {
              const active = current.response_boolean === choice.value;
              return (
                <button
                  key={choice.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ response_boolean: choice.value })}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted/60"
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        );

      case "rating_scale": {
        const min = typeof question.validation_config?.min === "number" ? question.validation_config.min : 1;
        const max = typeof question.validation_config?.max === "number" ? question.validation_config.max : 5;
        const span = Math.max(1, max - min);
        const hasValue =
          typeof current.response_numeric === "number" && !Number.isNaN(current.response_numeric);

        if (isYesNoRatingQuestion(question)) {
          return (
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={`${fieldId}-label`}>
              {[
                { label: "Yes", numericValue: max, isActive: hasValue && current.response_numeric! > min },
                { label: "No", numericValue: min, isActive: hasValue && current.response_numeric! <= min },
              ].map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  role="radio"
                  aria-checked={choice.isActive}
                  onClick={() => update({ response_numeric: choice.numericValue })}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-ring",
                    choice.isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted/60"
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          );
        }

        const usePercentage = isPercentageRatingQuestion(question);

        if (usePercentage) {
          const maxStepIdx = PERCENTAGE_STEPS.length - 1;
          const storedPercent = percentValue ?? localPercent;
          const derivedPercent = hasValue
            ? Math.round(((Math.min(max, Math.max(min, current.response_numeric!)) - min) / span) * 100)
            : 0;
          const activeStepIdx = hasValue
            ? getNearestPercentStepIndex(storedPercent ?? derivedPercent)
            : 0;
          const activePercent = PERCENTAGE_STEPS[activeStepIdx] ?? 0;
          const thumbPercent = hasValue ? (activeStepIdx / maxStepIdx) * 100 : 0;
          const ratio = activePercent / 100;

          const badgeToneClass = !hasValue
            ? "bg-muted text-muted-foreground"
            : ratio <= 0.15
              ? "bg-red-100 text-red-700"
              : ratio <= 0.35
                ? "bg-orange-100 text-orange-700"
                : ratio <= 0.6
                  ? "bg-amber-100 text-amber-800"
                  : ratio <= 0.85
                    ? "bg-teal-100 text-teal-700"
                    : "bg-emerald-100 text-emerald-800";

          const commitPercentStep = (stepIdx: number) => {
            const clampedIdx = Math.min(maxStepIdx, Math.max(0, stepIdx));
            const pct = PERCENTAGE_STEPS[clampedIdx] ?? 0;
            setLocalPercent(pct);
            onPercentChange?.(pct);
            const mappedNumeric = Math.round(min + (pct / 100) * span);
            update({ response_numeric: Math.min(max, Math.max(min, mappedNumeric)) });
          };

          const handleDecrease = () => {
            commitPercentStep(hasValue ? activeStepIdx - 1 : 0);
          };

          const handleIncrease = () => {
            commitPercentStep(hasValue ? activeStepIdx + 1 : 1);
          };

          return (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition-colors duration-150",
                    badgeToneClass
                  )}
                >
                  {hasValue ? `${activePercent}%` : "Slide the bar or use − / + to select"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={hasValue && activeStepIdx <= 0}
                  aria-label="Decrease percentage"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="relative flex h-9 flex-1 items-center">
                  <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-150"
                      style={{
                        width: hasValue ? `${thumbPercent}%` : "0%",
                        minWidth: hasValue ? "14px" : "0px",
                      }}
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-all duration-150",
                      hasValue
                        ? "border-primary bg-card ring-2 ring-primary/20"
                        : "border-muted-foreground/40 bg-card"
                    )}
                    style={{ left: `${thumbPercent}%` }}
                  />

                  <input
                    id={fieldId}
                    type="range"
                    min={0}
                    max={maxStepIdx}
                    step={1}
                    value={activeStepIdx}
                    aria-labelledby={`${fieldId}-label`}
                    aria-valuetext={hasValue ? `${activePercent}%` : "Not selected"}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => commitPercentStep(Number(e.target.value))}
                    onPointerUp={(e) => {
                      if (!hasValue) {
                        commitPercentStep(Number(e.currentTarget.value));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        !hasValue &&
                        (e.key === "ArrowLeft" ||
                          e.key === "ArrowRight" ||
                          e.key === "ArrowUp" ||
                          e.key === "ArrowDown" ||
                          e.key === "Enter" ||
                          e.key === " ")
                      ) {
                        commitPercentStep(Number(e.currentTarget.value));
                      }
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={hasValue && activeStepIdx >= maxStepIdx}
                  aria-label="Increase percentage"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 px-12 text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-right">100%</span>
              </div>
            </div>
          );
        }

        const clampedValue = hasValue
          ? Math.min(max, Math.max(min, current.response_numeric!))
          : min;
        const thumbPercent = hasValue ? ((clampedValue - min) / span) * 100 : 0;

        const getLabelFor = (val: number): string | undefined => {
          const raw = activeOptions.find((o) => o.option_value === String(val))?.option_label;
          return raw ? formatRatingOptionLabel(raw) : undefined;
        };

        const selectedLabel = hasValue ? getLabelFor(clampedValue) : undefined;
        const minLabel = getLabelFor(min) ?? "Lowest";
        const maxLabel = getLabelFor(max) ?? "Highest";

        const ratio = (clampedValue - min) / span;
        const badgeToneClass = !hasValue
          ? "bg-muted text-muted-foreground"
          : ratio <= 0.15
            ? "bg-red-100 text-red-700"
            : ratio <= 0.35
              ? "bg-orange-100 text-orange-700"
              : ratio <= 0.6
                ? "bg-amber-100 text-amber-800"
                : ratio <= 0.85
                  ? "bg-teal-100 text-teal-700"
                  : "bg-emerald-100 text-emerald-800";

        const handleDecrease = () => {
          const next = hasValue ? Math.max(min, clampedValue - 1) : min;
          update({ response_numeric: next });
        };

        const handleIncrease = () => {
          const next = hasValue ? Math.min(max, clampedValue + 1) : min;
          update({ response_numeric: next });
        };

        return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
                  badgeToneClass
                )}
              >
                {hasValue
                  ? (selectedLabel ?? "Selected")
                  : "Slide the bar or use − / + to select"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDecrease}
                disabled={hasValue && clampedValue <= min}
                aria-label="Decrease rating"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="relative flex h-9 flex-1 items-center">
                {/* Visual bar track */}
                <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{
                      width: hasValue ? `${thumbPercent}%` : "0%",
                      minWidth: hasValue ? "14px" : "0px",
                    }}
                  />
                </div>

                {/* Visual draggable knob */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-all duration-150",
                    hasValue
                      ? "border-primary bg-card ring-2 ring-primary/20"
                      : "border-muted-foreground/40 bg-card"
                  )}
                  style={{ left: `${thumbPercent}%` }}
                />

                {/* Interactive native range input overlay */}
                <input
                  id={fieldId}
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={clampedValue}
                  aria-labelledby={`${fieldId}-label`}
                  aria-valuetext={selectedLabel ?? "Not selected"}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => update({ response_numeric: Number(e.target.value) })}
                  onPointerUp={(e) => {
                    if (!hasValue) {
                      update({ response_numeric: Number(e.currentTarget.value) });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      !hasValue &&
                      (e.key === "ArrowLeft" ||
                        e.key === "ArrowRight" ||
                        e.key === "ArrowUp" ||
                        e.key === "ArrowDown" ||
                        e.key === "Enter" ||
                        e.key === " ")
                    ) {
                      update({ response_numeric: Number(e.currentTarget.value) });
                    }
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleIncrease}
                disabled={hasValue && clampedValue >= max}
                aria-label="Increase rating"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 px-12 text-xs text-muted-foreground">
              <span>{minLabel}</span>
              <span className="text-right">{maxLabel}</span>
            </div>
          </div>
        );
      }

      case "numeric":
        return (
          <Input
            id={fieldId}
            type="number"
            min={typeof question.validation_config?.min === "number" ? question.validation_config.min : undefined}
            max={typeof question.validation_config?.max === "number" ? question.validation_config.max : undefined}
            value={current.response_numeric ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              update({ response_numeric: raw === "" ? null : Number(raw) });
            }}
            placeholder="Enter a number..."
            aria-invalid={Boolean(error)}
          />
        );

      case "date":
        return (
          <Input
            id={fieldId}
            type="date"
            value={current.response_date ?? ""}
            onChange={(e) => update({ response_date: e.target.value })}
            aria-invalid={Boolean(error)}
          />
        );

      default: {
        const rawType = String(question.question_type ?? "").toLowerCase();
        const inputType = rawType.includes("email")
          ? "email"
          : rawType.includes("phone") || rawType === "tel"
            ? "tel"
            : "text";
        return (
          <Input
            id={fieldId}
            type={inputType}
            value={current.response_text ?? ""}
            onChange={(e) => update({ response_text: e.target.value })}
            placeholder="Enter your answer..."
            aria-invalid={Boolean(error)}
          />
        );
      }
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Label id={`${fieldId}-label`} htmlFor={fieldId} className="text-base font-medium leading-snug">
            {indexLabel && <span className="mr-1.5 text-muted-foreground">{indexLabel}</span>}
            {question.question_text}
            {required && <span className="ml-1 text-destructive" aria-label="required">*</span>}
          </Label>
          {!question.is_scorable && (
            <Badge variant="secondary" className="text-[11px]">
              Reflective
            </Badge>
          )}
        </div>
        {question.description && (
          <p className="text-sm text-muted-foreground">{question.description}</p>
        )}
      </div>

      {renderInput()}

      {question.allow_explanation && (
        <div className="space-y-1.5 pt-2">
          <Label htmlFor={`${fieldId}-explanation`} className="text-xs text-muted-foreground">
            {question.explanation_prompt || "Additional context (optional)"}
          </Label>
          <Textarea
            id={`${fieldId}-explanation`}
            rows={2}
            value={current.explanation_text ?? ""}
            onChange={(e) => update({ explanation_text: e.target.value })}
            placeholder="Add optional context..."
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
