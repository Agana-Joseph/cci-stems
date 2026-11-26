"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverageBadge, EmptyState } from "@/components/feedback/states";
import { designTokens } from "@/styles/tokens";
import { formatEnumLabel, formatStageLabel } from "@/lib/utils/format";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import type {
  EventApplicationAnalytics,
  EventFollowUpsAnalytics,
  EventNetworkingAnalytics,
  EventOverviewAnalytics,
  EventParticipantSummary,
  EventPillarsAnalytics,
} from "@/types/api";

interface AnalyticsChartsProps {
  overview?: EventOverviewAnalytics;
  pillars?: EventPillarsAnalytics;
  networking?: EventNetworkingAnalytics;
  application?: EventApplicationAnalytics;
  followUps?: EventFollowUpsAnalytics;
  participants: EventParticipantSummary[];
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <EmptyState
      title="Insufficient dataset"
      description={message}
      className="h-full border-none shadow-none"
    />
  );
}

export default function AnalyticsCharts({
  overview,
  pillars,
  networking,
  application,
  followUps,
  participants,
}: AnalyticsChartsProps) {
  const pillarData = React.useMemo(
    () =>
      (pillars?.pillars ?? []).map((p) => ({
        name: p.pillar_name,
        shortName: p.pillar_name.split(" ").slice(0, 2).join(" "),
        average: p.average !== null ? Number(p.average.toFixed(1)) : 0,
        median: p.median !== null ? Number(p.median.toFixed(1)) : 0,
        hasData: p.average !== null && p.response_count > 0,
        responseCount: p.response_count,
      })),
    [pillars]
  );

  const hasAnyPillarScores = pillarData.some((p) => p.hasData);

  const scopeScoresData = React.useMemo(() => {
    if (!overview?.impact_scores) return [];
    const m = extractOverviewMetrics(overview);
    return [
      { label: "Immediate", score: m.immediateImpact.average },
      { label: "Post-Event Application", score: m.applicationImpact.average },
      { label: "Sustained", score: m.sustainedImpact.average },
      { label: "Overall", score: m.overallImpact.average },
    ].filter((d): d is { label: string; score: number } => d.score !== null && d.score !== undefined);
  }, [overview]);

  const actionsFunnelData = React.useMemo(() => {
    const a = application?.actions;
    if (!a) return [];
    return [
      { stage: "Intended", count: a.intended_only_count },
      { stage: "In Progress", count: a.in_progress_count },
      { stage: "Completed", count: a.completed_count },
      { stage: "Abandoned", count: a.abandoned_count },
    ];
  }, [application]);

  const networkingData = React.useMemo(() => {
    if (!networking) return [];
    return [
      { metric: "Connections", value: networking.total_connections_reported },
      { metric: "Follow-Ups", value: networking.follow_up_conversations_count },
      { metric: "Collaborations", value: networking.collaborations_started_count },
      { metric: "Opportunities", value: networking.opportunities_discovered_count },
    ];
  }, [networking]);

  const followUpTrendData = React.useMemo(
    () =>
      (followUps?.stages ?? []).map((st) => ({
        stage: formatStageLabel(st.follow_up_stage),
        completionRate:
          st.completion_rate !== null
            ? Number((st.completion_rate <= 1 ? st.completion_rate * 100 : st.completion_rate).toFixed(1))
            : 0,
        completed: st.completed_count,
        reportedActions: st.reported_actions_count,
      })),
    [followUps]
  );

  const outcomeEvidenceData = React.useMemo(() => {
    const raw = application?.outcomes?.by_evidence_classification ?? {};
    return Object.entries(raw).map(([k, v]) => ({
      name: formatEnumLabel(k),
      value: v,
    }));
  }, [application]);

  const industryData = React.useMemo(() => {
    const counts = new Map<string, number>();
    participants.forEach((p) => {
      const ind = p.industry?.trim() || "Unspecified";
      counts.set(ind, (counts.get(ind) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [participants]);

  const roleData = React.useMemo(() => {
    const counts = new Map<string, number>();
    participants.forEach((p) => {
      const role = p.current_role?.trim() || "Unspecified";
      counts.set(role, (counts.get(role) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [participants]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Six-Pillar Score Comparison (Bar) */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Six-Pillar Score Comparison</CardTitle>
            <CardDescription>Average &amp; median scores across measurement pillars</CardDescription>
          </div>
          <CoverageBadge
            level={hasAnyPillarScores ? "moderate" : "none"}
            sampleSize={pillars?.participants_scored ?? 0}
          />
        </CardHeader>
        <CardContent className="h-80">
          {!hasAnyPillarScores ? (
            <ChartEmpty message="No pillar scores calculated yet for this event." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average" fill="#D41B23" radius={[6, 6, 0, 0]} />
                <Bar dataKey="median" name="Median" fill="#1E293B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2. Six-Pillar Balance Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impact Pillar Profile</CardTitle>
          <CardDescription>
            Engagement, Knowledge, Workplace Excellence, Recognition, Networking, and Application
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {!hasAnyPillarScores ? (
            <ChartEmpty message="Radar profile unlocks once pillar scores are computed." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={pillarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Pillar Average"
                  dataKey="average"
                  stroke="#D41B23"
                  fill="#D41B23"
                  fillOpacity={0.22}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Impact Horizon Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Immediate vs Application vs Sustained Impact</CardTitle>
          <CardDescription>Impact trajectory across scoring scopes</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {scopeScoresData.length === 0 ? (
            <ChartEmpty message="No scoped impact scores calculated yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeScoresData}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" name="Score" fill="#D41B23" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. 30 / 60 / 90-Day Impact Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">30 / 60 / 90-Day Follow-Up Trends</CardTitle>
          <CardDescription>Completion rate (%) and reported actions across stages</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {followUpTrendData.length === 0 ? (
            <ChartEmpty message="No 30/60/90-day follow-up data recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followUpTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  name="Completion Rate (%)"
                  stroke="#D41B23"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="reportedActions"
                  name="Reported Actions"
                  stroke="#1E293B"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 5. Post-Event Application Progress */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Post-Event Application Progress</CardTitle>
            <CardDescription>Action lifecycle from intended to completed</CardDescription>
          </div>
          <CoverageBadge level={application?.actions?.data_coverage?.coverage_level} />
        </CardHeader>
        <CardContent className="h-72">
          {actionsFunnelData.every((d) => d.count === 0) ? (
            <ChartEmpty message="No post-event actions have been logged yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionsFunnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Actions" fill="#1E293B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 6. Networking Outcomes */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Networking Outcomes</CardTitle>
            <CardDescription>Connections converting into conversations &amp; collaborations</CardDescription>
          </div>
          <CoverageBadge level={networking?.data_coverage?.coverage_level} />
        </CardHeader>
        <CardContent className="h-72">
          {networkingData.every((d) => d.value === 0) ? (
            <ChartEmpty message="No networking outcomes logged yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={networkingData}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="#D41B23" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 7. Outcomes Evidence Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcomes by Evidence Classification</CardTitle>
          <CardDescription>Self-reported, documented, and verified outcomes</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {outcomeEvidenceData.length === 0 ? (
            <ChartEmpty message="No reported outcomes recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeEvidenceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label
                >
                  {outcomeEvidenceData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={
                        designTokens.colors.charts.pillarPalette[
                          idx % designTokens.colors.charts.pillarPalette.length
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 8. Participant Industry Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participant Industry Distribution</CardTitle>
          <CardDescription>Top represented industries from registered event roster</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {industryData.length === 0 ? (
            <ChartEmpty message="No participant industry data recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryData} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Participants" fill="#9F1239" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 9. Professional Role Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Professional Role Distribution</CardTitle>
          <CardDescription>Top participant job roles across the selected event</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {roleData.length === 0 ? (
            <ChartEmpty message="No professional role data available for this event." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Participants" fill="#D41B23" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
