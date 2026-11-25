"use client";

import * as React from "react";
import { AlertCircle, Inbox, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/tabs-and-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReadableErrorMessage } from "@/lib/api/client";
import type { CoverageLevel, EvidenceClassification } from "@/types/api";
import { cn } from "@/lib/utils/cn";

export function ErrorAlert({
  error,
  title = "Unable to load data",
  onRetry,
  className,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const message = typeof error === "string" ? error : getReadableErrorMessage(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-900 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-red-800/90">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 bg-white">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx}>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-9 w-64" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

export function CoverageBadge({
  level,
  sampleSize,
}: {
  level?: CoverageLevel | null;
  sampleSize?: number | null;
}) {
  const map: Record<
    CoverageLevel,
    { label: string; variant: "success" | "info" | "warning" | "secondary" }
  > = {
    high: { label: "High coverage", variant: "success" },
    moderate: { label: "Moderate coverage", variant: "info" },
    low: { label: "Low coverage", variant: "warning" },
    none: { label: "No data", variant: "secondary" },
  };
  const cfg = level ? map[level] : map.none;
  return (
    <Badge variant={cfg.variant} className="gap-1 font-normal">
      <span>{cfg.label}</span>
      {typeof sampleSize === "number" && <span className="opacity-80">(n={sampleSize})</span>}
    </Badge>
  );
}

export function EvidenceBadge({ classification }: { classification?: EvidenceClassification | string | null }) {
  if (classification === "verified") {
    return <Badge variant="success">Verified</Badge>;
  }
  if (classification === "documented") {
    return <Badge variant="info">Documented</Badge>;
  }
  return <Badge variant="warning">Self-Reported</Badge>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallbackTitle?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl py-12">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <h2 className="text-lg font-semibold">
                {this.props.fallbackTitle ?? "Something went wrong"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || "An unexpected interface error occurred."}
              </p>
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
