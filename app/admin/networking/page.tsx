"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Handshake, MessageSquare, Network, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { KpiCard } from "@/components/charts/kpi-card";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";
import { formatEnumLabel } from "@/lib/utils/format";
import { designTokens } from "@/styles/tokens";

export default function AdminNetworkingPage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const { networking } = useEventAnalyticsBundle(activeEventId || null);

  const byTypeData = React.useMemo(() => {
    const raw = networking.data?.by_connection_type ?? {};
    return Object.entries(raw).map(([key, count]) => ({
      name: formatEnumLabel(key),
      count,
    }));
  }, [networking.data]);

  const byEvidenceData = React.useMemo(() => {
    const raw = networking.data?.by_evidence_classification ?? {};
    return Object.entries(raw).map(([key, count]) => ({
      name: formatEnumLabel(key),
      count,
    }));
  }, [networking.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Networking &amp; Relationships
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggregated connections, follow-up conversations, mentorships, and collaborations while
            protecting personal contact information.
          </p>
        </div>
        <AdminEventSelector
          events={eventsQuery.data ?? []}
          value={activeEventId}
          onChange={setSelectedEventId}
        />
      </div>

      {networking.isError && (
        <ErrorAlert error={networking.error} onRetry={() => networking.refetch()} />
      )}

      {networking.isLoading ? (
        <CardGridSkeleton count={5} />
      ) : !networking.data ? (
        <EmptyState
          icon={Network}
          title="No networking data available"
          description="Connections logged by participants will be aggregated here once submitted."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Connections Reported"
              value={networking.data.total_connections_reported}
              coverageLevel={networking.data.data_coverage?.coverage_level}
              sampleSize={networking.data.participants_reporting_connections}
              icon={Network}
            />
            <KpiCard
              label="Reporting Attendees"
              value={networking.data.participants_reporting_connections}
              subtitle={
                networking.data.connections_per_reporting_participant !== null
                  ? `${networking.data.connections_per_reporting_participant.toFixed(1)} avg / person`
                  : undefined
              }
              icon={Users}
            />
            <KpiCard
              label="Follow-Up Conversations"
              value={networking.data.follow_up_conversations_count}
              icon={MessageSquare}
            />
            <KpiCard
              label="Collaborations Started"
              value={networking.data.collaborations_started_count}
              icon={Handshake}
            />
            <KpiCard
              label="Opportunities Discovered"
              value={networking.data.opportunities_discovered_count}
              icon={Sparkles}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connections by Relationship Type</CardTitle>
                <CardDescription>
                  Distribution across peers, speakers, mentors, collaborators, and opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {byTypeData.length === 0 ? (
                  <EmptyState
                    title="No connection breakdown yet"
                    description="No categorised connections have been recorded for this event."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byTypeData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={designTokens.colors.brand.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evidence Classification</CardTitle>
                <CardDescription>
                  Self-reported vs documented vs verified networking outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {byEvidenceData.length === 0 ? (
                  <EmptyState
                    title="No evidence distribution yet"
                    description="Evidence grading populates as participants document connections."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byEvidenceData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {byEvidenceData.map((entry, idx) => (
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
          </div>
        </>
      )}
    </div>
  );
}
