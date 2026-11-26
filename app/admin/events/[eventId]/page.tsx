"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { CardGridSkeleton, ErrorAlert } from "@/components/feedback/states";
import { DataTable } from "@/components/tables/data-table";
import { eventsApi, getReadableErrorMessage, scoringApi } from "@/lib/api";
import { queryKeys, useEvent, useEventAnalyticsBundle } from "@/hooks/use-queries";
import { formatDate, formatPercent, formatScore, maskPhoneNumber } from "@/lib/utils/format";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import type { EventParticipantSummary } from "@/types/api";
import type { ColumnDef } from "@tanstack/react-table";

export default function AdminEventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const queryClient = useQueryClient();

  const eventQuery = useEvent(eventId);
  const { overview } = useEventAnalyticsBundle(eventId);
  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(eventId, 200, 0),
    queryFn: async () => (await eventsApi.listParticipants(eventId, { limit: 200, offset: 0 })).data,
  });

  const calcMutation = useMutation({
    mutationFn: () => scoringApi.calculateEvent(eventId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["analytics", eventId] });
      toast.success(
        `Calculated scores for ${res.data.scores_calculated} of ${res.data.participants_processed} participants.`
      );
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const columns: ColumnDef<EventParticipantSummary>[] = [
    {
      accessorKey: "full_name",
      header: "Participant",
      cell: ({ row }) => (
        <Link
          href={`/admin/participants/${row.original.participant_id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.full_name}
        </Link>
      ),
    },
    { accessorKey: "current_role", header: "Role", cell: ({ row }) => row.original.current_role || "—" },
    { accessorKey: "industry", header: "Industry", cell: ({ row }) => row.original.industry || "—" },
    {
      accessorKey: "phone_normalised",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{maskPhoneNumber(row.original.phone_normalised)}</span>
      ),
    },
    {
      accessorKey: "registration_status",
      header: "Registration",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.registration_status || "registered"}
        </Badge>
      ),
    },
    {
      accessorKey: "attendance_status",
      header: "Attendance",
      cell: ({ row }) => {
        const st = row.original.attendance_status ?? "unverified";
        return (
          <Badge
            variant={
              st === "confirmed" ? "success" : st === "absent" ? "destructive" : "warning"
            }
            className="capitalize"
          >
            {st}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/events">
            <ArrowLeft className="h-4 w-4" />
            All Events
          </Link>
        </Button>

        <Button
          variant="outline"
          disabled={calcMutation.isPending}
          onClick={() => calcMutation.mutate()}
        >
          <Calculator className="h-4 w-4" />
          {calcMutation.isPending ? "Calculating Scores..." : "Recalculate Event Scores"}
        </Button>
      </div>

      {eventQuery.isError && <ErrorAlert error={eventQuery.error} />}

      {eventQuery.data && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-2xl">{eventQuery.data.title}</CardTitle>
              <Badge variant="default" className="capitalize">
                {eventQuery.data.status}
              </Badge>
            </div>
            <CardDescription className="flex flex-wrap items-center gap-4 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(eventQuery.data.event_date)}
              </span>
              {eventQuery.data.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {eventQuery.data.location}
                </span>
              )}
              <span className="font-mono text-xs">{eventQuery.data.slug}</span>
            </CardDescription>
          </CardHeader>
          {eventQuery.data.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{eventQuery.data.description}</p>
            </CardContent>
          )}
        </Card>
      )}

      {overview.isLoading ? (
        <CardGridSkeleton count={4} />
      ) : overview.data ? (() => {
        const metrics = extractOverviewMetrics(overview.data);
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Registered"
              value={metrics.totalRegistered}
              icon={Users}
            />
            <KpiCard
              label="Attendance Rate"
              value={formatPercent(metrics.attendanceRate)}
              coverageLevel={metrics.attendanceCoverage?.coverage_level}
              sampleSize={metrics.attendanceCoverage?.response_count ?? metrics.confirmedAttendees}
            />
            <KpiCard
              label="Assessment Rate"
              value={formatPercent(metrics.assessmentCompletionRate)}
              coverageLevel={metrics.assessmentCoverage?.coverage_level}
              sampleSize={metrics.assessmentCoverageCount}
            />
            <KpiCard
              label="Overall Impact"
              value={
                metrics.overallImpact.average !== null
                  ? formatScore(metrics.overallImpact.average, 1)
                  : "—"
              }
              coverageLevel={metrics.overallImpact.coverageLevel}
              sampleSize={metrics.overallImpact.responseCount}
            />
          </div>
        );
      })() : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Event Roster</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/attendance">Manage Attendance</Link>
          </Button>
        </div>
        {participantsQuery.isError && <ErrorAlert error={participantsQuery.error} />}
        <DataTable
          columns={columns}
          data={participantsQuery.data ?? []}
          isLoading={participantsQuery.isLoading}
          searchPlaceholder="Filter event participants..."
        />
      </div>
    </div>
  );
}
