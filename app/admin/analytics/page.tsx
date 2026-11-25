"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { NativeSelect } from "@/components/ui/form-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/tabs-and-progress";
import { CardGridSkeleton, CoverageBadge, ErrorAlert } from "@/components/feedback/states";
import { eventsApi } from "@/lib/api";
import { queryKeys, useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";
import { formatEnumLabel, formatPercent, formatScore } from "@/lib/utils/format";

const AnalyticsCharts = dynamic(
  () => import("@/features/analytics/components/analytics-charts"),
  {
    ssr: false,
    loading: () => <CardGridSkeleton count={4} />,
  }
);

export default function AdminAnalyticsPage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const [industryFilter, setIndustryFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");

  const { overview, pillars, networking, application, followUps } = useEventAnalyticsBundle(
    activeEventId || null
  );

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 500, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 500, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const industries = React.useMemo(
    () =>
      Array.from(
        new Set((participantsQuery.data ?? []).map((p) => p.industry).filter(Boolean) as string[])
      ).sort(),
    [participantsQuery.data]
  );

  const roles = React.useMemo(
    () =>
      Array.from(
        new Set(
          (participantsQuery.data ?? []).map((p) => p.current_role).filter(Boolean) as string[]
        )
      ).sort(),
    [participantsQuery.data]
  );

  const filteredParticipants = React.useMemo(
    () =>
      (participantsQuery.data ?? []).filter((p) => {
        if (industryFilter && p.industry !== industryFilter) return false;
        if (roleFilter && p.current_role !== roleFilter) return false;
        return true;
      }),
    [participantsQuery.data, industryFilter, roleFilter]
  );

  const anyError =
    overview.error || pillars.error || networking.error || application.error || followUps.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Event Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive visualisations powered directly by backend analytics endpoints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminEventSelector
            events={eventsQuery.data ?? []}
            value={activeEventId}
            onChange={setSelectedEventId}
          />
          <NativeSelect
            aria-label="Filter demographic charts by industry"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="h-10 w-40 text-xs"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filter demographic charts by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 w-40 text-xs"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {anyError && (
        <ErrorAlert
          error={anyError}
          title="Some analytics endpoints returned an error"
          onRetry={() => {
            overview.refetch();
            pillars.refetch();
            networking.refetch();
            application.refetch();
            followUps.refetch();
          }}
        />
      )}

      {/* Six Measurement Pillars Statistical Summary */}
      {pillars.data?.pillars && pillars.data.pillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Six Measurement Pillars — Statistical Summary</CardTitle>
            <CardDescription>
              All scores are computed by the backend scoring engine ({pillars.data.participants_scored}{" "}
              participants scored). Unavailable scores are shown as unavailable rather than zero.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.data.pillars.map((p) => {
              const hasData = p.average !== null && p.response_count > 0;
              return (
                <div
                  key={p.pillar_id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.pillar_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEnumLabel(p.impact_category)} &middot; Weight:{" "}
                        {formatPercent(p.default_weight)}
                      </p>
                    </div>
                    <span className="font-display text-xl font-bold text-primary">
                      {hasData ? formatScore(p.average, 1) : "Unavailable"}
                    </span>
                  </div>
                  <ProgressBar
                    value={hasData ? (p.average ?? 0) : 0}
                    max={100}
                    indicatorClassName={hasData ? "bg-primary" : "bg-slate-300"}
                  />
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <span>Median: {hasData ? formatScore(p.median, 1) : "—"}</span>
                    <span>
                      Range: {hasData ? `${formatScore(p.min, 0)}–${formatScore(p.max, 0)}` : "—"}
                    </span>
                    <span>SD: {hasData && p.std_dev !== null ? p.std_dev.toFixed(1) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <CoverageBadge
                      level={p.data_coverage?.coverage_level}
                      sampleSize={p.response_count}
                    />
                    {p.missing_count > 0 && (
                      <span className="text-muted-foreground">{p.missing_count} missing</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <AnalyticsCharts
        overview={overview.data}
        pillars={pillars.data}
        networking={networking.data}
        application={application.data}
        followUps={followUps.data}
        participants={filteredParticipants}
      />
    </div>
  );
}
