"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { ErrorAlert } from "@/components/feedback/states";
import { eventsApi, followupsApi, getReadableErrorMessage } from "@/lib/api";
import { useEvents, useFollowUpStages, useQuestionnaires } from "@/hooks/use-queries";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const healthQuery = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => eventsApi.health(),
  });

  const stagesQuery = useFollowUpStages(activeEventId || undefined);
  const questionnairesQuery = useQuestionnaires({ questionnaire_type: "follow_up" });

  // Create new follow-up stage form (supported by POST /api/v1/follow-ups/stages)
  const [stageCode, setStageCode] = React.useState("");
  const [stageName, setStageName] = React.useState("");
  const [daysAfter, setDaysAfter] = React.useState(30);
  const [stageQuestionnaireId, setStageQuestionnaireId] = React.useState("");

  const createStageMutation = useMutation({
    mutationFn: () =>
      followupsApi.createStage({
        event_id: activeEventId || null,
        stage_code: stageCode.trim(),
        stage_name: stageName.trim(),
        days_after_event: Number(daysAfter),
        questionnaire_id: stageQuestionnaireId || null,
        display_order: (stagesQuery.data?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups", "stages"] });
      toast.success("Follow-up stage saved.");
      setStageCode("");
      setStageName("");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configuration interfaces strictly aligned with supported backend v1.0 endpoints.
        </p>
      </div>

      {/* Backend Health & Environment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Backend API Connectivity
            </CardTitle>
            <CardDescription>Live status from GET /health</CardDescription>
          </div>
          <Badge variant={healthQuery.data?.status === "healthy" ? "success" : "warning"}>
            {healthQuery.isLoading
              ? "Checking..."
              : healthQuery.data?.status ?? "Unavailable"}
          </Badge>
        </CardHeader>
        <CardContent>
          {healthQuery.isError ? (
            <ErrorAlert error={healthQuery.error} onRetry={() => healthQuery.refetch()} />
          ) : healthQuery.data ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Service</dt>
                <dd className="font-medium">{healthQuery.data.service}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Version</dt>
                <dd className="font-mono font-medium">{healthQuery.data.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Environment</dt>
                <dd className="font-medium capitalize">{healthQuery.data.environment}</dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>

      {/* Supported Configuration Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Information</CardTitle>
            <CardDescription>
              Edit event titles, dates, venues, and lifecycle statuses via Events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/events">
                Configure Events <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questionnaire Settings</CardTitle>
            <CardDescription>
              Manage draft and published questionnaires, sections, and required flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/questionnaires">
                Configure Questionnaires <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Frameworks</CardTitle>
            <CardDescription>
              Manage pillar weights and versioned calculation frameworks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/scoring">
                Configure Scoring <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Follow-Up Stages Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-Up Stages</CardTitle>
          <CardDescription>
            View and add event-scoped or global follow-up checkpoints via{" "}
            <code className="font-mono text-xs">/api/v1/follow-ups/stages</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {(stagesQuery.data ?? []).map((st) => (
              <div key={st.id} className="rounded-lg border border-border bg-muted/20 p-3.5 text-sm">
                <p className="font-semibold">{st.stage_name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {st.stage_code} &middot; Day {st.days_after_event}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Event</Label>
              <NativeSelect
                value={activeEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Global</option>
                {(eventsQuery.data ?? []).map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stage Code</Label>
              <Input
                value={stageCode}
                onChange={(e) => setStageCode(e.target.value)}
                placeholder="180_day"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stage Name</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="180-Day Follow-Up"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Days After Event</Label>
              <Input
                type="number"
                min={1}
                value={daysAfter}
                onChange={(e) => setDaysAfter(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linked Questionnaire</Label>
              <NativeSelect
                value={stageQuestionnaireId}
                onChange={(e) => setStageQuestionnaireId(e.target.value)}
              >
                <option value="">None</option>
                {(questionnairesQuery.data ?? []).map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <Button
                size="sm"
                disabled={!stageCode.trim() || !stageName.trim() || createStageMutation.isPending}
                onClick={() => createStageMutation.mutate()}
              >
                <Plus className="h-3.5 w-3.5" />
                {createStageMutation.isPending ? "Saving..." : "Add Follow-Up Stage"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsupported Settings Notice (Per Spec Section 6 Module 13) */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">
            Controls Intentionally Omitted Until Backend Support
          </p>
          <p className="mt-1 leading-relaxed">
            Notification delivery preferences and automated data retention policies are not yet
            exposed by API v1.0. Per specification, controls for unsupported settings are omitted
            until their corresponding backend endpoints are available.
          </p>
        </div>
      </div>
    </div>
  );
}
