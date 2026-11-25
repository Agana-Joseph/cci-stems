"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Label, NativeSelect } from "@/components/ui/form-controls";
import type { EventRead } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

export function AdminEventSelector({
  events,
  value,
  onChange,
  label = "Active Event",
}: {
  events: EventRead[];
  value: string;
  onChange: (eventId: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor="admin-event-selector" className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex whitespace-nowrap">
        <Calendar className="h-3.5 w-3.5" />
        {label}
      </Label>
      <NativeSelect
        id="admin-event-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[220px] sm:w-72"
      >
        {events.length === 0 ? (
          <option value="">No events available</option>
        ) : (
          events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({formatDate(ev.event_date)})
            </option>
          ))
        )}
      </NativeSelect>
    </div>
  );
}
