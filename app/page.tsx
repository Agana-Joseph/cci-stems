import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CciLogo } from "@/components/ui/cci-logo";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <CciLogo size="md" />
            <div>
              <p className="font-display text-sm font-bold tracking-wide">CCI STEM CONNECT</p>
              <p className="text-[11px] text-muted-foreground">
                Professional Engagement &amp; Impact Measurement
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Admin Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/assessment">Start Assessment</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            CCI STEM CONNECT
          </h1>
          <p className="mt-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Connect. Grow. Improve. Excel.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Connect with professionals, grow your knowledge, improve your work ethic, and build a
            career grounded in Christ-like character, integrity, excellence, and purpose.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/assessment">
                Participate in the Assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/follow-up">Complete a Follow-Up</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle>Participant Assessment</CardTitle>
              <CardDescription>
                Passwordless, mobile-first assessment with dynamic questionnaires and reflective
                question cards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Begin post-event assessment <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle>30 / 60 / 90-Day Follow-Ups</CardTitle>
              <CardDescription>
                Track applied ideas, new connections, collaborations, and documented career
                outcomes over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/follow-up"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open follow-up hub <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle>Administration Dashboard</CardTitle>
              <CardDescription>
                Manage events, rosters, attendance, question banks, scoring frameworks, and
                evidence-graded reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Enter administration workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
