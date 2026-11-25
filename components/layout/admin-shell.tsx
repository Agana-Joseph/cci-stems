"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBarChart2,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Menu,
  Network,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard Home", icon: LayoutDashboard, exact: true },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/participants", label: "Participants", icon: Users },
      { href: "/admin/attendance", label: "Attendance", icon: UserCheck },
    ],
  },
  {
    label: "Instrument Design",
    items: [
      { href: "/admin/question-cards", label: "Question Cards", icon: Sparkles },
      { href: "/admin/questions", label: "Question Bank", icon: HelpCircle },
      { href: "/admin/questionnaires", label: "Questionnaires", icon: ClipboardList },
      { href: "/admin/assessments", label: "Assessments", icon: ClipboardCheck },
    ],
  },
  {
    label: "Impact Intelligence",
    items: [
      { href: "/admin/scoring", label: "Scoring Config", icon: Scale },
      { href: "/admin/networking", label: "Networking", icon: Network },
      { href: "/admin/follow-ups", label: "Follow-Ups", icon: Layers },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart2 },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const renderNav = (onNavigate?: () => void) => (
    <nav aria-label="Administration navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-foreground">CCI STEM Connect</p>
            <p className="text-[11px] text-muted-foreground">Impact Intelligence Admin</p>
          </div>
        </div>
        {renderNav()}
        <div className="border-t border-border p-3">
          <Link
            href="/assessment"
            className="flex items-center justify-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open Participant Portal
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-card shadow-elevated">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-display text-sm font-bold">CCI STEM Admin</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNav(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">
                Admin proxy active (server-side <code className="font-mono">X-API-Key</code>).
                Enforce deployment-level access control in production.
              </span>
              <span className="sm:hidden">Deployment-gated Admin</span>
            </div>
          </div>

          <Link
            href="/assessment"
            className="text-xs font-medium text-primary hover:underline lg:hidden"
          >
            Participant Portal
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
