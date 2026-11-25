"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBarChart2,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Menu,
  MessageSquareQuote,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Core",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/participants", label: "Participants", icon: Users },
      { href: "/admin/assessments", label: "Assessments", icon: ClipboardCheck },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquareQuote },
      { href: "/admin/question-cards", label: "Question Cards", icon: Sparkles },
    ],
  },
  {
    label: "Impact Intelligence",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/networking", label: "Networking", icon: Network },
      { href: "/admin/follow-ups", label: "Follow-ups", icon: Layers },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart2 },
    ],
  },
  {
    label: "Operations & Setup",
    items: [
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/attendance", label: "Attendance", icon: UserCheck },
      { href: "/admin/questions", label: "Question Bank", icon: HelpCircle },
      { href: "/admin/questionnaires", label: "Questionnaires", icon: ClipboardList },
      { href: "/admin/scoring", label: "Scoring Config", icon: Scale },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  admin: "Overview",
  participants: "Participants",
  assessments: "Assessments",
  feedback: "Qualitative Feedback",
  "question-cards": "Question Cards",
  analytics: "Analytics & Impact",
  networking: "Networking Insights",
  "follow-ups": "Follow-Up Monitoring",
  reports: "Reports & Exports",
  events: "Events",
  attendance: "Attendance",
  questions: "Question Bank",
  questionnaires: "Questionnaires",
  scoring: "Scoring Configuration",
  settings: "Settings",
};

function buildBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];
  const crumbs: Array<{ label: string; href: string }> = [];
  let acc = "";
  segments.forEach((seg, idx) => {
    acc += `/${seg}`;
    const known = ROUTE_TITLES[seg];
    if (known) {
      crumbs.push({ label: idx === 0 ? "Admin" : known, href: acc });
    } else {
      const parent = segments[idx - 1];
      const detailLabel =
        parent === "participants"
          ? "Participant Profile"
          : parent === "assessments"
            ? "Submission Review"
            : parent === "events"
              ? "Event Details"
              : `${seg.slice(0, 8)}...`;
      crumbs.push({ label: detailLabel, href: acc });
    }
  });
  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const breadcrumbs = React.useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const pageTitle = React.useMemo(() => {
    if (pathname === "/admin") return "Dashboard Overview";
    const last = breadcrumbs[breadcrumbs.length - 1];
    return last?.label ?? "Admin Dashboard";
  }, [pathname, breadcrumbs]);

  const renderNav = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav aria-label="Administration navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}
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
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring",
                  isCollapsed && "justify-center px-2",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
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
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card transition-all duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  CCI STEM Connect
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Impact Intelligence
                </p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="h-8 w-8 text-muted-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center border-b border-border py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="h-8 w-8 text-muted-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {renderNav(collapsed)}

        {/* Administrator Access / Profile Section */}
        <div className="border-t border-border p-3">
          {!collapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-semibold text-foreground">
                    Admin Workspace
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Server API-Key Proxy
                  </p>
                </div>
              </div>
              <Link
                href="/assessment"
                className="flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Open Participant Portal
              </Link>
              <p className="text-center text-[10px] tracking-wide text-muted-foreground/70">
                CCI STEM Connect &middot; JoJeGa
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                title="Admin Workspace — Server API-Key Proxy"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
          )}
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
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Compass className="h-4 w-4" />
                </div>
                <span className="font-display text-sm font-bold">CCI STEM Admin</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNav(false, () => setMobileOpen(false))}
            <div className="border-t border-border p-3">
              <Link
                href="/assessment"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground"
              >
                Open Participant Portal
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="truncate font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="truncate hover:text-primary hover:underline">
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
              <p className="truncate font-display text-sm font-semibold text-foreground sm:hidden">
                {pageTitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Deployment-Gated Access
            </span>
            <Link
              href="/admin/settings"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
