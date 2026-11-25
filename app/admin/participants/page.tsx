"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Plus,
  Upload,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { ErrorAlert } from "@/components/feedback/states";
import { participantCreateSchema } from "@/lib/validation/schemas";
import { eventsApi, getReadableErrorMessage, participantsApi } from "@/lib/api";
import { queryKeys, useEvents } from "@/hooks/use-queries";
import { useEventSubmissions } from "@/hooks/use-admin-submissions";
import { downloadCsvRows, maskPhoneNumber } from "@/lib/utils/format";
import type { EventParticipantSummary, ParticipantImportResult } from "@/types/api";

type ParticipantFormValues = z.infer<typeof participantCreateSchema>;

export default function AdminParticipantsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const [industryFilter, setIndustryFilter] = React.useState("");
  const [attendanceFilter, setAttendanceFilter] = React.useState("");
  const [revealPhones, setRevealPhones] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = React.useState<ParticipantImportResult | null>(null);

  const participantsQuery = useQuery({
    queryKey: queryKeys.eventParticipants(activeEventId, 500, 0),
    queryFn: async () =>
      (await eventsApi.listParticipants(activeEventId, { limit: 500, offset: 0 })).data,
    enabled: Boolean(activeEventId),
  });

  const submissionsQuery = useEventSubmissions(activeEventId || null, 25);

  const submissionByParticipant = React.useMemo(() => {
    const map = new Map<string, string>();
    (submissionsQuery.data?.submissions ?? []).forEach((s) => {
      if (!map.has(s.participant_id)) map.set(s.participant_id, s.id);
    });
    return map;
  }, [submissionsQuery.data]);

  const industries = React.useMemo(() => {
    const set = new Set<string>();
    (participantsQuery.data ?? []).forEach((p) => {
      if (p.industry) set.add(p.industry);
    });
    return Array.from(set).sort();
  }, [participantsQuery.data]);

  const filteredData = React.useMemo(() => {
    return (participantsQuery.data ?? []).filter((p) => {
      if (industryFilter && p.industry !== industryFilter) return false;
      if (attendanceFilter && (p.attendance_status ?? "unverified") !== attendanceFilter)
        return false;
      return true;
    });
  }, [participantsQuery.data, industryFilter, attendanceFilter]);

  const createForm = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantCreateSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      current_role: "",
      industry: "",
      organisation: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ParticipantFormValues) => {
      const parsedYoe =
        values.years_of_experience && values.years_of_experience.trim() !== ""
          ? Number.parseInt(values.years_of_experience, 10)
          : null;
      return participantsApi.create({
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        current_role: values.current_role || null,
        industry: values.industry || null,
        organisation: values.organisation || null,
        years_of_experience: parsedYoe !== null && !Number.isNaN(parsedYoe) ? parsedYoe : null,
        reason_for_attending: values.reason_for_attending || null,
        event_id: activeEventId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", activeEventId, "participants"] });
      toast.success("Participant added and registered for event.");
      createForm.reset();
      setCreateOpen(false);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const dryRunMutation = useMutation({
    mutationFn: (file: File) =>
      participantsApi.importFile({
        file,
        event_id: activeEventId || undefined,
        dry_run: true,
      }),
    onSuccess: (res) => {
      setDryRunResult(res.data);
      toast.success("Dry-run validation complete. Review the preview before committing.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const commitImportMutation = useMutation({
    mutationFn: (file: File) =>
      participantsApi.importFile({
        file,
        event_id: activeEventId || undefined,
        dry_run: false,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["events", activeEventId, "participants"] });
      toast.success(
        `Import complete: ${res.data.created_count ?? res.data.valid_rows} participant records processed.`
      );
      setImportOpen(false);
      setImportFile(null);
      setDryRunResult(null);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const columns: ColumnDef<EventParticipantSummary>[] = [
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => (
        <Link
          href={`/admin/participants/${row.original.participant_id}`}
          className="font-semibold text-primary hover:underline"
        >
          {row.original.full_name}
        </Link>
      ),
    },
    {
      accessorKey: "email_normalised",
      header: "Email",
      cell: ({ row }) => row.original.email_normalised || "—",
    },
    {
      accessorKey: "phone_normalised",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {revealPhones
            ? row.original.phone_normalised || "—"
            : maskPhoneNumber(row.original.phone_normalised)}
        </span>
      ),
    },
    {
      accessorKey: "current_role",
      header: "Role",
      cell: ({ row }) => row.original.current_role || "—",
    },
    {
      accessorKey: "industry",
      header: "Industry",
      cell: ({ row }) => row.original.industry || "—",
    },
    {
      accessorKey: "organisation",
      header: "Organisation",
      cell: ({ row }) => row.original.organisation || "—",
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
    {
      id: "assessment_status",
      header: "Assessment",
      cell: ({ row }) => {
        const subId = submissionByParticipant.get(row.original.participant_id);
        if (subId) {
          return (
            <Link href={`/admin/assessments/${subId}`}>
              <Badge variant="success" className="cursor-pointer hover:opacity-85">
                Submitted
              </Badge>
            </Link>
          );
        }
        return <Badge variant="secondary">Pending</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Participants</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, import, and inspect participant records scoped to each event.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminEventSelector
            events={eventsQuery.data ?? []}
            value={activeEventId}
            onChange={setSelectedEventId}
          />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV / Excel
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Participant
          </Button>
        </div>
      </div>

      {participantsQuery.isError && (
        <ErrorAlert
          error={participantsQuery.error}
          onRetry={() => participantsQuery.refetch()}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={participantsQuery.isLoading}
        searchPlaceholder="Search name, email, role, industry..."
        toolbarExtra={
          <>
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
            <NativeSelect
              aria-label="Filter by attendance"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              className="h-9 w-40 text-xs"
            >
              <option value="">All Attendance</option>
              <option value="confirmed">Confirmed</option>
              <option value="partial">Partial</option>
              <option value="absent">Absent</option>
              <option value="unverified">Unverified</option>
            </NativeSelect>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealPhones((v) => !v)}
              title="Toggle restricted phone display"
            >
              {revealPhones ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {revealPhones ? "Mask Phones" : "Reveal Phones"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredData.length === 0}
              onClick={() =>
                downloadCsvRows(
                  filteredData.map((r) => ({
                    full_name: r.full_name,
                    email: r.email_normalised ?? "",
                    phone: revealPhones ? r.phone_normalised ?? "" : maskPhoneNumber(r.phone_normalised),
                    role: r.current_role ?? "",
                    industry: r.industry ?? "",
                    organisation: r.organisation ?? "",
                    registration_status: r.registration_status ?? "",
                    attendance_status: r.attendance_status ?? "",
                  })),
                  `cci-stem-participants-${activeEventId.slice(0, 8)}.csv`
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Add Participant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Requires full name plus at least a phone number or email address. Automatically
              registers the participant for the selected event.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((vals) => createMutation.mutate(vals))}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Full Name *</Label>
                <Input {...createForm.register("full_name")} placeholder="Adaeze Okafor" />
                {createForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...createForm.register("phone")} placeholder="08012345678" />
                {createForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...createForm.register("email")} placeholder="name@org.com" />
              </div>
              <div className="space-y-1">
                <Label>Current Role</Label>
                <Input {...createForm.register("current_role")} placeholder="Software Engineer" />
              </div>
              <div className="space-y-1">
                <Label>Industry</Label>
                <Input {...createForm.register("industry")} placeholder="FinTech" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Organisation</Label>
                <Input {...createForm.register("organisation")} placeholder="Company name" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="h-4 w-4" />
                {createMutation.isPending ? "Saving..." : "Add Participant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2-Step CSV / Excel Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportFile(null);
            setDryRunResult(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              2-Step Participant CSV / Excel Import
            </DialogTitle>
            <DialogDescription>
              Step 1 runs a safe <code className="font-mono text-xs">dry_run=true</code> validation
              to detect duplicates and row errors. Step 2 commits validated records to the selected
              event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="import-file">Upload .csv, .xlsx, or .xls (max 10 MB)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImportFile(f);
                  setDryRunResult(null);
                }}
              />
            </div>

            {dryRunMutation.isError && <ErrorAlert error={dryRunMutation.error} />}
            {commitImportMutation.isError && <ErrorAlert error={commitImportMutation.error} />}

            {dryRunResult && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Dry-Run Validation Summary
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-lg bg-card p-3">
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                    <p className="text-xl font-bold">{dryRunResult.total_rows}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-800">Valid Rows</p>
                    <p className="text-xl font-bold text-emerald-800">{dryRunResult.valid_rows}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">Duplicates</p>
                    <p className="text-xl font-bold text-amber-800">
                      {dryRunResult.duplicate_count}
                    </p>
                  </div>
                </div>

                {dryRunResult.errors.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                    <p className="mb-1 font-semibold">
                      Validation Errors ({dryRunResult.errors.length})
                    </p>
                    <ul className="space-y-1">
                      {dryRunResult.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>
                          Row {err.row_number}
                          {err.field ? ` (${err.field})` : ""}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            {!dryRunResult ? (
              <Button
                disabled={!importFile || dryRunMutation.isPending}
                onClick={() => importFile && dryRunMutation.mutate(importFile)}
              >
                {dryRunMutation.isPending ? "Validating..." : "Step 1: Validate Dry Run"}
              </Button>
            ) : (
              <Button
                disabled={!importFile || commitImportMutation.isPending}
                onClick={() => importFile && commitImportMutation.mutate(importFile)}
              >
                {commitImportMutation.isPending
                  ? "Importing..."
                  : `Step 2: Confirm & Import (${dryRunResult.valid_rows} valid)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
