"use client";

import * as React from "react";
import { Award, CalendarClock, CheckCircle2, Network, Rocket, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/tabs-and-progress";
import { EvidenceBadge } from "@/components/feedback/states";
import { formatDate, formatEnumLabel, formatPercent, formatScore, formatStageLabel } from "@/lib/utils/format";
import type { EventRead, ParticipantImpactSummary, ParticipantRead } from "@/types/api";

export function ParticipantImpactReportView({
  participant,
  event,
  impact,
}: {
  participant: ParticipantRead;
  event?: EventRead | null;
  impact: ParticipantImpactSummary;
}) {
  const latestScore = impact.latest_scores;
  const hasOverallScore =
    latestScore &&
    latestScore.overall_score !== null &&
    latestScore.score_status !== "insufficient_data" &&
    latestScore.score_status !== "missing";

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-1.5 bg-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Badge variant="default">Personal Impact Report</Badge>
              <h2 className="font-display text-2xl font-bold text-foreground">
                {participant.full_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[participant.current_role, participant.organisation, participant.industry]
                  .filter(Boolean)
                  .join(" · ") || "Professional Profile"}
              </p>
              {event && (
                <p className="text-xs text-muted-foreground">
                  Event: <strong className="text-foreground">{event.title}</strong> ({formatDate(event.event_date)})
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/40 px-5 py-4 text-left sm:min-w-[200px] sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall Impact Score
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">
                {hasOverallScore ? formatScore(latestScore.overall_score, 1) : "Insufficient Data"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestScore?.completeness_ratio !== undefined &&
                latestScore?.completeness_ratio !== null
                  ? `Data completeness: ${formatPercent(latestScore.completeness_ratio)}`
                  : latestScore
                    ? `Status: ${formatEnumLabel(latestScore.score_status)}`
                    : "Awaiting backend score calculation"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Six Measurement Pillars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            Six Measurement Pillar Scores
          </CardTitle>
          <CardDescription>
            Calculated exclusively by the backend scoring engine. Missing pillars are never treated
            as zero; weights renormalise automatically when data is partial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!latestScore?.pillar_scores || latestScore.pillar_scores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pillar scores have been calculated yet for this participant.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {latestScore.pillar_scores.map((pillar) => {
                const isMissing =
                  pillar.normalised_score === null ||
                  pillar.status === "missing" ||
                  pillar.status === "insufficient_data";
                return (
                  <div
                    key={pillar.pillar_id}
                    className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {pillar.pillar_name ?? formatEnumLabel(pillar.pillar_code)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Weight: {formatPercent(pillar.effective_weight ?? pillar.weight)}
                          {pillar.weight_renormalised ? " (renormalised)" : ""}
                        </p>
                      </div>
                      <Badge variant={isMissing ? "secondary" : "default"}>
                        {isMissing ? "No data" : `${formatScore(pillar.normalised_score, 1)} / 100`}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={isMissing ? 0 : (pillar.normalised_score ?? 0)}
                      max={100}
                      indicatorClassName={isMissing ? "bg-slate-300" : "bg-primary"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions & Networking */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-primary" />
              Actions Taken
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Total Logged</p>
              <p className="mt-1 text-xl font-bold">{impact.actions_summary?.total ?? 0}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-800">Completed</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">
                {impact.actions_summary?.completed ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs text-sky-800">In Progress</p>
              <p className="mt-1 text-xl font-bold text-sky-800">
                {impact.actions_summary?.in_progress ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-800">Intended</p>
              <p className="mt-1 text-xl font-bold text-amber-800">
                {impact.actions_summary?.intended ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4 text-primary" />
              Networking Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Connections Reported</p>
              <p className="mt-1 text-xl font-bold">{impact.connections_summary?.total ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Follow-Ups Held</p>
              <p className="mt-1 text-xl font-bold">
                {impact.connections_summary?.follow_up_conversations ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-800">Collaborations</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">
                {impact.connections_summary?.collaborations ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs text-sky-800">Opportunities</p>
              <p className="mt-1 text-xl font-bold text-sky-800">
                {impact.connections_summary?.opportunities ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reported, Documented & Verified Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Reported, Documented &amp; Verified Outcomes
          </CardTitle>
          <CardDescription>
            Every outcome is classified strictly by evidence level to distinguish self-reported
            reflections from documented and verified impact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <EvidenceBadge classification="self_reported" />
              <p className="mt-2 text-2xl font-bold text-foreground">
                {impact.outcomes_by_evidence?.self_reported ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4">
              <EvidenceBadge classification="documented" />
              <p className="mt-2 text-2xl font-bold text-foreground">
                {impact.outcomes_by_evidence?.documented ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <EvidenceBadge classification="verified" />
              <p className="mt-2 text-2xl font-bold text-foreground">
                {impact.outcomes_by_evidence?.verified ?? 0}
              </p>
            </div>
          </div>

          {impact.outcomes_by_evidence?.items && impact.outcomes_by_evidence.items.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border">
              {impact.outcomes_by_evidence.items.map((item, idx) => (
                <div key={item.id ?? idx} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.description || formatEnumLabel(item.outcome_type)}
                    </p>
                    {item.outcome_type && (
                      <p className="text-xs text-muted-foreground">
                        {formatEnumLabel(item.outcome_type)}
                      </p>
                    )}
                  </div>
                  <EvidenceBadge classification={item.evidence_classification} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-Up Assessment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            Follow-Up Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!impact.follow_up_progress || impact.follow_up_progress.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-up checkpoints have been scheduled yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {impact.follow_up_progress.map((fu, idx) => (
                <div
                  key={fu.follow_up_id ?? idx}
                  className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {formatStageLabel(fu.follow_up_stage)}
                    </span>
                    <Badge
                      variant={
                        fu.status === "completed"
                          ? "success"
                          : fu.status === "overdue"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {formatEnumLabel(fu.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fu.completed_at
                      ? `Completed: ${formatDate(fu.completed_at)}`
                      : fu.due_date
                        ? `Due: ${formatDate(fu.due_date)}`
                        : "Schedule pending"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <span>
          Individual impact reports are private and never used to rank participants publicly.
        </span>
      </div>
    </div>
  );
}
