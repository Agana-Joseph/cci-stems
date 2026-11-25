"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, FileBarChart2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";
import { formatDateTime } from "@/lib/utils/format";

export default function AssessmentSuccessPage() {
  const { submission, resetSession } = useAssessmentContext();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card className="overflow-hidden border-emerald-200/80 shadow-elevated">
        <div className="h-1.5 bg-emerald-600" />
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="success">Submission Confirmed</Badge>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Thank you for sharing your experience.
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your insights will help us understand the value CCI STEM Connect created and how the
              conversations, connections, and ideas from the event continue to influence
              professional growth.
            </p>
          </div>

          {submission && (
            <div className="mx-auto max-w-md rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Reference ID</span>
                <span className="font-mono font-medium text-foreground">
                  {submission.id.slice(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-emerald-700">{submission.status}</span>
              </div>
              {submission.submitted_at && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Submitted At</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(submission.submitted_at)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">30 / 60 / 90-Day Follow-Ups</CardTitle>
            <CardDescription>
              Real impact unfolds over weeks and months. We will invite you to share brief updates
              at 30, 60, and 90 days on ideas applied, connections nurtured, and career outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/follow-up"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Explore follow-up check-ins <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <FileBarChart2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Personal Impact Report</CardTitle>
            <CardDescription>
              Impact scores are calculated server-side once sufficient pillar data has been
              validated. You can check authorised report availability at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/impact-report"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View personal impact report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/follow-up">
            <Sparkles className="h-4 w-4" />
            Log an Action or Connection
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            resetSession();
          }}
          asChild
        >
          <Link href="/assessment">Return to Welcome Page</Link>
        </Button>
      </div>
    </div>
  );
}
