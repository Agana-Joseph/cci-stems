import * as React from "react";
import { FollowUpStageForm } from "@/features/follow-ups/components/follow-up-stage-form";
import { Skeleton } from "@/components/ui/tabs-and-progress";

export default function FollowUp30DaysPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <FollowUpStageForm
        config={{
          stageCode: "30_day",
          title: "30-Day Follow-Up Assessment",
          subtitle:
            "Reflect on early actions taken, connections followed up, and initial habits or ideas put into practice.",
          focusAreas: [
            "Ideas applied",
            "New connections followed up",
            "Knowledge shared",
            "Professional habits changed",
            "Early outcomes",
          ],
        }}
      />
    </React.Suspense>
  );
}
