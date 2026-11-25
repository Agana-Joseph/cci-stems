"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { DataTable } from "@/components/tables/data-table";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { KpiCard } from "@/components/charts/kpi-card";
import { CardGridSkeleton, ErrorAlert } from "@/components/feedback/states";
import { useEventAnalyticsBundle, useEvents, useQuestionnaires } from "@/hooks/use-queries";
import { useEventSubmissions, type EnrichedSubmission } from "@/hooks/use-admin-submissions";
import { formatDateTime, formatEnumLabel, formatPercent } from "@/lib/utils/format";

export default function AdminAssessmentsPage() {
  const router = useRouter();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";
  const activeEvent = (eventsQuery.data ?? []).find((e) => e.id === activeEventId);

  const [batchSize, setBatchSize] = React.useState(25);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [industryFilter, setIndustryFilter] = React.useState("");
  const [directAssessmentId, setDirectAssessmentId] = React.useState("");

  const { overview } = useEventAnalyticsBundle(activeEventId || null);
  const submissionsQuery = useEventSubmissions(activeEventId || null, batchSize);
  const questionnairesQuery = useQuestionnaires();

  const questionnaireMap = React.useMemo(() => {
    const map = new Map<string, { title: string; type: string }>();
    (questionnairesQuery.data ?? []).forEach((q) => {
      map.set(q.id, { title: q.title, type: q.questionnaire_type });
    });
    return map;
  }, [questionnairesQuery.data]);

  const industries = React.useMemo(() => {
    const set = new Set<string>();
    (submissionsQuery.data?.submissions ?? []).forEach((s) => {
      if (s.participant.industry) set.add(s.participant.industry);
    });
    return Array.from(set).sort();
  }, [submissionsQuery.data]);

  const filteredSubmissions = React.useMemo(() => {
    return (submissionsQuery.data?.submissions ?? []).filter((sub) => {
      if (statusFilter && sub.status !== statusFilter) return false;
      if (industryFilter && sub.participant.industry !== industryFilter) return false;
      if (typeFilter) {
        const qInfo = questionnaireMap.get(sub.questionnaire_id);
        if (!qInfo || qInfo.type !== typeFilter) return false;
      }
      return true;
    });
  }, [submissionsQuery.data, statusFilter, industryFilter, typeFilter, questionnaireMap]);

  const part = overview.data?.participation;
  const totalRegistered = part?.total_registered ?? part?.registered_count ?? 0;
  const completed = part?.completed_assessments ?? part?.assessment_submissions_count ?? 0;
  const pending = Math.max(0, totalRegistered - completed);

  const columns: ColumnDef<EnrichedSubmission>[] = [
    {
      accessorFn: (row) => row.participant.full_name,
      id: "participant",
      header: "Participant",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/participants/${row.original.participant_id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.original.participant.full_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {[row.original.participant.current_role, row.original.participant.industry]
              .filter(Boolean)
              .join(" · ") || "Attendee"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "questionnaire_id",
      header: "Assessment Type",
      cell: ({ row }) => {
        const qInfo = questionnaireMap.get(row.original.questionnaire_id);
        return (
          <div className="space-y-0.5">
            <Badge variant="outline">
              {qInfo ? formatEnumLabel(qInfo.type) : "Assessment"}
            </Badge>
            {qInfo && (
              <p className="max-w-[200px] truncate text-xs text-muted-foreground">{qInfo.title}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "submitted_at",
      header: "Submission Date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.submitted_at)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "submitted" || row.original.status === "validated"
              ? "success"
              : "warning"
          }
          className="capitalize"
        >
          {formatEnumLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "event",
      header: "Event",
      cell: () => (
        <span className="text-xs text-muted-foreground">{activeEvent?.title ?? "—"}</span>
      ),
    },
    {
      id: "responses",
      header: "Responses",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.responses?.length ?? 0}</span>
      ),
    },
    {
      id: "actions",
      header: "Review",
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/assessments/${row.original.id}`}>
            View Details
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ),
    },
  ];

  const hasMoreParticipants =
    submissionsQuery.data &&
    submissionsQuery.data.totalParticipants > submissionsQuery.data.inspectedParticipantCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Assessment Review</h1>
          <p className="text-sm text-muted-foreground">
            Browse, filter, and open individual participant assessment submissions organised by
            questionnaire sections.
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
          <KpiCard label="Pending Assessments" value={pending} subtitle="Registered without submission" />
          <KpiCard
            label="Completion Rate"
            value={formatPercent(part?.assessment_completion_rate)}
            coverageLevel={part?.data_coverage?.coverage_level}
            sampleSize={completed}
          />
        </div>
      )}

      {/* Direct Assessment UUID Jump */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Open Assessment Directly by ID</CardTitle>
          <CardDescription>
            Paste any assessment submission UUID to inspect its full section-by-section responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (directAssessmentId.trim()) {
                router.push(`/admin/assessments/${encodeURIComponent(directAssessmentId.trim())}`);
              }
            }}
          >
            <Input
              value={directAssessmentId}
              onChange={(e) => setDirectAssessmentId(e.target.value)}
              placeholder="Paste assessment UUID..."
              className="sm:max-w-md"
            />
            <Button type="submit" variant="secondary" disabled={!directAssessmentId.trim()}>
              <Search className="h-4 w-4" />
              Open Submission
            </Button>
          </form>
        </CardContent>
      </Card>

      {submissionsQuery.isError && (
        <ErrorAlert
          error={submissionsQuery.error}
          onRetry={() => submissionsQuery.refetch()}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredSubmissions}
        isLoading={submissionsQuery.isLoading}
        searchPlaceholder="Search by participant name, role, or status..."
        emptyTitle="No assessment submissions found"
        emptyDescription="Submitted participant assessments for this event will appear here automatically."
        toolbarExtra={
          <>
            <NativeSelect
              aria-label="Filter by assessment type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-36 text-xs"
            >
              <option value="">All Types</option>
              <option value="post_event">Post-Event</option>
              <option value="follow_up">Follow-Up</option>
              <option value="reflection">Reflection</option>
              <option value="custom">Custom</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-36 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="validated">Validated</option>
              <option value="in_progress">In Progress</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by industry"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="h-9 w-40 text-xs"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </NativeSelect>
          </>
        }
      />

      {hasMoreParticipants && (
        <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground sm:flex-row">
          <span>
            Loaded submissions from the first{" "}
            <strong>{submissionsQuery.data?.inspectedParticipantCount}</strong> of{" "}
            <strong>{submissionsQuery.data?.totalParticipants}</strong> event participants to stay
            within backend rate limits.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchSize((prev) => Math.min(prev + 25, 100))}
          >
            Load More Participants
          </Button>
        </div>
      )}
    </div>
  );
}
