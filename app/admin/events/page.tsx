"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Edit3, ExternalLink, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { ErrorAlert } from "@/components/feedback/states";
import { eventFormSchema } from "@/lib/validation/schemas";
import { eventsApi, getReadableErrorMessage } from "@/lib/api";
import { useEvents } from "@/hooks/use-queries";
import { formatDate } from "@/lib/utils/format";
import type { EventRead, EventStatus } from "@/types/api";

type EventFormValues = z.infer<typeof eventFormSchema>;

const statusBadgeVariant: Record<EventStatus, "success" | "info" | "secondary" | "warning"> = {
  active: "success",
  completed: "info",
  draft: "warning",
  archived: "secondary",
};

export default function AdminEventsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 200 });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<EventRead | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      slug: "",
      title: "",
      description: "",
      event_type: "networking_and_knowledge_sharing",
      event_date: new Date().toISOString().slice(0, 10),
      end_date: "",
      location: "",
      status: "active",
    },
  });

  const openCreate = () => {
    setEditingEvent(null);
    form.reset({
      slug: "",
      title: "",
      description: "",
      event_type: "networking_and_knowledge_sharing",
      event_date: new Date().toISOString().slice(0, 10),
      end_date: "",
      location: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  const openEdit = (ev: EventRead) => {
    setEditingEvent(ev);
    form.reset({
      slug: ev.slug,
      title: ev.title,
      description: ev.description ?? "",
      event_type: ev.event_type ?? "networking_and_knowledge_sharing",
      event_date: ev.event_date.slice(0, 10),
      end_date: ev.end_date ? ev.end_date.slice(0, 10) : "",
      location: ev.location ?? "",
      status: ev.status,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const payload = {
        ...values,
        description: values.description || null,
        end_date: values.end_date || null,
        location: values.location || null,
      };
      if (editingEvent) {
        return eventsApi.update(editingEvent.id, payload);
      }
      return eventsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(editingEvent ? "Event updated." : "Event created.");
      setDialogOpen(false);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const columns: ColumnDef<EventRead>[] = [
    {
      accessorKey: "title",
      header: "Event",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/events/${row.original.id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.original.title}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: "event_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDate(row.original.event_date)}
        </span>
      ),
    },
    {
      accessorKey: "location",
      header: "Venue / Location",
      cell: ({ row }) =>
        row.original.location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {row.original.location}
          </span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant[row.original.status]} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/events/${row.original.id}`}>
              Details
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage CCI STEM Connect event editions, dates, venues, and performance.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {eventsQuery.isError && (
        <ErrorAlert error={eventsQuery.error} onRetry={() => eventsQuery.refetch()} />
      )}

      <DataTable
        columns={columns}
        data={eventsQuery.data ?? []}
        isLoading={eventsQuery.isLoading}
        searchPlaceholder="Search events by title, slug, or venue..."
        emptyTitle="No events found"
        emptyDescription="Create an event edition to start tracking attendance and impact."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription>
              Configure event metadata synced directly with{" "}
              <code className="font-mono text-xs">/api/v1/events</code>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((vals) => saveMutation.mutate(vals))}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ev-title">Event Title *</Label>
                <Input
                  id="ev-title"
                  placeholder="CCI STEM Connect Lagos 2026"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-slug">Slug *</Label>
                <Input
                  id="ev-slug"
                  placeholder="cci-stem-lagos-2026"
                  {...form.register("slug")}
                />
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-status">Status *</Label>
                <NativeSelect id="ev-status" {...form.register("status")}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Event Date *</Label>
                <Input id="ev-date" type="date" {...form.register("event_date")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-end-date">End Date</Label>
                <Input id="ev-end-date" type="date" {...form.register("end_date")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ev-location">Venue / Location</Label>
                <Input
                  id="ev-location"
                  placeholder="Lagos, Nigeria"
                  {...form.register("location")}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ev-desc">Description</Label>
                <Textarea
                  id="ev-desc"
                  rows={3}
                  placeholder="Event summary and objectives..."
                  {...form.register("description")}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : editingEvent
                    ? "Save Changes"
                    : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
