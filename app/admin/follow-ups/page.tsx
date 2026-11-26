"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, CheckCircle2, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import {
  CardGridSkeleton,
  CoverageBadge,
  EmptyState,
  ErrorAlert,
  EvidenceBadge,
} from "@/components/feedback/states";
import { eventsApi, followupsApi, getReadableErrorMessage } from "@/lib/api";
import { queryKeys, useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";
import { formatDate, formatEnumLabel, formatPercent, formatStageLabel } from "@/lib/utils/format";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import type { FollowUpRead, FollowUpStatus, VerificationStatus } from "@/types/api";

export default function AdminFollowUpsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const [stageFilter, setStageFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleParticipantId, setScheduleParticipantId] = React.useState("");
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [outcomeId, setOutcomeId] = React.useState("");
  const [verifyStatus, setVerifyStatus] = React.useState<VerificationStatus>("verified");
  const [verifyNotes, setVerifyNotes] = React.useState("");
  const [inspectedFollowUp, setInspectedFollowUp] = React.useState<FollowUpRead | null>(null);

  const { overview, followUps: followUpAnalytics } = useEventAnalyticsBundle(
    activeEventId || null
  );

  const followUpsListQuery = useQuery({
    queryKey: queryKeys.followUps({
      event_id: activeEventId,
      follow_up_stage: stageFilter || undefined,
      status: statusFilter || undefined,
    }),
    queryFn: async () =>
      (
        await followupsApi.list({
          event_id: activeEventId || undefined,
          follow_up_stage: stageFilter || undefined,
          status: (statusFilter || undefined) as FollowUpStatus | undefined,
        })
      ).data,
    enabled: Boolean(activeEventId),
  });

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 200, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 200, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      followupsApi.schedule({
        participant_id: scheduleParticipantId,
        event_id: activeEventId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", activeEventId, "follow-ups"] });
      toast.success("Scheduled 30-, 60-, and 90-day follow-up checkpoints.");
      setScheduleOpen(false);
      setScheduleParticipantId("");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const verifyOutcomeMutation = useMutation({
    mutationFn: () =>
      followupsApi.verifyOutcome(outcomeId.trim(), {
        verification_status: verifyStatus,
        verification_notes: verifyNotes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics", activeEventId] });
      toast.success("Outcome verification status updated.");
      setVerifyOpen(false);
      setOutcomeId("");
      setVerifyNotes("");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const participantNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (participantsQuery.data ?? []).forEach((p) => map.set(p.participant_id, p.full_name));
    return map;
  }, [participantsQuery.data]);

  const columns: ColumnDef<FollowUpRead>[] = [
    {
      accessorKey: "participant_id",
      header: "Participant",
      cell: ({ row }) => (
        <Link
          href={`/admin/participants/${row.original.participant_id}`}
          className="font-medium text-primary hover:underline"
        >
          {participantNameMap.get(row.original.participant_id) ??
            `${row.original.participant_id.slice(0, 8)}...`}
        </Link>
      ),
    },
    {
      accessorKey: "follow_up_stage",
      header: "Stage",
      cell: ({ row }) => formatStageLabel(row.original.follow_up_stage),
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => formatDate(row.original.due_date),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "completed"
              ? "success"
              : row.original.status === "overdue"
                ? "destructive"
                : "warning"
          }
          className="capitalize"
        >
          {formatEnumLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "link",
      header: "Participant Link",
      cell: ({ row }) => {
        const slug =
          row.original.follow_up_stage === "60_day"
            ? "60-days"
            : row.original.follow_up_stage === "90_day"
              ? "90-days"
              : "30-days";
        return (
          <Link
            href={`/follow-up/${slug}?follow_up_id=${row.original.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            /follow-up/{slug}?follow_up_id={row.original.id.slice(0, 8)}...
          </Link>
        );
      },
    },
    {
      id: "inspect",
      header: "Submission",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInspectedFollowUp(row.original)}
        >
          <Eye className="h-3.5 w-3.5" />
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Follow-Up Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track 30-, 60-, and 90-day completion rates, schedule participant check-ins, and verify
            documented outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminEventSelector
            events={eventsQuery.data ?? []}
            value={activeEventId}
            onChange={setSelectedEventId}
          />
          <Button variant="outline" onClick={() => setVerifyOpen(true)}>
            <CheckCircle2 className="h-4 w-4" />
            Verify Outcome
          </Button>
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4" />
            Schedule Follow-Ups
          </Button>
        </div>
      </div>

      {/* Immediate Event Baseline vs Longitudinal Follow-Ups */}
      {overview.data && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  Stage 0: Immediate Post-Event Assessment (Baseline)
                </CardTitle>
                <CardDescription>
                  Separates what participants gained immediately at the event from sustained
                  application measured at 30, 60, and 90 days.
                </CardDescription>
              </div>
              <Badge variant="default">Immediate Baseline</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {(() => {
              const m = extractOverviewMetrics(overview.data);
              return (
                <>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-muted-foreground">Eligible Registered</span>
                    <p className="mt-1 text-lg font-bold">{m.totalRegistered}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-muted-foreground">Completed Immediate</span>
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      {m.completedAssessments}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-muted-foreground">Immediate Completion</span>
                    <p className="mt-1 text-lg font-bold">
                      {formatPercent(m.assessmentCompletionRate)}
                    </p>
                  </div>
                </>
              );
            })()}
            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-muted-foreground">Verified / Documented Outcomes</span>
              <p className="mt-1 text-lg font-bold">
                {(overview.data.outcomes_summary?.verified ?? 0) +
                  (overview.data.outcomes_summary?.documented ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 30 / 60 / 90-Day Analytics Summary */}
      {followUpAnalytics.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : followUpAnalytics.isError ? (
        <ErrorAlert error={followUpAnalytics.error} />
      ) : !followUpAnalytics.data?.stages || followUpAnalytics.data.stages.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No follow-up stage analytics yet"
          description="Schedule follow-ups for event participants to begin tracking 30-, 60-, and 90-day progress."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {followUpAnalytics.data.stages.map((st) => (
            <Card key={st.follow_up_stage}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {formatStageLabel(st.follow_up_stage)}
                  </CardTitle>
                  <CoverageBadge
                    level={st.data_coverage?.coverage_level}
                    sampleSize={st.completed_count}
                  />
                </div>
                <CardDescription>
                  Completion Rate: <strong>{formatPercent(st.completion_rate)}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <span className="text-muted-foreground">Scheduled</span>
                  <p className="mt-0.5 text-lg font-bold">{st.scheduled_count}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-900">
                  <span>Completed</span>
                  <p className="mt-0.5 text-lg font-bold">{st.completed_count}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-900">
                  <span>Pending / Overdue</span>
                  <p className="mt-0.5 text-lg font-bold">
                    {st.pending_count} / {st.overdue_count}
                  </p>
                </div>
                <div className="rounded-lg bg-sky-50 p-2.5 text-sky-900">
                  <span>Reported Actions</span>
                  <p className="mt-0.5 text-lg font-bold">{st.reported_actions_count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Participant-Level Follow-Up Records */}
      {followUpsListQuery.isError && <ErrorAlert error={followUpsListQuery.error} />}
      <DataTable
        columns={columns}
        data={followUpsListQuery.data ?? []}
        isLoading={followUpsListQuery.isLoading}
        searchPlaceholder="Search follow-up records..."
        toolbarExtra={
          <>
            <NativeSelect
              aria-label="Filter by stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-9 w-36 text-xs"
            >
              <option value="">All Stages</option>
              <option value="30_day">30-Day</option>
              <option value="60_day">60-Day</option>
              <option value="90_day">90-Day</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-36 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="skipped">Skipped</option>
            </NativeSelect>
          </>
        }
      />

      {/* Schedule Follow-Up Modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule 30 / 60 / 90-Day Follow-Ups</DialogTitle>
            <DialogDescription>
              Creates scheduled checkpoints across all three follow-up stages for a participant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Participant</Label>
            <NativeSelect
              value={scheduleParticipantId}
              onChange={(e) => setScheduleParticipantId(e.target.value)}
            >
              <option value="">Select participant...</option>
              {(participantsQuery.data ?? []).map((p) => (
                <option key={p.participant_id} value={p.participant_id}>
                  {p.full_name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!scheduleParticipantId || scheduleMutation.isPending}
              onClick={() => scheduleMutation.mutate()}
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule All Stages"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Follow-Up Submission Inspection Dialog */}
      <Dialog
        open={Boolean(inspectedFollowUp)}
        onOpenChange={(o) => !o && setInspectedFollowUp(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {inspectedFollowUp
                ? `${formatStageLabel(inspectedFollowUp.follow_up_stage)} — ${
                    participantNameMap.get(inspectedFollowUp.participant_id) ??
                    inspectedFollowUp.participant_id.slice(0, 8)
                  }`
                : "Follow-Up Submission"}
            </DialogTitle>
            <DialogDescription>
              Status: {formatEnumLabel(inspectedFollowUp?.status)} &middot; Due:{" "}
              {formatDate(inspectedFollowUp?.due_date)}
            </DialogDescription>
          </DialogHeader>

          {inspectedFollowUp && (
            <div className="space-y-4 text-sm">
              {!inspectedFollowUp.submissions || inspectedFollowUp.submissions.length === 0 ? (
                <EmptyState
                  title="No submission recorded yet"
                  description="This follow-up checkpoint has not been submitted by the participant yet."
                />
              ) : (
                inspectedFollowUp.submissions.map((sub, idx) => (
                  <div
                    key={sub.id ?? idx}
                    className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Submitted: {formatDate(sub.assessment_date || sub.created_at)}
                      </span>
                      <EvidenceBadge classification={sub.evidence_classification} />
                    </div>

                    {sub.outcome_descriptions && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Reported Outcome ({formatEnumLabel(sub.outcome_type)})
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-foreground">
                          {sub.outcome_descriptions}
                        </p>
                      </div>
                    )}

                    {sub.reported_actions && sub.reported_actions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Reported Actions ({sub.reported_actions.length})
                        </p>
                        <ul className="mt-1 space-y-1 text-xs">
                          {sub.reported_actions.map((act, i) => (
                            <li
                              key={i}
                              className="rounded border border-border bg-card px-2.5 py-1.5"
                            >
                              {String(act.description ?? JSON.stringify(act))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sub.responses && Object.keys(sub.responses).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Questionnaire Responses
                        </p>
                        <div className="mt-1 space-y-1.5 text-xs">
                          {Object.entries(sub.responses).map(([k, v]) => (
                            <div key={k} className="rounded border border-border bg-card p-2">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {k}:{" "}
                              </span>
                              <span className="text-foreground">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Outcome Modal */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Reported Outcome</DialogTitle>
            <DialogDescription>
              Approving (<code className="font-mono text-xs">verified</code>) promotes a documented
              outcome to verified evidence classification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Outcome UUID *</Label>
              <Input
                value={outcomeId}
                onChange={(e) => setOutcomeId(e.target.value)}
                placeholder="Paste outcome UUID"
              />
            </div>
            <div className="space-y-1">
              <Label>Verification Decision</Label>
              <NativeSelect
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value as VerificationStatus)}
              >
                <option value="verified">Verified</option>
                <option value="pending_review">Pending Review</option>
                <option value="rejected">Rejected</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Verification Notes</Label>
              <Textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Notes on evidence reviewed..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!outcomeId.trim() || verifyOutcomeMutation.isPending}
              onClick={() => verifyOutcomeMutation.mutate()}
            >
              {verifyOutcomeMutation.isPending ? "Updating..." : "Save Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
