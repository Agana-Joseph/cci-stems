"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, CalendarPlus, ClipboardCheck, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-and-progress";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { ParticipantImpactReportView } from "@/features/reports/components/participant-impact-report-view";
import {
  assessmentsApi,
  followupsApi,
  getReadableErrorMessage,
  participantsApi,
  scoringApi,
} from "@/lib/api";
import { useEvents } from "@/hooks/use-queries";
import { formatDate, formatDateTime, formatStageLabel } from "@/lib/utils/format";

export default function AdminParticipantDetailPage() {
  const params = useParams<{ participantId: string }>();
  const participantId = params.participantId;
  const queryClient = useQueryClient();

  const eventsQuery = useEvents({ limit: 50 });
  const defaultEventId = eventsQuery.data?.[0]?.id;

  const participantQuery = useQuery({
    queryKey: ["participants", participantId],
    queryFn: async () => (await participantsApi.get(participantId)).data,
  });

  const impactQuery = useQuery({
    queryKey: ["participants", participantId, "impact", defaultEventId],
    queryFn: async () =>
      (await participantsApi.getImpact(participantId, defaultEventId ? { event_id: defaultEventId } : undefined))
        .data,
  });

  const assessmentsQuery = useQuery({
    queryKey: ["participants", participantId, "assessments"],
    queryFn: async () => (await assessmentsApi.listByParticipant(participantId)).data,
  });

  const followUpsQuery = useQuery({
    queryKey: ["participants", participantId, "follow-ups"],
    queryFn: async () => (await followupsApi.listByParticipant(participantId)).data,
  });

  const calcScoreMutation = useMutation({
    mutationFn: () => {
      if (!defaultEventId) throw new Error("No event available for score calculation.");
      return scoringApi.calculateParticipant(participantId, { event_id: defaultEventId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", participantId, "impact"] });
      toast.success("Participant impact score recalculated.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const scheduleFollowUpsMutation = useMutation({
    mutationFn: () => {
      if (!defaultEventId) throw new Error("No event available to schedule follow-ups.");
      return followupsApi.schedule({ participant_id: participantId, event_id: defaultEventId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", participantId, "follow-ups"] });
      toast.success("30/60/90-day follow-up checkpoints scheduled.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  if (participantQuery.isLoading) {
    return <CardGridSkeleton count={4} />;
  }

  if (participantQuery.isError || !participantQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/participants">
            <ArrowLeft className="h-4 w-4" />
            Back to Participants
          </Link>
        </Button>
        <ErrorAlert
          error={participantQuery.error}
          title="Unable to load participant record"
          onRetry={() => participantQuery.refetch()}
        />
      </div>
    );
  }

  const participant = participantQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/participants">
            <ArrowLeft className="h-4 w-4" />
            All Participants
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={scheduleFollowUpsMutation.isPending}
            onClick={() => scheduleFollowUpsMutation.mutate()}
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule 30/60/90 Follow-Ups
          </Button>
          <Button
            size="sm"
            disabled={calcScoreMutation.isPending}
            onClick={() => calcScoreMutation.mutate()}
          >
            <Calculator className="h-4 w-4" />
            {calcScoreMutation.isPending ? "Calculating..." : "Calculate Impact Score"}
          </Button>
        </div>
      </div>

      {/* Contact & Profile Summary */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{participant.full_name}</CardTitle>
              <CardDescription className="mt-1">
                {[participant.current_role, participant.organisation, participant.industry]
                  .filter(Boolean)
                  .join(" · ") || "No professional details recorded"}
              </CardDescription>
            </div>
            <Badge variant={participant.consent_given ? "success" : "warning"}>
              {participant.consent_given ? "Consent Confirmed" : "Consent Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            <span>{participant.email_normalised || participant.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-mono text-xs">
              {participant.phone_normalised || participant.phone || "—"}
            </span>
          </div>
          <div className="text-muted-foreground">
            Experience:{" "}
            <strong className="text-foreground">
              {participant.years_of_experience !== null &&
              participant.years_of_experience !== undefined
                ? `${participant.years_of_experience} yrs`
                : "—"}
            </strong>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="impact">
        <TabsList>
          <TabsTrigger value="impact">Impact Report</TabsTrigger>
          <TabsTrigger value="assessments">
            Assessments ({assessmentsQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-Ups ({followUpsQuery.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impact">
          {impactQuery.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : impactQuery.isError ? (
            <ErrorAlert error={impactQuery.error} />
          ) : impactQuery.data ? (
            <ParticipantImpactReportView
              participant={participant}
              event={eventsQuery.data?.[0]}
              impact={impactQuery.data}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          {assessmentsQuery.isError && <ErrorAlert error={assessmentsQuery.error} />}
          {!assessmentsQuery.data || assessmentsQuery.data.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No assessment submissions"
              description="This participant has not submitted a post-event assessment yet."
            />
          ) : (
            assessmentsQuery.data.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      Submission <span className="font-mono text-xs">{sub.id.slice(0, 8)}</span>
                    </CardTitle>
                    <CardDescription>
                      Submitted: {formatDateTime(sub.submitted_at)} &middot; Channel:{" "}
                      {sub.submission_channel ?? "web_portal"}
                    </CardDescription>
                  </div>
                  <Badge variant="success" className="capitalize">
                    {sub.status}
                  </Badge>
                </CardHeader>
                {sub.responses && sub.responses.length > 0 && (
                  <CardContent className="divide-y divide-border text-sm">
                    {sub.responses.map((r) => (
                      <div key={r.id} className="py-2.5">
                        <p className="text-xs text-muted-foreground">
                          {r.question_text || r.question_code || r.question_id}
                        </p>
                        <p className="mt-0.5 font-medium">
                          {r.response_text ??
                            (r.response_numeric !== null && r.response_numeric !== undefined
                              ? String(r.response_numeric)
                              : typeof r.response_boolean === "boolean"
                                ? r.response_boolean
                                  ? "Yes"
                                  : "No"
                                : r.response_date ??
                                  (r.response_json ? JSON.stringify(r.response_json) : "—"))}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="followups" className="space-y-3">
          {followUpsQuery.isError && <ErrorAlert error={followUpsQuery.error} />}
          {!followUpsQuery.data || followUpsQuery.data.length === 0 ? (
            <EmptyState
              title="No follow-ups scheduled"
              description="Click 'Schedule 30/60/90 Follow-Ups' above to create longitudinal checkpoints for this participant."
            />
          ) : (
            followUpsQuery.data.map((fu) => (
              <Card key={fu.id}>
                <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatStageLabel(fu.follow_up_stage)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(fu.due_date)} &middot; ID:{" "}
                      <code className="font-mono">{fu.id}</code>
                    </p>
                  </div>
                  <Badge
                    variant={
                      fu.status === "completed"
                        ? "success"
                        : fu.status === "overdue"
                          ? "destructive"
                          : "warning"
                    }
                    className="capitalize"
                  >
                    {fu.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
