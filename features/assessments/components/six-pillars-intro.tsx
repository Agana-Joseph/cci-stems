"use client";

import * as React from "react";
import { Award, Briefcase, Lightbulb, Network, Rocket, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MeasurementPillarRead } from "@/types/api";

const DEFAULT_SIX_PILLARS = [
  {
    code: "professional_engagement",
    name: "1. Professional Engagement",
    description: "How actively did you participate and interact?",
    icon: Users,
  },
  {
    code: "knowledge_and_insights",
    name: "2. Knowledge and Insights",
    description: "What new perspectives did you gain about productivity and excellence?",
    icon: Lightbulb,
  },
  {
    code: "workplace_excellence",
    name: "3. Workplace Excellence",
    description:
      "Did the event improve your understanding of professional standards and performance?",
    icon: Briefcase,
  },
  {
    code: "recognition_and_rewards",
    name: "4. Recognition and Rewards",
    description:
      "Did you gain insights into how excellence should be recognised and rewarded?",
    icon: Award,
  },
  {
    code: "networking_and_relationships",
    name: "5. Networking and Relationships",
    description: "What meaningful professional connections did you establish?",
    icon: Network,
  },
  {
    code: "post_event_application",
    name: "6. Post-Event Application",
    description: "How are you applying what you learned in your workplace or career?",
    icon: Rocket,
  },
];

const iconPalette = [Users, Lightbulb, Briefcase, Award, Network, Rocket];

export function SixPillarsIntro({
  pillars,
  onContinue,
  onBack,
}: {
  pillars?: MeasurementPillarRead[];
  onContinue: () => void;
  onBack?: () => void;
}) {
  const items =
    pillars && pillars.length > 0
      ? pillars
          .slice()
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((pillar, idx) => {
            const fallback = DEFAULT_SIX_PILLARS[idx];
            return {
              id: pillar.id,
              name: `${idx + 1}. ${pillar.name}`,
              description: pillar.description || fallback?.description || "",
              category: pillar.impact_category,
              Icon: iconPalette[idx % iconPalette.length] ?? Users,
            };
          })
      : DEFAULT_SIX_PILLARS.map((item) => ({
          id: item.code,
          name: item.name,
          description: item.description,
          category: null,
          Icon: item.icon,
        }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="default">Assessment Framework</Badge>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Six Measurement Pillars
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your responses help evaluate the professional value of CCI STEM Connect across six core
          dimensions of engagement, growth, and workplace application.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <Card key={item.id} className="transition-shadow hover:shadow-elevated">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {item.name}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            Back to Profile
          </Button>
        ) : (
          <div />
        )}
        <Button size="lg" onClick={onContinue}>
          Continue to Questionnaire
        </Button>
      </div>
    </div>
  );
}
