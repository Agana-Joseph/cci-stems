"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, UserCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { participantProfileSchema } from "@/lib/validation/schemas";
import { useAssessmentContext } from "@/features/assessments/context/assessment-context";

type ProfileFormValues = z.infer<typeof participantProfileSchema>;

export default function AssessmentProfilePage() {
  const router = useRouter();
  const { phone, email, lookupCompleted, lookupMessage, profile, setProfile } =
    useAssessmentContext();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(participantProfileSchema),
    defaultValues: {
      full_name: profile.full_name,
      email: profile.email || email,
      phone: profile.phone || phone,
      current_role: profile.current_role,
      industry: profile.industry,
      organisation: profile.organisation,
      years_of_experience:
        profile.years_of_experience !== null ? String(profile.years_of_experience) : "",
      reason_for_attending: profile.reason_for_attending,
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    const parsedYoe =
      values.years_of_experience && values.years_of_experience.trim() !== ""
        ? Number.parseInt(values.years_of_experience, 10)
        : null;
    setProfile({
      full_name: values.full_name,
      email: values.email || email,
      phone: values.phone || phone,
      current_role: values.current_role,
      industry: values.industry,
      organisation: values.organisation || "",
      years_of_experience: parsedYoe !== null && !Number.isNaN(parsedYoe) ? parsedYoe : null,
      reason_for_attending: values.reason_for_attending || "",
    });
    router.push("/assessment/questions");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 2 of 4 &middot; Profile Confirmation
        </p>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Confirm Your Professional Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Review or update your professional details below. Any changes will be saved alongside your
          assessment submission.
        </p>
      </div>

      {!lookupCompleted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You have not entered your registered contact yet.{" "}
          <button
            type="button"
            onClick={() => router.push("/assessment/verify")}
            className="font-semibold underline"
          >
            Return to identification
          </button>
        </div>
      )}

      {lookupMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-sm text-foreground">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{lookupMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Details</CardTitle>
          <CardDescription>
            Contact information provided in the previous step is pre-filled for convenience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="full_name">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="e.g. Adaeze Okafor"
                  {...form.register("full_name")}
                />
                {form.formState.errors.full_name && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@organisation.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+2348012345678"
                  {...form.register("phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_role">
                  Current professional role <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="current_role"
                  placeholder="e.g. Senior Data Engineer"
                  {...form.register("current_role")}
                />
                {form.formState.errors.current_role && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {form.formState.errors.current_role.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industry">
                  Industry <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="industry"
                  placeholder="e.g. FinTech, Healthcare, Energy"
                  {...form.register("industry")}
                />
                {form.formState.errors.industry && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {form.formState.errors.industry.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organisation">Organisation (optional)</Label>
                <Input
                  id="organisation"
                  placeholder="Company or institution"
                  {...form.register("organisation")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="years_of_experience">Years of professional experience</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="e.g. 5"
                  {...form.register("years_of_experience")}
                />
                {form.formState.errors.years_of_experience && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {form.formState.errors.years_of_experience.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reason_for_attending">Reason for attending</Label>
                <Textarea
                  id="reason_for_attending"
                  rows={3}
                  placeholder="What inspired you to attend CCI STEM Connect?"
                  {...form.register("reason_for_attending")}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/assessment/verify")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="submit">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
