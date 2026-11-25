"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Clock, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CciLogo } from "@/components/ui/cci-logo";
import { Label, NativeSelect } from "@/components/ui/form-controls";
import { ErrorAlert, EmptyState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/tabs-and-progress";
import { useEvents } from "@/hooks/use-queries";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";
import { formatDate } from "@/lib/utils/format";

export default function AssessmentWelcomePage() {
  const router = useRouter();
  const { eventId, setEventId } = useAssessmentContext();
  const eventsQuery = useEvents({ limit: 50 });

  const estimatedMinutes = Number(process.env.NEXT_PUBLIC_ESTIMATED_ASSESSMENT_MINUTES || 8);

  const availableEvents = React.useMemo(() => {
    const all = eventsQuery.data ?? [];
    const nonDraft = all.filter((e) => e.status === "active" || e.status === "completed");
    return nonDraft.length > 0 ? nonDraft : all;
  }, [eventsQuery.data]);

  const selectedEvent = React.useMemo(() => {
    if (availableEvents.length === 0) return null;
    return availableEvents.find((e) => e.id === eventId) ?? availableEvents[0] ?? null;
  }, [availableEvents, eventId]);

  React.useEffect(() => {
    if (!eventId && selectedEvent) {
      setEventId(selectedEvent.id);
    }
  }, [eventId, selectedEvent, setEventId]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="h-1.5 bg-gradient-to-r from-[#D41B23] via-[#B5151C] to-[#8E1117]" />
        <div className="p-6 sm:p-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CciLogo size="md" />
            <Badge variant="default" className="tracking-wider uppercase">
              CCI STEM CONNECT
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your Experience. Your Insights. Our Impact.
          </h1>
          <div className="max-w-2xl space-y-3 text-base leading-relaxed text-muted-foreground">
            <p>
              CCI STEM Connect brought professionals together to exchange ideas, share experiences,
              explore workplace excellence, and build meaningful professional relationships in
              Christ.
            </p>
            <p>
              We would love to understand what you took away from the experience and how it has
              influenced your professional journey.
            </p>
          </div>
        </div>

        {/* Dynamic Event Details from Backend */}
        <div className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          {eventsQuery.isLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : eventsQuery.isError ? (
            <ErrorAlert
              error={eventsQuery.error}
              title="Unable to retrieve event information"
              onRetry={() => eventsQuery.refetch()}
            />
          ) : !selectedEvent ? (
            <EmptyState
              title="No active events available"
              description="Event details are loaded directly from the backend. Please check back once an event has been published."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Event Record
                  </p>
                  <h2 className="mt-0.5 font-display text-lg font-semibold text-foreground">
                    {selectedEvent.title}
                  </h2>
                </div>
                {availableEvents.length > 1 && (
                  <div className="w-full sm:w-64">
                    <Label htmlFor="event-select" className="sr-only">
                      Select event edition
                    </Label>
                    <NativeSelect
                      id="event-select"
                      value={selectedEvent.id}
                      onChange={(e) => setEventId(e.target.value)}
                    >
                      {availableEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  {formatDate(selectedEvent.event_date)}
                  {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date
                    ? ` – ${formatDate(selectedEvent.end_date)}`
                    : ""}
                </span>
                {selectedEvent.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedEvent.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Approx. {estimatedMinutes} minutes
                </span>
              </div>
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            size="lg"
            disabled={!selectedEvent}
            onClick={() => {
              if (selectedEvent) setEventId(selectedEvent.id);
              router.push("/assessment/verify");
            }}
            className="w-full sm:w-auto"
          >
            Start Assessment
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            No password or account creation required.
          </p>
        </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What This Assessment Covers</CardTitle>
            <CardDescription>
              Structured questions across six impact pillars plus reflective question cards shared
              at CCI STEM Connect. Your feedback directly shapes future editions and helps measure
              long-term professional impact.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Privacy &amp; Data Protection
            </CardTitle>
            <CardDescription>
              Your contact details are used solely to associate your responses with your event
              record. Responses are held only in memory until you submit and are never stored in
              persistent browser storage or publicly ranked.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
