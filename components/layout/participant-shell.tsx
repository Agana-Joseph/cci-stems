"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { CciLogo } from "@/components/ui/cci-logo";
import { cn } from "@/lib/utils/cn";

const participantLinks = [
  { href: "/assessment", label: "Assessment" },
  { href: "/follow-up", label: "Follow-Up" },
  { href: "/impact-report", label: "Impact Report" },
];

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/assessment" className="flex items-center gap-2.5 focus-ring rounded-md">
            <CciLogo size="md" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-wide text-foreground">
                CCI STEM CONNECT
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                Impact Measurement Platform
              </p>
            </div>
          </Link>

          <nav aria-label="Participant navigation" className="flex items-center gap-1 sm:gap-2">
            {participantLinks.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm focus-ring",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-border bg-card/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              Responses are transmitted securely and are not persisted in browser storage.
            </span>
          </div>
          <span>
            CCI STEM Connect &middot; Professional Engagement &amp; Impact System
            <span className="ml-1.5 text-muted-foreground/70">&middot; JoJeGa</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
