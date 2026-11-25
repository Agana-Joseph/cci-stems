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
import { queryKeys, useEvents } from "@/hooks/use-queries";
import {
  downloadJsonFile,
  formatDateTime,
  formatPercent,
  formatScore,
} from "@/lib/utils/format";
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
                      Overall Score: {formatScore(eventReportQuery.data.overview.impact_scores.overall, 1)}
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
