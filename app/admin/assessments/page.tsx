"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { KpiCard } from "@/components/charts/kpi-card";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { assessmentsApi, eventsApi } from "@/lib/api";
import { queryKeys, useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";
import { formatDateTime, formatPercent } from "@/lib/utils/format";
import type { AssessmentSubmissionRead } from "@/types/api";

export default function AdminAssessmentsPage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const [selectedParticipantId, setSelectedParticipantId] = React.useState("");
  const [lookupAssessmentId, setLookupAssessmentId] = React.useState("");
  const [inspectedSubmission, setInspectedSubmission] =
    React.useState<AssessmentSubmissionRead | null>(null);

  const { overview, pillars } = useEventAnalyticsBundle(activeEventId || null);

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 200, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 200, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const participantAssessmentsQuery = useQuery({
    queryKey: ["participants", selectedParticipantId, "assessments", activeEventId],
    queryFn: async () =>
      (
        await assessmentsApi.listByParticipant(selectedParticipantId, {
          event_id: activeEventId || undefined,
        })
      ).data,
    enabled: Boolean(selectedParticipantId),
  });

  const lookupByIdMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.get(id.trim()),
    onSuccess: (res) => setInspectedSubmission(res.data),
  });

  const part = overview.data?.participation;
  const totalRegistered = part?.total_registered ?? part?.registered_count ?? 0;
  const completed = part?.completed_assessments ?? part?.assessment_submissions_count ?? 0;
  const incomplete = Math.max(0, totalRegistered - completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            Monitor submission completion rates, pillar response coverage, and inspect individual
            submissions.
          </p>
        </div>
        <AdminEventSelector
          events={eventsQuery.data ?? []}
          value={activeEventId}
          onChange={setSelectedEventId}
        />
      </div>

      {overview.isLoading ? (
        <CardGridSkeleton count={4} />
      ) : overview.isError ? (
        <ErrorAlert error={overview.error} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Submissions" value={completed} icon={ClipboardCheck} />
          <KpiCard label="Completed Assessments" value={completed} />
          <KpiCard label="Pending / Incomplete" value={incomplete} subtitle="Registered without submission" />
          <KpiCard
            label="Completion Rate"
            value={formatPercent(part?.assessment_completion_rate)}
            coverageLevel={part?.data_coverage?.coverage_level}
            sampleSize={completed}
          />
        </div>
      )}

      {/* Responses by Pillar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Responses by Measurement Pillar</CardTitle>
          <CardDescription>
            Number of valid responses and missing entries per pillar across the selected event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pillars.data?.pillars || pillars.data.pillars.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pillar response data recorded yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.data.pillars.map((p) => (
                <div key={p.pillar_id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">{p.pillar_name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Responses: {p.response_count}</span>
                    <span>Missing: {p.missing_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Individual Submissions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspect by Participant</CardTitle>
            <CardDescription>
              Select an event participant to review their submitted responses via{" "}
              <code className="font-mono text-xs">/participants/&#123;id&#125;/assessments</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inspect-participant">Participant</Label>
              <NativeSelect
                id="inspect-participant"
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
              >
                <option value="">Select a participant...</option>
                {(participantsQuery.data ?? []).map((p) => (
                  <option key={p.participant_id} value={p.participant_id}>
                    {p.full_name} ({p.industry || "General"})
                  </option>
                ))}
              </NativeSelect>
            </div>

            {participantAssessmentsQuery.isError && (
              <ErrorAlert error={participantAssessmentsQuery.error} />
            )}

            {selectedParticipantId &&
              !participantAssessmentsQuery.isLoading &&
              (participantAssessmentsQuery.data?.length ?? 0) === 0 && (
                <EmptyState
                  title="No submissions for this participant"
                  description="This participant has not submitted an assessment for the selected event."
                />
              )}

            {(participantAssessmentsQuery.data ?? []).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-mono text-xs font-medium">{sub.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(sub.submitted_at)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setInspectedSubmission(sub)}>
                  Inspect
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lookup by Assessment ID</CardTitle>
            <CardDescription>
              Fetch a specific submission record directly via{" "}
              <code className="font-mono text-xs">GET /api/v1/assessments/&#123;id&#125;</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={lookupAssessmentId}
                onChange={(e) => setLookupAssessmentId(e.target.value)}
                placeholder="Paste assessment UUID..."
              />
              <Button
                disabled={!lookupAssessmentId.trim() || lookupByIdMutation.isPending}
                onClick={() => lookupByIdMutation.mutate(lookupAssessmentId)}
              >
                <Search className="h-4 w-4" />
                Lookup
              </Button>
            </div>
            {lookupByIdMutation.isError && <ErrorAlert error={lookupByIdMutation.error} />}
          </CardContent>
        </Card>
      </div>

      {/* Inspected Submission Detail */}
      {inspectedSubmission && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                Submission Detail ({inspectedSubmission.id.slice(0, 8)}...)
              </CardTitle>
              <CardDescription>
                Submitted {formatDateTime(inspectedSubmission.submitted_at)} &middot; Channel:{" "}
                {inspectedSubmission.submission_channel ?? "web_portal"}
              </CardDescription>
            </div>
            <Badge variant="success" className="capitalize">
              {inspectedSubmission.status}
            </Badge>
          </CardHeader>
          <CardContent className="divide-y divide-border text-sm">
            {(inspectedSubmission.responses ?? []).map((resp) => (
              <div key={resp.id} className="py-3">
                <p className="text-xs text-muted-foreground">
                  {resp.question_text || resp.question_code || resp.question_id}
                </p>
                <p className="mt-1 font-medium">
                  {resp.response_text ??
                    (resp.response_numeric !== null && resp.response_numeric !== undefined
                      ? String(resp.response_numeric)
                      : typeof resp.response_boolean === "boolean"
                        ? resp.response_boolean
                          ? "Yes"
                          : "No"
                        : resp.response_date ??
                          (resp.response_json ? JSON.stringify(resp.response_json) : "—"))}
                </p>
                {resp.explanation_text && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    Explanation: {resp.explanation_text}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
