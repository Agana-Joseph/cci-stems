"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Network,
  Rocket,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-and-progress";
import { ErrorAlert } from "@/components/feedback/states";
import { useEvents, useFollowUpStages } from "@/hooks/use-queries";
import { followupsApi, getReadableErrorMessage, participantsApi } from "@/lib/api";
import type { ActionCategory, ActionStatus, ConnectionType, OutcomeType } from "@/types/api";

const stageCards = [
  {
    code: "30_day",
    href: "/follow-up/30-days",
    title: "30-Day Follow-Up",
    days: 30,
    highlights: [
      "Ideas applied",
      "New connections followed up",
      "Knowledge shared",
      "Professional habits changed",
      "Early outcomes",
    ],
  },
  {
    code: "60_day",
    href: "/follow-up/60-days",
    title: "60-Day Follow-Up",
    days: 60,
    highlights: [
      "Continued application",
      "Progress on professional goals",
      "Collaboration & mentorship",
      "Workplace improvements",
      "Emerging opportunities",
    ],
  },
  {
    code: "90_day",
    href: "/follow-up/90-days",
    title: "90-Day Follow-Up",
    days: 90,
    highlights: [
      "Tangible outcomes",
      "Sustained professional changes",
      "Completed collaborations",
      "Career or workplace improvements",
      "Long-term event value",
    ],
  },
];

export default function FollowUpHubPage() {
  const eventsQuery = useEvents({ limit: 20 });
  const [selectedEventId, setSelectedEventId] = React.useState<string>("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";
  const stagesQuery = useFollowUpStages(activeEventId || undefined);

  // Identification state (strictly in-memory)
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [verifiedMessage, setVerifiedMessage] = React.useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () =>
      participantsApi.lookupPublic({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        event_id: activeEventId || undefined,
      }),
    onSuccess: (res) => {
      setVerifiedMessage(
        res.data.message ||
          "Your contact has been recorded for this session. Use your invitation link or log an update below."
      );
      toast.success("Identification step completed.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  // Quick-log forms backed by public /api/v1/impact/* endpoints
  const [actionCategory, setActionCategory] = React.useState<ActionCategory>("idea_implementation");
  const [actionStatus, setActionStatus] = React.useState<ActionStatus>("in_progress");
  const [actionDesc, setActionDesc] = React.useState("");

  const [connType, setConnType] = React.useState<ConnectionType>("peer");
  const [connRole, setConnRole] = React.useState("");
  const [connOrg, setConnOrg] = React.useState("");
  const [connFollowUp, setConnFollowUp] = React.useState(true);
  const [connCollab, setConnCollab] = React.useState(false);
  const [connOpp, setConnOpp] = React.useState(false);

  const [outcomeType, setOutcomeType] = React.useState<OutcomeType>("productivity_gain");
  const [outcomeDesc, setOutcomeDesc] = React.useState("");
  const [evidenceUrl, setEvidenceUrl] = React.useState("");

  const logActionMutation = useMutation({
    mutationFn: () =>
      followupsApi.logAction({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        event_id: activeEventId,
        category: actionCategory,
        action_status: actionStatus,
        description: actionDesc.trim(),
      }),
    onSuccess: () => {
      setActionDesc("");
      toast.success("Action logged successfully.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const logConnectionMutation = useMutation({
    mutationFn: () =>
      followupsApi.logConnection({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        event_id: activeEventId,
        connection_type: connType,
        contact_role: connRole.trim() || undefined,
        contact_organisation: connOrg.trim() || undefined,
        follow_up_conversation: connFollowUp,
        collaboration_started: connCollab,
        opportunity_discovered: connOpp,
      }),
    onSuccess: () => {
      setConnRole("");
      setConnOrg("");
      toast.success("Professional connection logged.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const logOutcomeMutation = useMutation({
    mutationFn: () =>
      followupsApi.logOutcome({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        event_id: activeEventId,
        outcome_type: outcomeType,
        description: outcomeDesc.trim(),
        evidence_items: evidenceUrl.trim()
          ? [{ evidence_type: "reference_url", reference_url: evidenceUrl.trim() }]
          : undefined,
      }),
    onSuccess: () => {
      setOutcomeDesc("");
      setEvidenceUrl("");
      toast.success("Outcome recorded.");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const hasContact = Boolean(phone.trim() || email.trim());

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Follow-Up Assessments
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Track how conversations, insights, and relationships from CCI STEM Connect turn into real
          workplace and career outcomes at 30, 60, and 90 days.
        </p>
      </div>

      {/* Secure Identification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Identify Your Event Record
          </CardTitle>
          <CardDescription>
            Enter the phone number or email address used at registration before submitting updates.
            Stage completion status is verified server-side and is never assumed merely from
            visiting a page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="fu-event">Event</Label>
              <NativeSelect
                id="fu-event"
                value={activeEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {eventsQuery.isLoading ? (
                  <option value="">Loading events...</option>
                ) : (eventsQuery.data?.length ?? 0) === 0 ? (
                  <option value="">No events available</option>
                ) : (
                  (eventsQuery.data ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))
                )}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-phone">Phone number</Label>
              <Input
                id="fu-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-email">Email address</Label>
              <Input
                id="fu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!hasContact || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? "Checking..." : "Confirm Contact"}
            </Button>
            {verifiedMessage && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {verifiedMessage}
              </span>
            )}
          </div>
          {verifyMutation.isError && <ErrorAlert error={verifyMutation.error} />}
        </CardContent>
      </Card>

      {/* 30 / 60 / 90-Day Stage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stageCards.map((stage) => {
          const backendStage = (stagesQuery.data ?? []).find((s) => s.stage_code === stage.code);
          return (
            <Card key={stage.code} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Day {backendStage?.days_after_event ?? stage.days}
                  </Badge>
                  <Badge variant="secondary">
                    {backendStage ? "Configured" : "Stage Ready"}
                  </Badge>
                </div>
                <CardTitle className="pt-2 text-lg">
                  {backendStage?.stage_name ?? stage.title}
                </CardTitle>
                <CardDescription>Key focus areas:</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-5">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {stage.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full">
                  <Link href={stage.href}>
                    Open {stage.days}-Day Assessment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continuous Impact Logging (Public Impact Tracking APIs) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Ongoing Impact Updates</CardTitle>
          <CardDescription>
            Record actions taken, meaningful networking connections, or documented outcomes at any
            time between scheduled follow-up checkpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="action">
            <TabsList>
              <TabsTrigger value="action" className="gap-1.5">
                <Rocket className="h-3.5 w-3.5" />
                Action Taken
              </TabsTrigger>
              <TabsTrigger value="connection" className="gap-1.5">
                <Network className="h-3.5 w-3.5" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="outcome" className="gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Outcome
              </TabsTrigger>
            </TabsList>

            <TabsContent value="action" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Action Category</Label>
                  <NativeSelect
                    value={actionCategory}
                    onChange={(e) => setActionCategory(e.target.value as ActionCategory)}
                  >
                    <option value="idea_implementation">Idea Implementation</option>
                    <option value="habit_change">Habit Change</option>
                    <option value="knowledge_sharing">Knowledge Sharing</option>
                    <option value="workplace_improvement">Workplace Improvement</option>
                    <option value="career_goal">Career Goal</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <NativeSelect
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value as ActionStatus)}
                  >
                    <option value="intended">Intended</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="space-y-1">
                <Label>What action did you take?</Label>
                <Textarea
                  rows={3}
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="Describe an insight or workflow change you applied..."
                />
              </div>
              <Button
                disabled={!hasContact || !activeEventId || !actionDesc.trim() || logActionMutation.isPending}
                onClick={() => logActionMutation.mutate()}
              >
                {logActionMutation.isPending ? "Saving..." : "Log Action"}
              </Button>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Connection Type</Label>
                  <NativeSelect
                    value={connType}
                    onChange={(e) => setConnType(e.target.value as ConnectionType)}
                  >
                    <option value="peer">Peer</option>
                    <option value="speaker">Speaker</option>
                    <option value="mentor">Mentor</option>
                    <option value="mentee">Mentee</option>
                    <option value="collaborator">Collaborator</option>
                    <option value="opportunity">Opportunity</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label>Contact Role (optional)</Label>
                  <Input
                    value={connRole}
                    onChange={(e) => setConnRole(e.target.value)}
                    placeholder="e.g. Engineering Lead"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Organisation (optional)</Label>
                  <Input
                    value={connOrg}
                    onChange={(e) => setConnOrg(e.target.value)}
                    placeholder="e.g. FinTech Co"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={connFollowUp}
                    onChange={(e) => setConnFollowUp(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Follow-up conversation held
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={connCollab}
                    onChange={(e) => setConnCollab(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Collaboration started
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={connOpp}
                    onChange={(e) => setConnOpp(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Opportunity discovered
                </label>
              </div>
              <Button
                disabled={!hasContact || !activeEventId || logConnectionMutation.isPending}
                onClick={() => logConnectionMutation.mutate()}
              >
                {logConnectionMutation.isPending ? "Saving..." : "Log Connection"}
              </Button>
            </TabsContent>

            <TabsContent value="outcome" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Outcome Type</Label>
                  <NativeSelect
                    value={outcomeType}
                    onChange={(e) => setOutcomeType(e.target.value as OutcomeType)}
                  >
                    <option value="productivity_gain">Productivity Gain</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="mentorship">Mentorship</option>
                    <option value="career_advancement">Career Advancement</option>
                    <option value="workplace_policy">Workplace Policy / Standard</option>
                    <option value="knowledge_transfer">Knowledge Transfer</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label>Supporting Reference URL (optional)</Label>
                  <Input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://... (marks as Documented)"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Outcome Description</Label>
                <Textarea
                  rows={3}
                  value={outcomeDesc}
                  onChange={(e) => setOutcomeDesc(e.target.value)}
                  placeholder="Describe the professional or workplace outcome achieved..."
                />
              </div>
              <Button
                disabled={!hasContact || !activeEventId || !outcomeDesc.trim() || logOutcomeMutation.isPending}
                onClick={() => logOutcomeMutation.mutate()}
              >
                {logOutcomeMutation.isPending ? "Saving..." : "Log Outcome"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
