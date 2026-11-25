import * as React from "react";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { AssessmentProvider } from "@/features/assessments/context/assessment-context";
import { ErrorBoundary } from "@/components/feedback/states";

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AssessmentProvider>
      <ParticipantShell>
        <ErrorBoundary fallbackTitle="Participant Portal Error">{children}</ErrorBoundary>
      </ParticipantShell>
    </AssessmentProvider>
  );
}
