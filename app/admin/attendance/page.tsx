"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/form-controls";
import { DataTable } from "@/components/tables/data-table";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { ErrorAlert } from "@/components/feedback/states";
import { eventsApi, getReadableErrorMessage } from "@/lib/api";
import { queryKeys, useEvents } from "@/hooks/use-queries";
import { downloadCsvRows, maskPhoneNumber } from "@/lib/utils/format";
import type { AttendanceStatus, EventParticipantSummary } from "@/types/api";

export default function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";
  const [statusFilter, setStatusFilter] = React.useState("");

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 500, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 500, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({
      participantId,
      status,
    }: {
      participantId: string;
      status: AttendanceStatus;
    }) =>
      eventsApi.upsertAttendance(activeEventId, {
        participant_id: participantId,
        attendance_status: status,
        check_in_at: status === "confirmed" || status === "partial" ? new Date().toISOString() : null,
        verification_source: "admin_dashboard",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", activeEventId, "participants"] });
      toast.success("Attendance status updated.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const rows = React.useMemo(() => {
    return (participantsQuery.data ?? []).filter((p) => {
      const st = p.attendance_status ?? "unverified";
      if (statusFilter && st !== statusFilter) return false;
      return true;
    });
  }, [participantsQuery.data, statusFilter]);

  const counts = React.useMemo(() => {
    const all = participantsQuery.data ?? [];
    return {
      total: all.length,
      confirmed: all.filter((p) => p.attendance_status === "confirmed").length,
      partial: all.filter((p) => p.attendance_status === "partial").length,
      absent: all.filter((p) => p.attendance_status === "absent").length,
      unverified: all.filter((p) => !p.attendance_status || p.attendance_status === "unverified")
        .length,
    };
  }, [participantsQuery.data]);

  const columns: ColumnDef<EventParticipantSummary>[] = [
    {
      accessorKey: "full_name",
      header: "Participant",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/participants/${row.original.participant_id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.original.full_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.email_normalised || maskPhoneNumber(row.original.phone_normalised)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "registration_status",
      header: "Registration Record",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="capitalize">
            {row.original.registration_status || "registered"}
          </Badge>
          {row.original.registration_source && (
            <p className="text-[11px] text-muted-foreground">
              via {row.original.registration_source}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "attendance_status",
      header: "Attendance Status",
      cell: ({ row }) => {
        const current = (row.original.attendance_status ?? "unverified") as AttendanceStatus;
        return (
          <NativeSelect
            aria-label={`Attendance status for ${row.original.full_name}`}
            value={current}
            disabled={updateAttendanceMutation.isPending}
            onChange={(e) =>
              updateAttendanceMutation.mutate({
                participantId: row.original.participant_id,
                status: e.target.value as AttendanceStatus,
              })
            }
            className="h-9 w-36 text-xs"
          >
            <option value="unverified">Unverified</option>
            <option value="confirmed">Confirmed</option>
            <option value="partial">Partial</option>
            <option value="absent">Absent</option>
          </NativeSelect>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Registration and attendance are maintained as separate records. Mark or verify event
            check-ins below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminEventSelector
            events={eventsQuery.data ?? []}
            value={activeEventId}
            onChange={setSelectedEventId}
          />
          <Button asChild variant="outline">
            <Link href="/admin/participants">
              <Upload className="h-4 w-4" />
              Import Records
            </Link>
          </Button>
        </div>
      </div>

      {/* Attendance Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Registered</p>
          <p className="mt-1 font-display text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-xs text-emerald-800">Confirmed</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-800">
            {counts.confirmed}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
          <p className="text-xs text-sky-800">Partial</p>
          <p className="mt-1 font-display text-2xl font-bold text-sky-800">{counts.partial}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-xs text-amber-800">Unverified</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-800">
            {counts.unverified}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
          <p className="text-xs text-red-800">Absent</p>
          <p className="mt-1 font-display text-2xl font-bold text-red-800">{counts.absent}</p>
        </div>
      </div>

      {participantsQuery.isError && <ErrorAlert error={participantsQuery.error} />}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={participantsQuery.isLoading}
        searchPlaceholder="Search attendee..."
        toolbarExtra={
          <>
            <NativeSelect
              aria-label="Filter by attendance status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-40 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="partial">Partial</option>
              <option value="unverified">Unverified</option>
              <option value="absent">Absent</option>
            </NativeSelect>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                downloadCsvRows(
                  rows.map((r) => ({
                    full_name: r.full_name,
                    email: r.email_normalised ?? "",
                    registration_status: r.registration_status ?? "",
                    attendance_status: r.attendance_status ?? "unverified",
                  })),
                  `attendance-${activeEventId.slice(0, 8)}.csv`
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </>
        }
      />
    </div>
  );
}
