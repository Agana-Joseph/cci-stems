"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { NativeSelect } from "@/components/ui/form-controls";
import { CardGridSkeleton, ErrorAlert } from "@/components/feedback/states";
import { eventsApi } from "@/lib/api";
import { queryKeys, useEventAnalyticsBundle, useEvents } from "@/hooks/use-queries";

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
