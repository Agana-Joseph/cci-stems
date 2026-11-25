"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/tabs-and-progress";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { KpiCard } from "@/components/charts/kpi-card";
import {
  CardGridSkeleton,
  CoverageBadge,
  EmptyState,
  ErrorAlert,
} from "@/components/feedback/states";
import { useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";
import { formatPercent, formatScore } from "@/lib/utils/format";

export default function AdminDashboardHomePage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const { overview, pillars } = useEventAnalyticsBundle(activeEventId || null);

  const part = overview.data?.participation;
  const scores = overview.data?.impact_scores;
  const totalRegistered = part?.total_registered ?? part?.registered_count ?? 0;
  const confirmedAttendees = part?.confirmed_attendees ?? part?.attended_count ?? 0;
  const completedAssessments =
    part?.completed_assessments ?? part?.assessment_submissions_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Impact Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time participation, six-pillar impact scores, and data coverage from the CCI STEM
            Connect backend.
          </p>
        </div>
        <AdminEventSelector
          events={eventsQuery.data ?? []}
          value={activeEventId}
          onChange={setSelectedEventId}
        />
      </div>

      {eventsQuery.isError && (
        <ErrorAlert
          error={eventsQuery.error}
          title="Unable to fetch events"
          onRetry={() => eventsQuery.refetch()}
        />
      )}

      {!eventsQuery.isLoading && (eventsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No events configured yet"
          description="Create your first CCI STEM Connect event to begin managing registrations, assessments, and impact analytics."
          action={
            <Button asChild>
              <Link href="/admin/events">Create Event</Link>
            </Button>
          }
        />
      ) : (
        <>
          {overview.isError && (
            <ErrorAlert
              error={overview.error}
              title="Unable to load event overview analytics"
              onRetry={() => overview.refetch()}
            />
          )}

          {overview.isLoading ? (
            <CardGridSkeleton count={5} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                label="Registered Participants"
                value={totalRegistered}
                subtitle="Total event registrations"
                sampleSize={totalRegistered}
                coverageLevel={totalRegistered > 0 ? "high" : "none"}
                icon={Users}
              />
              <KpiCard
                label="Confirmed Attendees"
                value={confirmedAttendees}
                subtitle="Verified attendance records"
                sampleSize={confirmedAttendees}
                coverageLevel={confirmedAttendees > 0 ? "high" : "none"}
                icon={UserCheck}
              />
              <KpiCard
                label="Attendance Rate"
                value={formatPercent(part?.attendance_rate)}
                subtitle={
                  part?.attendance_rate_reliable === false
                    ? "Low reliability — verify check-ins"
                    : "Confirmed / Registered"
                }
                coverageLevel={part?.data_coverage?.coverage_level}
                sampleSize={totalRegistered}
                icon={CheckCircle2}
              />
              <KpiCard
                label="Assessment Completion"
                value={formatPercent(part?.assessment_completion_rate)}
                subtitle={`${completedAssessments} submission${completedAssessments === 1 ? "" : "s"}`}
                coverageLevel={part?.data_coverage?.coverage_level}
                sampleSize={completedAssessments}
                icon={ClipboardCheck}
              />
              <KpiCard
                label="Overall Impact Score"
                value={
                  scores?.overall !== null && scores?.overall !== undefined
                    ? `${formatScore(scores.overall, 1)}`
                    : "—"
                }
                subtitle={
                  scores?.overall === null || scores?.overall === undefined
                    ? "Insufficient scored data"
                    : `${scores.participants_scored ?? 0} participants scored`
                }
                coverageLevel={scores?.data_coverage?.coverage_level}
                sampleSize={scores?.participants_scored}
                icon={Award}
              />
            </div>
          )}

          {/* Six Measurement Pillars Breakdown */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Six Measurement Pillar Averages</CardTitle>
                <CardDescription>
                  Aggregated server-side across {pillars.data?.participants_scored ?? 0} scored
                  participants. Missing pillars are excluded rather than zeroed.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Full Analytics
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pillars.isLoading ? (
                <CardGridSkeleton count={6} />
              ) : pillars.isError ? (
                <ErrorAlert error={pillars.error} onRetry={() => pillars.refetch()} />
              ) : !pillars.data?.pillars || pillars.data.pillars.length === 0 ? (
                <EmptyState
                  title="No pillar score data available"
                  description="Once assessments are submitted and scores are calculated in the Scoring module, average scores for all six pillars will appear here."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/admin/scoring">Go to Scoring Configuration</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pillars.data.pillars.map((pillar) => {
                    const hasAvg = pillar.average !== null && pillar.response_count > 0;
                    return (
                      <div
                        key={pillar.pillar_id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {pillar.pillar_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Default weight: {formatPercent(pillar.default_weight)}
                            </p>
                          </div>
                          <span className="font-display text-lg font-bold text-primary">
                            {hasAvg ? formatScore(pillar.average, 1) : "—"}
                          </span>
                        </div>
                        <ProgressBar
                          value={hasAvg ? (pillar.average ?? 0) : 0}
                          max={100}
                          indicatorClassName={hasAvg ? "bg-primary" : "bg-slate-300"}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <CoverageBadge
                            level={pillar.data_coverage?.coverage_level}
                            sampleSize={pillar.response_count}
                          />
                          {pillar.missing_count > 0 && (
                            <span>{pillar.missing_count} missing</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secondary Highlights: Outcomes & Follow-Ups */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outcomes by Evidence Classification</CardTitle>
                <CardDescription>
                  Distinguishes self-reported impact from documented and admin-verified outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
                  <Badge variant="warning">Self-Reported</Badge>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {overview.data?.outcomes_summary?.self_reported ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5">
                  <Badge variant="info">Documented</Badge>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {overview.data?.outcomes_summary?.documented ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <Badge variant="success">Verified</Badge>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {overview.data?.outcomes_summary?.verified ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Follow-Up &amp; Action Progress</CardTitle>
                  <CardDescription>Longitudinal 30/60/90-day tracking</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/follow-ups">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3.5">
                  <p className="text-xs text-muted-foreground">Follow-Ups Completed</p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {overview.data?.follow_up_summary?.total_completed ?? 0}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {overview.data?.follow_up_summary?.total_scheduled ?? 0}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3.5">
                  <p className="text-xs text-muted-foreground">Actions Completed</p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {overview.data?.actions_progress?.completed_count ?? 0}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {overview.data?.actions_progress?.total_actions ?? 0}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
