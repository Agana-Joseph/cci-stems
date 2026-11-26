"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Mail, Phone, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { ErrorAlert } from "@/components/feedback/states";
import { participantVerifySchema } from "@/lib/validation/schemas";
import { participantsApi } from "@/lib/api";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";

type VerifyFormValues = z.infer<typeof participantVerifySchema>;

export default function AssessmentVerifyPage() {
  const router = useRouter();
  const { isHydrated, eventId, phone, email, profile, setIdentification, updateContactDraft } =
    useAssessmentContext();
  const [otpPending, setOtpPending] = React.useState(false);
  const [otpNotice, setOtpNotice] = React.useState<string | null>(null);
  const didSyncHydratedRef = React.useRef(false);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(participantVerifySchema),
    defaultValues: {
      phone: profile.phone || phone || "",
      email: profile.email || email || "",
    },
  });

  React.useEffect(() => {
    if (!isHydrated || didSyncHydratedRef.current) return;
    didSyncHydratedRef.current = true;
    if (!form.formState.isDirty) {
      form.reset({
        phone: profile.phone || phone || "",
        email: profile.email || email || "",
      });
    }
  }, [isHydrated, profile.phone, profile.email, phone, email, form]);

  React.useEffect(() => {
    if (!isHydrated) return;
    const subscription = form.watch((values, { type }) => {
      if (type !== "change") return;
      updateContactDraft({
        phone: values.phone ?? "",
        email: values.email ?? "",
      });
    });
    return () => subscription.unsubscribe();
  }, [isHydrated, form, updateContactDraft]);

  const lookupMutation = useMutation({
    mutationFn: async (values: VerifyFormValues) => {
      return participantsApi.lookupPublic({
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        event_id: eventId ?? undefined,
      });
    },
    onSuccess: (res, values) => {
      setIdentification({
        phone: values.phone?.trim() || "",
        email: values.email?.trim() || "",
        message: res.data.message,
      });

      if (res.data.otp_required) {
        setOtpPending(true);
        setOtpNotice(
          res.data.message ||
            "A verification code has been issued. Enter the code once OTP verification is enabled on the backend."
        );
        return;
      }

      router.push("/assessment/profile");
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 1 of 4 &middot; Identification
        </p>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Let&apos;s find your event record.
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the phone number or email address you used when registering for CCI STEM Connect.
          You only need to provide one.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Contact Information</CardTitle>
          <CardDescription>
            Phone numbers are normalised automatically (default region Nigeria +234). For your
            privacy, this check does not reveal whether a contact is listed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => lookupMutation.mutate(values))}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 08012345678 or +2348012345678"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 shrink text-xs font-medium uppercase text-muted-foreground">
                or / and
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@organisation.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {lookupMutation.isError && (
              <ErrorAlert
                error={lookupMutation.error}
                title="Unable to continue"
                onRetry={() => lookupMutation.reset()}
              />
            )}

            {otpPending && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <p className="font-medium">Verification step required</p>
                <p className="mt-1 text-sky-800">{otpNotice}</p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Your submission will be verified server-side against your registration record when
                completed. Rate limits apply to protect attendee privacy.
              </span>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const current = form.getValues();
                  updateContactDraft({
                    phone: current.phone ?? "",
                    email: current.email ?? "",
                  });
                  router.push("/assessment");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={lookupMutation.isPending}>
                {lookupMutation.isPending ? "Verifying..." : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
