import * as React from "react";
import { FollowUpStageForm } from "@/features/follow-ups/components/follow-up-stage-form";
import { Skeleton } from "@/components/ui/tabs-and-progress";

export default function FollowUp90DaysPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <FollowUpStageForm
        config={{
          stageCode: "90_day",
          title: "90-Day Follow-Up Assessment",
          subtitle:
            "Capture tangible outcomes, sustained professional changes, completed collaborations, and long-term event value.",
          focusAreas: [
            "Tangible outcomes",
            "Sustained professional changes",
            "Completed collaborations",
            "Career or workplace improvements",
            "Long-term event value",
          ],
        }}
      />
    </React.Suspense>
  );
}
