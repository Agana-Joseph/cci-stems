import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { ErrorBoundary } from "@/components/feedback/states";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <ErrorBoundary fallbackTitle="Administration Dashboard Error">{children}</ErrorBoundary>
    </AdminShell>
  );
}
