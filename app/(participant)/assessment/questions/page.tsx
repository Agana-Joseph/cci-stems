"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, Skeleton } from "@/components/ui/tabs-and-progress";
import { EmptyState, ErrorAlert } from "@/components/feedback/states";
import { SixPillarsIntro } from "@/features/assessments/components/six-pillars-intro";
import {
  isQuestionAnswered,
  QuestionField,
} from "@/features/assessments/components/question-field";
import { QuestionCardDeck } from "@/features/question-cards/components/question-card-deck";
import {
  useEvents,
  usePillars,
  useQuestionCards,
  useQuestionnaire,
  useQuestionnaires,
} from "@/hooks/use-queries";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";
import { buildProfilePrefillMap } from "@/features/assessments/utils/profile-autofill";
import { formatSectionTitle } from "@/lib/utils/format";
import type { QuestionnaireQuestionItem, QuestionnaireSectionRead } from "@/types/api";

interface SectionGroup {
  id: string;
  title: string;
  description?: string | null;
  items: QuestionnaireQuestionItem[];
}

export default function AssessmentQuestionsPage() {
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
    responses,
    setResponse,
    prefillResponses,
    ratingPercentages,
    setRatingPercentage,
    introSeen,
    setIntroSeen,
    currentSectionIndex: sectionIndex,
    setCurrentSectionIndex: setSectionIndex,
    inCardsPhase,
    setInCardsPhase,
    targetSectionIndex,
    setTargetSectionIndex,
  } = useAssessmentContext();

  const eventsQuery = useEvents({ limit: 20 });
  const effectiveEventId = eventId ?? eventsQuery.data?.[0]?.id ?? null;

  React.useEffect(() => {
    if (!eventId && effectiveEventId) setEventId(effectiveEventId);
  }, [eventId, effectiveEventId, setEventId]);

  const pillarsQuery = usePillars();
  const questionnairesQuery = useQuestionnaires({
    event_id: effectiveEventId ?? undefined,
    status: "published",
    questionnaire_type: "post_event",
  });

  // Fallback to any published questionnaire if event-specific query returns empty
  const fallbackQuestionnairesQuery = useQuestionnaires({
    status: "published",
  });

  const activeQuestionnaireSummary = React.useMemo(() => {
    const primary = questionnairesQuery.data ?? [];
    if (primary.length > 0) return primary[0]!;
    const fallback = (fallbackQuestionnairesQuery.data ?? []).filter(
      (q) => q.questionnaire_type === "post_event" || q.questionnaire_type === "custom"
    );
    return fallback[0] ?? fallbackQuestionnairesQuery.data?.[0] ?? null;
  }, [questionnairesQuery.data, fallbackQuestionnairesQuery.data]);

  const resolvedQuestionnaireId = questionnaireId ?? activeQuestionnaireSummary?.id ?? null;

  React.useEffect(() => {
    if (resolvedQuestionnaireId && questionnaireId !== resolvedQuestionnaireId) {
      setQuestionnaireId(resolvedQuestionnaireId);
    }
  }, [resolvedQuestionnaireId, questionnaireId, setQuestionnaireId]);

  const detailQuery = useQuestionnaire(resolvedQuestionnaireId);
  const cardsQuery = useQuestionCards(false);

  const sectionGroups = React.useMemo<SectionGroup[]>(() => {
    const detail = detailQuery.data;
    if (!detail) return [];

    const sortedSections: QuestionnaireSectionRead[] = (detail.sections ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);

    const sortedQuestions = (detail.questions ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);

    if (sortedSections.length === 0) {
      return sortedQuestions.length > 0
        ? [
            {
              id: "general",
              title: detail.title,
              description: detail.description,
              items: sortedQuestions,
            },
          ]
        : [];
    }

    const groups: SectionGroup[] = sortedSections
      .map((sec) => ({
        id: sec.id,
        title: formatSectionTitle(sec.title),
        description: sec.description,
        items: sortedQuestions.filter((item) => item.section_id === sec.id),
      }))
      .filter((g) => g.items.length > 0);

    const unassigned = sortedQuestions.filter(
      (item) => !item.section_id || !sortedSections.some((s) => s.id === item.section_id)
    );
    if (unassigned.length > 0) {
      groups.push({
        id: "additional",
        title: "Additional Questions",
        description: null,
        items: unassigned,
      });
    }

    return groups;
  }, [detailQuery.data]);

  // Separate reflective cards not already included inside the questionnaire sections
  const standaloneCards = React.useMemo(() => {
    const existingIds = new Set(
      (detailQuery.data?.questions ?? []).map((item) => item.question.id)
    );
    return (cardsQuery.data ?? [])
      .filter((c) => c.is_active)
      .map((card) => ({
        ...card,
        questions: (card.questions ?? []).filter((q) => !q.is_archived && !existingIds.has(q.id)),
      }))
      .filter((c) => (c.questions?.length ?? 0) > 0);
  }, [cardsQuery.data, detailQuery.data]);

  const profilePrefills = React.useMemo(
    () => buildProfilePrefillMap(sectionGroups, profile, { phone, email }),
    [sectionGroups, profile, phone, email]
  );

  React.useEffect(() => {
    if (isHydrated && Object.keys(profilePrefills).length > 0) {
      prefillResponses(profilePrefills);
    }
  }, [isHydrated, profilePrefills, prefillResponses]);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (targetSectionIndex !== null) {
      setIntroSeen(true);
      if (targetSectionIndex === -1) {
        setInCardsPhase(true);
      } else {
        setInCardsPhase(false);
        setSectionIndex(Math.min(targetSectionIndex, Math.max(0, sectionGroups.length - 1)));
      }
      setTargetSectionIndex(null);
    }
  }, [
    targetSectionIndex,
    sectionGroups.length,
    setIntroSeen,
    setInCardsPhase,
    setSectionIndex,
    setTargetSectionIndex,
  ]);

  const totalQuestions = React.useMemo(
    () => sectionGroups.reduce((sum, g) => sum + g.items.length, 0),
    [sectionGroups]
  );

  const answeredCount = React.useMemo(
    () =>
      sectionGroups.reduce(
        (sum, g) =>
          sum +
          g.items.filter((item) => isQuestionAnswered(item.question, responses[item.question.id]))
            .length,
        0
      ),
    [sectionGroups, responses]
  );

  // Screen 4: Six Measurement Pillars Introduction
  if (!introSeen) {
    return (
      <SixPillarsIntro
        pillars={pillarsQuery.data}
        onBack={() => router.push("/assessment/profile")}
        onContinue={() => setIntroSeen(true)}
      />
    );
  }

  if (questionnairesQuery.isLoading || detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (detailQuery.isError || questionnairesQuery.isError) {
    return (
      <ErrorAlert
        error={detailQuery.error || questionnairesQuery.error}
        title="Unable to load assessment questionnaire"
        onRetry={() => {
          questionnairesQuery.refetch();
          detailQuery.refetch();
        }}
      />
    );
  }

  if (sectionGroups.length === 0) {
    return (
      <EmptyState
        title="No published questionnaire available"
        description="This event does not currently have a published post-event questionnaire configured on the backend."
        action={
          <Button variant="outline" onClick={() => router.push("/assessment")}>
            Return to Welcome Page
          </Button>
        }
      />
    );
  }

  // Screen 6: Reflective Question Cards
  if (inCardsPhase) {
    return (
      <QuestionCardDeck
        cards={standaloneCards}
        responses={responses}
        ratingPercentages={ratingPercentages}
        onResponseChange={setResponse}
        onPercentChange={setRatingPercentage}
        onBack={() => {
          setInCardsPhase(false);
          setSectionIndex(sectionGroups.length - 1);
        }}
        onComplete={() => router.push("/assessment/review")}
      />
    );
  }

  const currentSection = sectionGroups[Math.min(sectionIndex, sectionGroups.length - 1)]!;
  const currentSectionPrefillCount = currentSection.items.filter((item) =>
    Boolean(profilePrefills[item.question.id])
  ).length;
  const startingQuestionNumber =
    sectionGroups.slice(0, sectionIndex).reduce((acc, g) => acc + g.items.length, 0) + 1;

  const validateCurrentSection = () => {
    const errors: Record<string, string> = {};
    currentSection.items.forEach((item) => {
      const req = item.is_required_override ?? item.question.is_required;
      if (req && !isQuestionAnswered(item.question, responses[item.question.id])) {
        errors[item.question.id] = "This question is required before continuing.";
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;

    if (sectionIndex < sectionGroups.length - 1) {
      setSectionIndex((idx) => idx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (standaloneCards.length > 0) {
      setInCardsPhase(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/assessment/review");
    }
  };

  const handlePrevious = () => {
    setFieldErrors({});
    if (sectionIndex === 0) {
      setIntroSeen(false);
    } else {
      setSectionIndex((idx) => idx - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
          <span className="text-primary">
            Section {sectionIndex + 1} of {sectionGroups.length}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {answeredCount} of {totalQuestions} questions answered
          </span>
        </div>
        <ProgressBar
          value={sectionIndex + 1}
          max={sectionGroups.length + (standaloneCards.length > 0 ? 1 : 0)}
          label="Assessment section progress"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {sectionGroups.map((sec, idx) => (
            <Badge
              key={sec.id}
              variant={idx === sectionIndex ? "default" : idx < sectionIndex ? "success" : "secondary"}
              className="text-[11px]"
            >
              {sec.title}
            </Badge>
          ))}
          {standaloneCards.length > 0 && (
            <Badge variant="outline" className="text-[11px]">
              Reflective Cards
            </Badge>
          )}
        </div>
      </div>

      {/* Section Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{currentSection.title}</h1>
      </div>

      {currentSectionPrefillCount > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-sm text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Details from your profile have been pre-filled below. You can review or edit any answer
            and complete the remaining questions.
          </span>
        </div>
      )}

      {/* Dynamic Questions */}
      <div className="space-y-4">
        {currentSection.items.map((item, idx) => {
          const isReq = item.is_required_override ?? item.question.is_required;
          return (
            <QuestionField
              key={item.question.id}
              question={item.question}
              required={isReq}
              indexLabel={`Q${startingQuestionNumber + idx}.`}
              value={responses[item.question.id]}
              percentValue={ratingPercentages[item.question.id]}
              error={fieldErrors[item.question.id]}
              onPercentChange={(pct) => setRatingPercentage(item.question.id, pct)}
              onChange={(next) => {
                setResponse(item.question.id, next);
                if (fieldErrors[item.question.id]) {
                  setFieldErrors((prev) => {
                    const copy = { ...prev };
                    delete copy[item.question.id];
                    return copy;
                  });
                }
              }}
            />
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          {sectionIndex < sectionGroups.length - 1
            ? "Continue"
            : standaloneCards.length > 0
              ? "Continue to Question Cards"
              : "Review & Submit"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
