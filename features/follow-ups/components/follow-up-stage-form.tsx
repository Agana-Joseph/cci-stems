"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileCheck2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { ErrorAlert } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/tabs-and-progress";
import { QuestionField } from "@/features/assessments/components/question-field";
import { useEvents, useFollowUpStages, useQuestionnaire } from "@/hooks/use-queries";
import { followupsApi, getReadableErrorMessage } from "@/lib/api";
import type {
  ActionCategory,
  ActionStatus,
  AssessmentResponseInput,
  OutcomeType,
} from "@/types/api";

interface StageMetaConfig {
  stageCode: "30_day" | "60_day" | "90_day";
  title: string;
  subtitle: string;
  focusAreas: string[];
}

interface ActionDraft {
  category: ActionCategory;
  description: string;
  action_status: ActionStatus;
}

interface EvidenceDraft {
  evidence_type: string;
  description: string;
  reference_url: string;
}

export function FollowUpStageForm({ config }: { config: StageMetaConfig }) {
  const searchParams = useSearchParams();
  const initialFollowUpId = searchParams.get("follow_up_id") ?? "";

  const eventsQuery = useEvents({ limit: 20 });
  const activeEvent = eventsQuery.data?.[0] ?? null;
  const stagesQuery = useFollowUpStages(activeEvent?.id);

  const stageRecord = React.useMemo(
    () => (stagesQuery.data ?? []).find((s) => s.stage_code === config.stageCode) ?? null,
    [stagesQuery.data, config.stageCode]
  );

  const questionnaireQuery = useQuestionnaire(stageRecord?.questionnaire_id);

  const [followUpId, setFollowUpId] = React.useState(initialFollowUpId);
  const [responses, setResponses] = React.useState<Record<string, AssessmentResponseInput>>({});
  const [actions, setActions] = React.useState<ActionDraft[]>([
    { category: "idea_implementation", description: "", action_status: "in_progress" },
  ]);
  const [outcomeType, setOutcomeType] = React.useState<OutcomeType>("productivity_gain");
  const [outcomeDescription, setOutcomeDescription] = React.useState("");
  const [evidenceItems, setEvidenceItems] = React.useState<EvidenceDraft[]>([]);
  const [submitted, setSubmitted] = React.useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!followUpId.trim()) {
        throw new Error(
          "A scheduled Follow-Up Record ID is required to submit this stage. Open this page from your invitation link (?follow_up_id=...) or paste the ID provided by organisers."
        );
      }

      const serializedResponses: Record<string, unknown> = {};
      Object.entries(responses).forEach(([qId, val]) => {
        if (val.response_text !== undefined && val.response_text !== null && val.response_text !== "") {
          serializedResponses[qId] = val.response_text;
        } else if (val.response_numeric !== undefined && val.response_numeric !== null) {
          serializedResponses[qId] = val.response_numeric;
        } else if (typeof val.response_boolean === "boolean") {
          serializedResponses[qId] = val.response_boolean;
        } else if (val.response_date) {
          serializedResponses[qId] = val.response_date;
        } else if (val.response_json) {
          serializedResponses[qId] = val.response_json;
        }
      });

      const cleanedActions = actions
        .filter((a) => a.description.trim().length > 0)
        .map((a) => ({
          category: a.category,
          description: a.description.trim(),
          action_status: a.action_status,
        }));

      const cleanedEvidence = evidenceItems
        .filter((e) => e.evidence_type.trim() || e.reference_url.trim())
        .map((e) => ({
          evidence_type: e.evidence_type.trim() || "document_link",
          description: e.description.trim() || undefined,
          reference_url: e.reference_url.trim() || undefined,
        }));

      return followupsApi.submit(followUpId.trim(), {
        assessment_date: new Date().toISOString().slice(0, 10),
        responses: serializedResponses,
        reported_actions: cleanedActions,
        outcome_descriptions: outcomeDescription.trim() || undefined,
        outcome_type: outcomeDescription.trim() ? outcomeType : undefined,
        evidence_items: cleanedEvidence,
        evidence_classification: cleanedEvidence.length > 0 ? "documented" : "self_reported",
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(`${config.title} submitted successfully.`);
    },
    onError: (err) => {
      toast.error(getReadableErrorMessage(err));
    },
  });

  if (submitted) {
    return (
      <Card className="mx-auto max-w-2xl border-emerald-200">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">{config.title} Recorded</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for updating your progress. Your reported actions and outcomes have been
            linked to your follow-up record.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href="/follow-up">Return to Follow-Up Hub</Link>
            </Button>
            <Button asChild>
              <Link href="/impact-report">Check Impact Report</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/follow-up">
            <ArrowLeft className="h-4 w-4" />
            All Follow-Up Stages
          </Link>
        </Button>
        <Badge variant="default">{stageRecord?.stage_name ?? config.title}</Badge>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {config.title}
        </h1>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {config.focusAreas.map((area) => (
            <Badge key={area} variant="secondary" className="font-normal">
              {area}
            </Badge>
          ))}
        </div>
      </div>

      {/* Follow-Up Invitation Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Follow-Up Record Reference</CardTitle>
          <CardDescription>
            Automatically populated when opened from your CCI STEM Connect invitation link
            (<code className="font-mono text-xs">?follow_up_id=...</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-id">Follow-Up ID</Label>
            <Input
              id="follow-up-id"
              value={followUpId}
              onChange={(e) => setFollowUpId(e.target.value)}
              placeholder="Paste your scheduled follow-up UUID"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Stage Questionnaire from Backend */}
      {questionnaireQuery.isLoading ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : questionnaireQuery.data && (questionnaireQuery.data.questions?.length ?? 0) > 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">{questionnaireQuery.data.title}</h2>
          {(questionnaireQuery.data.questions ?? [])
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((item, idx) => (
              <QuestionField
                key={item.question.id}
                question={item.question}
                required={item.is_required_override ?? item.question.is_required}
                indexLabel={`Q${idx + 1}.`}
                value={responses[item.question.id]}
                onChange={(next) =>
                  setResponses((prev) => ({ ...prev, [item.question.id]: next }))
                }
              />
            ))}
        </div>
      ) : null}

      {/* Reported Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Reported Actions &amp; Changes</CardTitle>
            <CardDescription>
              Capture specific ideas applied, habits changed, or knowledge shared since the event.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setActions((prev) => [
                ...prev,
                { category: "idea_implementation", description: "", action_status: "in_progress" },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add Action
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2"
            >
              <div className="space-y-1">
                <Label>Category</Label>
                <NativeSelect
                  value={action.category}
                  onChange={(e) => {
                    const next = [...actions];
                    next[idx] = { ...action, category: e.target.value as ActionCategory };
                    setActions(next);
                  }}
                >
                  <option value="idea_implementation">Idea Implementation</option>
                  <option value="habit_change">Professional Habit Change</option>
                  <option value="knowledge_sharing">Knowledge Sharing</option>
                  <option value="workplace_improvement">Workplace Improvement</option>
                  <option value="career_goal">Career Goal Progress</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <NativeSelect
                  value={action.action_status}
                  onChange={(e) => {
                    const next = [...actions];
                    next[idx] = { ...action, action_status: e.target.value as ActionStatus };
                    setActions(next);
                  }}
                >
                  <option value="intended">Intended</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </NativeSelect>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  {actions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActions((prev) => prev.filter((_, i) => i !== idx))}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
                <Textarea
                  rows={2}
                  value={action.description}
                  onChange={(e) => {
                    const next = [...actions];
                    next[idx] = { ...action, description: e.target.value };
                    setActions(next);
                  }}
                  placeholder="Describe what you implemented or changed..."
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Outcomes & Optional Supporting Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcomes &amp; Supporting Evidence</CardTitle>
          <CardDescription>
            Outcomes without attachments are labelled <strong>Self-Reported</strong>; adding a
            reference or link classifies the outcome as <strong>Documented</strong> pending review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="outcome-type">Primary Outcome Type</Label>
            <NativeSelect
              id="outcome-type"
              value={outcomeType}
              onChange={(e) => setOutcomeType(e.target.value as OutcomeType)}
            >
              <option value="productivity_gain">Productivity Gain</option>
              <option value="collaboration">Collaboration</option>
              <option value="mentorship">Mentorship</option>
              <option value="career_advancement">Career Advancement</option>
              <option value="workplace_policy">Workplace Improvement / Policy</option>
              <option value="knowledge_transfer">Knowledge Transfer</option>
              <option value="other">Other Outcome</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-desc">Outcome Summary</Label>
            <Textarea
              id="outcome-desc"
              rows={3}
              value={outcomeDescription}
              onChange={(e) => setOutcomeDescription(e.target.value)}
              placeholder="Share tangible results, collaborations, or workplace improvements..."
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Supporting Evidence (Optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setEvidenceItems((prev) => [
                    ...prev,
                    { evidence_type: "link", description: "", reference_url: "" },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add Evidence
              </Button>
            </div>

            {evidenceItems.map((ev, idx) => (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3"
              >
                <Input
                  placeholder="Type (e.g. article, repo, deck)"
                  value={ev.evidence_type}
                  onChange={(e) => {
                    const next = [...evidenceItems];
                    next[idx] = { ...ev, evidence_type: e.target.value };
                    setEvidenceItems(next);
                  }}
                />
                <Input
                  placeholder="Reference URL (https://...)"
                  value={ev.reference_url}
                  onChange={(e) => {
                    const next = [...evidenceItems];
                    next[idx] = { ...ev, reference_url: e.target.value };
                    setEvidenceItems(next);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Brief description"
                    value={ev.description}
                    onChange={(e) => {
                      const next = [...evidenceItems];
                      next[idx] = { ...ev, description: e.target.value };
                      setEvidenceItems(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove evidence"
                    onClick={() => setEvidenceItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {submitMutation.isError && (
        <ErrorAlert error={submitMutation.error} title="Follow-up submission failed" />
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit {config.title}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
