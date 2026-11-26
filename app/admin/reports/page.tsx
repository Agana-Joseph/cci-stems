"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileBarChart2, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, NativeSelect } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-and-progress";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { ParticipantImpactReportView } from "@/features/reports/components/participant-impact-report-view";
import { eventsApi, getReadableErrorMessage, reportsApi } from "@/lib/api";
import {
  queryKeys,
  useEvents,
  useQuestionCards,
  useQuestions,
} from "@/hooks/use-queries";
import {
  extractQualitativeFeedback,
  useEventSubmissions,
} from "@/hooks/use-admin-submissions";
import {
  downloadCsvRows,
  downloadJsonFile,
  formatDateTime,
  formatPercent,
  formatScore,
} from "@/lib/utils/format";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import type { ExportFormat } from "@/types/api";

export default function AdminReportsPage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";
  const [selectedParticipantId, setSelectedParticipantId] = React.useState("");

  const eventReportQuery = useQuery({
    queryKey: ["reports", "event", activeEventId],
    queryFn: async () => (await reportsApi.getEventReport(activeEventId)).data,
    enabled: Boolean(activeEventId),
  });

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 200, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 200, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const participantReportQuery = useQuery({
    queryKey: ["reports", "participant", selectedParticipantId, activeEventId],
    queryFn: async () =>
      (
        await reportsApi.getParticipantReport(selectedParticipantId, {
          event_id: activeEventId || undefined,
        })
      ).data,
    enabled: Boolean(selectedParticipantId),
  });

  const submissionsQuery = useEventSubmissions(activeEventId || null, 25);
  const questionsQuery = useQuestions({ include_archived: true });
  const cardsQuery = useQuestionCards(true);

  const feedbackItems = React.useMemo(
    () =>
      extractQualitativeFeedback(
        submissionsQuery.data?.submissions ?? [],
        questionsQuery.data ?? [],
        cardsQuery.data ?? []
      ),
    [submissionsQuery.data, questionsQuery.data, cardsQuery.data]
  );

  const exportEventMutation = useMutation({
    mutationFn: (format: ExportFormat) => reportsApi.exportEventReport(activeEventId, format),
    onSuccess: (res, format) => {
      toast.success(
        `Event report exported (${format.toUpperCase()}). Server path: ${res.data.file_path}`
      );
      if (format === "json") {
        downloadJsonFile(res.data.report, `event-impact-report-${activeEventId.slice(0, 8)}.json`);
      }
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const exportParticipantMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      reportsApi.exportParticipantReport(selectedParticipantId, {
        export_format: format,
        event_id: activeEventId || undefined,
      }),
    onSuccess: (res, format) => {
      toast.success(
        `Participant report exported (${format.toUpperCase()}). Server path: ${res.data.file_path}`
      );
      if (format === "json") {
        downloadJsonFile(
          res.data.report,
          `participant-impact-report-${selectedParticipantId.slice(0, 8)}.json`
        );
      }
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Reports &amp; Exports</h1>
          <p className="text-sm text-muted-foreground">
            Preview backend-generated event and participant impact reports and export in JSON, CSV,
            or Excel formats.
          </p>
        </div>
        <AdminEventSelector
          events={eventsQuery.data ?? []}
          value={activeEventId}
          onChange={setSelectedEventId}
        />
      </div>

      <Tabs defaultValue="event-report">
        <TabsList>
          <TabsTrigger value="event-report">Event Impact Report</TabsTrigger>
          <TabsTrigger value="participant-report">Participant Impact Report</TabsTrigger>
        </TabsList>

        <TabsContent value="event-report" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">
              {eventReportQuery.data
                ? `Generated at ${formatDateTime(eventReportQuery.data.generated_at)}`
                : "Select an event to preview and export"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!activeEventId || exportEventMutation.isPending}
                onClick={() => exportEventMutation.mutate("json")}
              >
                <FileText className="h-3.5 w-3.5" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!activeEventId || exportEventMutation.isPending}
                onClick={() => exportEventMutation.mutate("csv")}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                size="sm"
                disabled={!activeEventId || exportEventMutation.isPending}
                onClick={() => exportEventMutation.mutate("xlsx")}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel (.xlsx)
              </Button>
            </div>
          </div>

          {eventReportQuery.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : eventReportQuery.isError ? (
            <ErrorAlert error={eventReportQuery.error} onRetry={() => eventReportQuery.refetch()} />
          ) : !eventReportQuery.data ? (
            <EmptyState
              icon={FileBarChart2}
              title="No event report available"
              description="Select a valid event to preview its consolidated impact report."
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>{eventReportQuery.data.event.title}</CardTitle>
                      <CardDescription>
                        Consolidated Impact, Networking, Application, Follow-Up &amp; Completeness
                        Summary
                      </CardDescription>
                    </div>
                    <Badge variant="default">
                      Overall Score:{" "}
                      {formatScore(
                        extractOverviewMetrics(eventReportQuery.data.overview).overallImpact.average,
                        1
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3.5">
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    <p className="mt-1 text-xl font-bold">
                      {formatPercent(eventReportQuery.data.overview.participation.attendance_rate)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3.5">
                    <p className="text-xs text-muted-foreground">Assessment Completion</p>
                    <p className="mt-1 text-xl font-bold">
                      {formatPercent(
                        eventReportQuery.data.overview.participation.assessment_completion_rate
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3.5">
                    <p className="text-xs text-muted-foreground">Connections Reported</p>
                    <p className="mt-1 text-xl font-bold">
                      {eventReportQuery.data.networking.total_connections_reported}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3.5">
                    <p className="text-xs text-muted-foreground">Implementation Conversion</p>
                    <p className="mt-1 text-xl font-bold">
                      {formatPercent(
                        eventReportQuery.data.application.actions.implementation_conversion_rate
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Targeted Anonymised CSV Downloads
                    </CardTitle>
                    <CardDescription>
                      Export focused datasets directly from the loaded backend report &amp;
                      qualitative feedback without exposing individual contact details.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!eventReportQuery.data?.pillars?.pillars?.length}
                    onClick={() =>
                      downloadCsvRows(
                        (eventReportQuery.data?.pillars.pillars ?? []).map((p) => ({
                          pillar: p.pillar_name,
                          impact_category: p.impact_category,
                          default_weight: p.default_weight,
                          average: p.average ?? "",
                          median: p.median ?? "",
                          min: p.min ?? "",
                          max: p.max ?? "",
                          response_count: p.response_count,
                          missing_count: p.missing_count,
                          coverage_level: p.data_coverage.coverage_level,
                        })),
                        `six-pillar-report-${activeEventId.slice(0, 8)}.csv`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Six-Pillar Report CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedbackItems.length === 0}
                    onClick={() =>
                      downloadCsvRows(
                        feedbackItems.map((f, idx) => ({
                          respondent: `Participant #${idx + 1}`,
                          industry: f.participantIndustry ?? "",
                          role: f.participantRole ?? "",
                          submitted_at: f.submittedAt ?? "",
                          question: f.questionText,
                          card: f.cardTitle ?? "",
                          verbatim_response: f.answerText,
                        })),
                        `anonymised-feedback-report-${activeEventId.slice(0, 8)}.csv`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Qualitative Feedback CSV (Anonymised)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!eventReportQuery.data?.follow_ups?.stages?.length}
                    onClick={() =>
                      downloadCsvRows(
                        (eventReportQuery.data?.follow_ups.stages ?? []).map((st) => ({
                          stage: st.follow_up_stage,
                          scheduled: st.scheduled_count,
                          completed: st.completed_count,
                          pending: st.pending_count,
                          overdue: st.overdue_count,
                          completion_rate: st.completion_rate ?? "",
                          reported_actions: st.reported_actions_count,
                          coverage_level: st.data_coverage.coverage_level,
                        })),
                        `follow-up-report-${activeEventId.slice(0, 8)}.csv`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Follow-Up Report CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pillar Summary &amp; Data Completeness</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Pillar</th>
                        <th className="py-2 pr-4">Avg</th>
                        <th className="py-2 pr-4">Median</th>
                        <th className="py-2 pr-4">Responses</th>
                        <th className="py-2">Coverage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {eventReportQuery.data.pillars.pillars.map((p) => (
                        <tr key={p.pillar_id}>
                          <td className="py-2.5 pr-4 font-medium">{p.pillar_name}</td>
                          <td className="py-2.5 pr-4">{formatScore(p.average, 1)}</td>
                          <td className="py-2.5 pr-4">{formatScore(p.median, 1)}</td>
                          <td className="py-2.5 pr-4">{p.response_count}</td>
                          <td className="py-2.5 capitalize">{p.data_coverage.coverage_level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participant-report" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-md space-y-1.5">
                <Label htmlFor="report-participant">Select Participant</Label>
                <NativeSelect
                  id="report-participant"
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                >
                  <option value="">Choose a participant...</option>
                  {(participantsQuery.data ?? []).map((p) => (
                    <option key={p.participant_id} value={p.participant_id}>
                      {p.full_name} ({p.industry || "General"})
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedParticipantId || exportParticipantMutation.isPending}
                  onClick={() => exportParticipantMutation.mutate("json")}
                >
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedParticipantId || exportParticipantMutation.isPending}
                  onClick={() => exportParticipantMutation.mutate("csv")}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedParticipantId || exportParticipantMutation.isPending}
                  onClick={() => exportParticipantMutation.mutate("xlsx")}
                >
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {participantReportQuery.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : participantReportQuery.isError ? (
            <ErrorAlert error={participantReportQuery.error} />
          ) : participantReportQuery.data ? (
            <ParticipantImpactReportView
              participant={participantReportQuery.data.participant}
              impact={participantReportQuery.data.impact_summary}
            />
          ) : (
            <EmptyState
              title="Select a participant"
              description="Choose an attendee above to preview their backend-generated personal impact report."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
