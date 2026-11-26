"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  Clock,
  MessageSquareQuote,
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
import {
  useEventAnalyticsBundle,
  useEvents,
  useQuestionCards,
  useQuestions,
} from "@/hooks/use-queries";
import {
  extractQualitativeFeedback,
  useEventSubmissions,
} from "@/hooks/use-admin-submissions";
import { formatDateTime, formatPercent, formatScore, formatStageLabel } from "@/lib/utils/format";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import { designTokens } from "@/styles/tokens";

export default function AdminDashboardHomePage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const { overview, pillars, followUps } = useEventAnalyticsBundle(activeEventId || null);
  const submissionsQuery = useEventSubmissions(activeEventId || null, 20);
  const questionsQuery = useQuestions({ include_archived: false });
  const cardsQuery = useQuestionCards(true);

  const metrics = extractOverviewMetrics(overview.data);

  const pillarChartData = React.useMemo(
    () =>
      (pillars.data?.pillars ?? []).map((p) => ({
        name: p.pillar_name.split(" ").slice(0, 2).join(" "),
        fullName: p.pillar_name,
        average: p.average !== null && p.response_count > 0 ? Number(p.average.toFixed(1)) : 0,
        hasData: p.average !== null && p.response_count > 0,
        responseCount: p.response_count,
      })),
    [pillars.data]
  );

  const hasChartData = pillarChartData.some((p) => p.hasData);

  const recentSubmissions = React.useMemo(
    () => (submissionsQuery.data?.submissions ?? []).slice(0, 5),
    [submissionsQuery.data]
  );

  const recentFeedback = React.useMemo(
    () =>
      extractQualitativeFeedback(
        submissionsQuery.data?.submissions ?? [],
        questionsQuery.data ?? [],
        cardsQuery.data ?? []
      ).slice(0, 5),
    [submissionsQuery.data, questionsQuery.data, cardsQuery.data]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Event Intelligence Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live participation, six-pillar impact scores, recent assessments, and qualitative
            reflections retrieved directly from the backend API.
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

          {/* Summary KPI Strip */}
          {overview.isLoading ? (
            <CardGridSkeleton count={6} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Registered"
                value={metrics.totalRegistered}
                subtitle="Total event roster"
                sampleSize={metrics.totalRegistered}
                coverageLevel={metrics.totalRegistered > 0 ? "high" : "none"}
                icon={Users}
              />
              <KpiCard
                label="Attendees"
                value={metrics.confirmedAttendees}
                subtitle={`Rate: ${formatPercent(metrics.attendanceRate)}`}
                sampleSize={metrics.attendanceCoverage?.response_count ?? metrics.confirmedAttendees}
                coverageLevel={
                  metrics.attendanceCoverage?.coverage_level ??
                  (metrics.confirmedAttendees > 0 ? "high" : "none")
                }
                icon={UserCheck}
              />
              <KpiCard
                label="Completed"
                value={metrics.completedAssessments}
                subtitle={`Completion: ${formatPercent(metrics.assessmentCompletionRate)}`}
                sampleSize={metrics.assessmentCoverageCount}
                coverageLevel={metrics.assessmentCoverage?.coverage_level}
                icon={ClipboardCheck}
              />
              <KpiCard
                label="Pending"
                value={metrics.pendingAssessments}
                subtitle="Awaiting submission"
                icon={Clock}
              />
              <KpiCard
                label="Follow-Ups Done"
                value={metrics.followUpsCompleted}
                subtitle={`of ${metrics.followUpsScheduled} scheduled (${formatPercent(metrics.followUpsCompletionRate)})`}
                icon={CalendarClock}
              />
              <KpiCard
                label="Overall Impact"
                value={
                  metrics.overallImpact.average !== null
                    ? formatScore(metrics.overallImpact.average, 1)
                    : "—"
                }
                subtitle={
                  metrics.overallImpact.average === null
                    ? "Insufficient scored data"
                    : `n=${metrics.overallImpact.responseCount ?? 0} scored`
                }
                coverageLevel={metrics.overallImpact.coverageLevel}
                sampleSize={metrics.overallImpact.responseCount}
                icon={Award}
              />
            </div>
          )}

          {/* Six Measurement Pillars — Visual Comparison + Cards */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Six Measurement Pillars</CardTitle>
                <CardDescription>
                  Server-calculated scores across {pillars.data?.participants_scored ?? 0} scored
                  participants. Unavailable pillars are shown as no data rather than zero.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Deep-Dive Analytics
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {pillars.isLoading ? (
                <CardGridSkeleton count={6} />
              ) : pillars.isError ? (
                <ErrorAlert error={pillars.error} onRetry={() => pillars.refetch()} />
              ) : !pillars.data?.pillars || pillars.data.pillars.length === 0 ? (
                <EmptyState
                  title="No pillar score data available"
                  description="Once assessments are submitted and scored by the backend, all six measurement pillars will populate automatically."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/admin/scoring">Open Scoring Configuration</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  {hasChartData && (
                    <div className="h-64 w-full rounded-xl border border-border bg-muted/15 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pillarChartData}
                          margin={{ top: 8, right: 16, left: 0, bottom: 12 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={designTokens.colors.charts.grid}
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="average"
                            name="Average Score"
                            fill={designTokens.colors.brand.primary}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

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
                                Weight: {formatPercent(pillar.default_weight)}
                              </p>
                            </div>
                            <span className="font-display text-lg font-bold text-primary">
                              {hasAvg ? formatScore(pillar.average, 1) : "Unavailable"}
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Assessments & Recent Feedback */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Recent Assessment Submissions</CardTitle>
                  <CardDescription>
                    Latest submitted responses from event participants
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/assessments">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {submissionsQuery.isLoading ? (
                  <CardGridSkeleton count={2} />
                ) : recentSubmissions.length === 0 ? (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No submissions yet"
                    description="Submitted participant assessments will appear here automatically."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {recentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/admin/assessments/${sub.id}`}
                            className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {sub.participant.full_name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {sub.participant.current_role || sub.participant.industry || "Attendee"}{" "}
                            &middot; {formatDateTime(sub.submitted_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="success" className="capitalize">
                            {sub.status}
                          </Badge>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/assessments/${sub.id}`}>Review</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Recent Participant Feedback</CardTitle>
                  <CardDescription>
                    Verbatim qualitative takeaways &amp; reflective card answers
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/feedback">
                    All feedback <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {submissionsQuery.isLoading ? (
                  <CardGridSkeleton count={2} />
                ) : recentFeedback.length === 0 ? (
                  <EmptyState
                    icon={MessageSquareQuote}
                    title="No qualitative feedback yet"
                    description="Written takeaways and question card responses will appear here once submitted."
                  />
                ) : (
                  <div className="space-y-3">
                    {recentFeedback.map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-lg border border-border bg-muted/20 p-3.5 text-sm"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {fb.questionText}
                        </p>
                        <p className="mt-1 line-clamp-2 text-foreground">
                          &ldquo;{fb.answerText}&rdquo;
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {fb.participantName}
                            {fb.participantIndustry ? ` · ${fb.participantIndustry}` : ""}
                          </span>
                          <Link
                            href={`/admin/assessments/${fb.assessmentId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            Open assessment
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Follow-Up Completion & Evidence Summary */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">30 / 60 / 90-Day Follow-Up Status</CardTitle>
                  <CardDescription>Longitudinal tracking across scheduled checkpoints</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/follow-ups">
                    Monitor <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {!followUps.data?.stages || followUps.data.stages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No follow-up checkpoints have been scheduled for this event yet.
                  </p>
                ) : (
                  followUps.data.stages.map((st) => {
                    const pct =
                      st.completion_rate !== null
                        ? st.completion_rate <= 1
                          ? st.completion_rate * 100
                          : st.completion_rate
                        : 0;
                    return (
                      <div key={st.follow_up_stage} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {formatStageLabel(st.follow_up_stage)}
                          </span>
                          <span className="text-muted-foreground">
                            {st.completed_count} / {st.scheduled_count} completed (
                            {formatPercent(st.completion_rate)})
                          </span>
                        </div>
                        <ProgressBar value={pct} max={100} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outcomes by Evidence Classification</CardTitle>
                <CardDescription>
                  Strict separation between self-reported, documented, and verified outcomes
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
          </div>
        </>
      )}
    </div>
  );
}
