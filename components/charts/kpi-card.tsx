import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CoverageBadge } from "@/components/feedback/states";
import type { CoverageLevel } from "@/types/api";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  subtitle,
  coverageLevel,
  sampleSize,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  coverageLevel?: CoverageLevel | null;
  sampleSize?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  accentClassName?: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                accentClassName
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {(coverageLevel || typeof sampleSize === "number") && (
          <div className="pt-1">
            <CoverageBadge level={coverageLevel} sampleSize={sampleSize} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
