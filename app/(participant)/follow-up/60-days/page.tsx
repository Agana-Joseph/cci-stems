import * as React from "react";
import { FollowUpStageForm } from "@/features/follow-ups/components/follow-up-stage-form";
import { Skeleton } from "@/components/ui/tabs-and-progress";

export default function FollowUp60DaysPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <FollowUpStageForm
        config={{
          stageCode: "60_day",
          title: "60-Day Follow-Up Assessment",
          subtitle:
            "Share progress on professional goals, collaborations, mentorship, and emerging workplace improvements.",
          focusAreas: [
            "Continued application",
            "Progress on professional goals",
            "Collaboration",
            "Mentorship",
            "Workplace improvements",
            "Emerging opportunities",
          ],
        }}
      />
    </React.Suspense>
  );
}
