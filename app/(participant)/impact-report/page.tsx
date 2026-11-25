"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Lock, Mail, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/form-controls";
import { ErrorAlert } from "@/components/feedback/states";
import { participantsApi } from "@/lib/api";

export default function PersonalImpactReportPage() {
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submittedNotice, setSubmittedNotice] = React.useState<string | null>(null);

  const lookupMutation = useMutation({
    mutationFn: () =>
      participantsApi.lookupPublic({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onSuccess: (res) => {
      setSubmittedNotice(
        res.data.message ||
          "Your request has been received. Personal impact reports unlock once backend participant session/OTP authorisation is active."
      );
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Badge variant="default">Private Participant View</Badge>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Personal Impact Report
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          View your six measurement pillar scores, actions taken, networking progress, and
          documented outcomes once your identity has been securely verified by the backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" />
            Identity Verification Required
          </CardTitle>
          <CardDescription>
            Enter your registered phone number or email address to check access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rep-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone number
              </Label>
              <Input
                id="rep-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email address
              </Label>
              <Input
                id="rep-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          {lookupMutation.isError && <ErrorAlert error={lookupMutation.error} />}

          <Button
            disabled={(!phone.trim() && !email.trim()) || lookupMutation.isPending}
            onClick={() => lookupMutation.mutate()}
          >
            {lookupMutation.isPending ? "Checking..." : "Request Report Access"}
          </Button>

          {submittedNotice && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
              <p className="font-semibold">Authorised Participant Session Pending</p>
              <p className="mt-1 leading-relaxed text-sky-900">{submittedNotice}</p>
              <p className="mt-2 text-xs text-sky-800">
                Note: In API v1.0, <code className="font-mono">GET /api/v1/reports/participants/&#123;id&#125;</code>{" "}
                is restricted to administrative credentials. The frontend intentionally refuses to
                expose private participant records to unauthorised browser requests until backend
                OTP / signed participant report access is provisioned.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Privacy Guarantee</p>
          <p>
            All contact info shared is kept private and not public.{" "}
            <Link href="/follow-up" className="font-medium text-primary hover:underline">
              Go to Follow-Up Hub
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
