"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Edit3, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/feedback/states";
import {
  formatResponsePreview,
  isQuestionAnswered,
} from "@/features/assessments/components/question-field";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";
import { extractProfileFromResponses } from "@/features/assessments/utils/profile-autofill";
import { useEvents, useQuestionCards, useQuestionnaire, useQuestionnaires } from "@/hooks/use-queries";
import { assessmentsApi, getReadableErrorMessage } from "@/lib/api";
import { formatSectionTitle } from "@/lib/utils/format";
import type { ProfileUpdatesInput } from "@/types/api";

export default function AssessmentReviewPage() {
  const router = useRouter();
  const {
    isHydrated,
    eventId,
    setEventId,
    questionnaireId,
    setQuestionnaireId,
    phone,
    email,
    profile,
    startedAt,
    responses,
    ratingPercentages,
    consentChecked,
    setConsentChecked,
    setTargetSectionIndex,
    submission,
    setSubmission,
  } = useAssessmentContext();

  const eventsQuery = useEvents({ limit: 20 });
  const effectiveEventId = eventId ?? eventsQuery.data?.[0]?.id ?? null;

  React.useEffect(() => {
    if (isHydrated && !eventId && effectiveEventId) {
      setEventId(effectiveEventId);
    }
  }, [isHydrated, eventId, effectiveEventId, setEventId]);

  const questionnairesQuery = useQuestionnaires({
    event_id: effectiveEventId ?? undefined,
    status: "published",
    questionnaire_type: "post_event",
  });
  const fallbackQuestionnairesQuery = useQuestionnaires({ status: "published" });

  const resolvedQuestionnaireId = React.useMemo(() => {
    if (questionnaireId) return questionnaireId;
    const primary = questionnairesQuery.data ?? [];
    if (primary.length > 0) return primary[0]!.id;
    const fallback = (fallbackQuestionnairesQuery.data ?? []).filter(
      (q) => q.questionnaire_type === "post_event" || q.questionnaire_type === "custom"
    );
    return fallback[0]?.id ?? fallbackQuestionnairesQuery.data?.[0]?.id ?? null;
  }, [questionnaireId, questionnairesQuery.data, fallbackQuestionnairesQuery.data]);

  React.useEffect(() => {
    if (isHydrated && resolvedQuestionnaireId && questionnaireId !== resolvedQuestionnaireId) {
      setQuestionnaireId(resolvedQuestionnaireId);
    }
  }, [isHydrated, resolvedQuestionnaireId, questionnaireId, setQuestionnaireId]);

  const questionnaireQuery = useQuestionnaire(resolvedQuestionnaireId);
  const cardsQuery = useQuestionCards(false);

  const sections = React.useMemo(() => {
    const detail = questionnaireQuery.data;
    if (!detail) return [];
    const sortedSections = (detail.sections ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    const sortedQuestions = (detail.questions ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);

    if (sortedSections.length === 0) {
      return [{ id: "general", title: detail.title, items: sortedQuestions }];
    }
    return sortedSections
      .map((sec) => ({
        id: sec.id,
        title: formatSectionTitle(sec.title),
        items: sortedQuestions.filter((q) => q.section_id === sec.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [questionnaireQuery.data]);

  const resolvedProfile = React.useMemo(
    () => extractProfileFromResponses(sections, responses, profile, { phone, email }),
    [sections, responses, profile, phone, email]
  );

  const cardQuestions = React.useMemo(() => {
    const existingIds = new Set((questionnaireQuery.data?.questions ?? []).map((q) => q.question.id));
    return (cardsQuery.data ?? [])
      .filter((c) => c.is_active)
      .flatMap((c) => (c.questions ?? []).filter((q) => !q.is_archived && !existingIds.has(q.id)));
  }, [cardsQuery.data, questionnaireQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveEventId || !resolvedQuestionnaireId) {
        throw new Error("Missing event or questionnaire context. Please start from the welcome page.");
      }
      const contactPhone = resolvedProfile.phone.trim() || undefined;
      const contactEmail = resolvedProfile.email.trim() || undefined;
      if (!contactPhone && !contactEmail) {
        throw new Error("Please enter your registered phone number or email address before submitting.");
      }

      const allQuestions = [
        ...(questionnaireQuery.data?.questions ?? []).map((i) => i.question),
        ...cardQuestions,
      ];

      const validResponses = allQuestions
        .map((q) => ({ q, val: responses[q.id] }))
        .filter(({ q, val }) => isQuestionAnswered(q, val))
        .map(({ val }) => val!);

      const profileUpdates: ProfileUpdatesInput = { consent_given: consentChecked };
      if (resolvedProfile.full_name.trim()) {
        profileUpdates.full_name = resolvedProfile.full_name.trim();
      }
      if (resolvedProfile.current_role.trim()) {
        profileUpdates.current_role = resolvedProfile.current_role.trim();
      }
      if (resolvedProfile.industry.trim()) {
        profileUpdates.industry = resolvedProfile.industry.trim();
      }
      if (resolvedProfile.organisation.trim()) {
        profileUpdates.organisation = resolvedProfile.organisation.trim();
      }
      if (resolvedProfile.years_of_experience !== null) {
        profileUpdates.years_of_experience = resolvedProfile.years_of_experience;
      }
      if (resolvedProfile.reason_for_attending.trim()) {
        profileUpdates.reason_for_attending = resolvedProfile.reason_for_attending.trim();
      }

      return assessmentsApi.submit({
        phone: contactPhone,
        email: contactEmail,
        event_id: effectiveEventId,
        questionnaire_id: resolvedQuestionnaireId,
        submission_channel: "web_portal",
        started_at: startedAt,
        profile_updates: profileUpdates,
        responses: validResponses,
      });
    },
    onSuccess: (res) => {
      setSubmission(res.data);
      toast.success("Assessment submitted successfully.");
      router.push("/assessment/success");
    },
    onError: (err) => {
      toast.error(getReadableErrorMessage(err));
    },
  });

  const alreadySubmitted = Boolean(submission);
  const hasAnySessionData =
    Boolean(resolvedProfile.full_name) ||
    Boolean(resolvedProfile.email) ||
    Boolean(resolvedProfile.phone) ||
    Object.keys(responses).length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 4 of 4 &middot; Review &amp; Submit
        </p>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Review Your Assessment
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm your details and responses below before submitting. You can edit any section.
        </p>
      </div>

      {isHydrated && !hasAnySessionData && !alreadySubmitted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active assessment responses were found in this browser tab.{" "}
          <button
            type="button"
            onClick={() => router.push("/assessment")}
            className="font-semibold underline"
          >
            Start or resume from the assessment welcome page
          </button>
          .
        </div>
      )}

      {/* Profile Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Participant Details</CardTitle>
            <CardDescription>Information associated with this submission</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/assessment/profile")}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Full Name</dt>
              <dd className="font-medium">{resolvedProfile.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Registered Contact</dt>
              <dd className="font-medium">
                {[resolvedProfile.phone, resolvedProfile.email].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role &amp; Industry</dt>
              <dd className="font-medium">
                {[resolvedProfile.current_role, resolvedProfile.industry]
                  .filter(Boolean)
                  .join(" — ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Organisation</dt>
              <dd className="font-medium">{resolvedProfile.organisation || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Sections Summary */}
      {sections.map((section, idx) => (
        <Card key={section.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTargetSectionIndex(idx);
                router.push("/assessment/questions");
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {section.items.map((item) => {
              const val = responses[item.question.id];
              return (
                <div key={item.question.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.question.question_text}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatResponsePreview(
                      item.question,
                      val,
                      ratingPercentages[item.question.id]
                    )}
                  </p>
                  {val?.explanation_text && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Note: {val.explanation_text}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Reflective Cards Summary */}
      {cardQuestions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Reflective Question Cards</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTargetSectionIndex(-1);
                router.push("/assessment/questions");
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {cardQuestions.map((q) => (
              <div key={q.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-xs font-medium text-muted-foreground">{q.question_text}</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatResponsePreview(q, responses[q.id])}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Consent & Submission */}
      <Card className="border-primary/25 bg-primary/[0.02]">
        <CardContent className="space-y-4 p-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-primary"
            />
            <span className="leading-relaxed text-foreground">
              I confirm that the responses provided reflect my experience at CCI STEM Connect and
              consent to their use in measuring event impact and improving future programmes.
            </span>
          </label>

          {submitMutation.isError && (
            <ErrorAlert
              error={submitMutation.error}
              title="Submission could not be completed"
            />
          )}

          {alreadySubmitted && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Your assessment has already been submitted in this session.</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/assessment/questions")}
              disabled={submitMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Questions
            </Button>
            <Button
              size="lg"
              disabled={!consentChecked || submitMutation.isPending || alreadySubmitted}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Assessment...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Assessment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
