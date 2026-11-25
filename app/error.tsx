"use client";

import { ErrorAlert } from "@/components/feedback/states";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container max-w-2xl py-16">
      <ErrorAlert
        error={error}
        title="An unexpected application error occurred"
        onRetry={reset}
      />
    </div>
  );
}
