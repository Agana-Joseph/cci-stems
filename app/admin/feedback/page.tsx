"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquareQuote,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-and-progress";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import {
  useEvents,
  usePillars,
  useQuestionCards,
  useQuestions,
} from "@/hooks/use-queries";
import {
  computeRecurringThemes,
  extractQualitativeFeedback,
  useEventSubmissions,
} from "@/hooks/use-admin-submissions";
import { downloadCsvRows, formatDate } from "@/lib/utils/format";
import { designTokens } from "@/styles/tokens";

export default function AdminFeedbackPage() {
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const [batchSize, setBatchSize] = React.useState(25);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [questionFilter, setQuestionFilter] = React.useState("");
  const [cardFilter, setCardFilter] = React.useState("");
  const [pillarFilter, setPillarFilter] = React.useState("");
  const [industryFilter, setIndustryFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [anonymiseNames, setAnonymiseNames] = React.useState(false);

  const submissionsQuery = useEventSubmissions(activeEventId || null, batchSize);
  const questionsQuery = useQuestions({ include_archived: true });
  const cardsQuery = useQuestionCards(true);
  const pillarsQuery = usePillars();

  const pillarNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (pillarsQuery.data ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [pillarsQuery.data]);

  const allFeedback = React.useMemo(
    () =>
      extractQualitativeFeedback(
        submissionsQuery.data?.submissions ?? [],
        questionsQuery.data ?? [],
        cardsQuery.data ?? []
      ),
    [submissionsQuery.data, questionsQuery.data, cardsQuery.data]
  );

  const uniqueQuestions = React.useMemo(() => {
    const map = new Map<string, string>();
    allFeedback.forEach((f) => map.set(f.questionId, f.questionText));
    return Array.from(map.entries()).map(([id, text]) => ({ id, text }));
  }, [allFeedback]);

  const uniqueIndustries = React.useMemo(() => {
    const set = new Set<string>();
    allFeedback.forEach((f) => {
      if (f.participantIndustry) set.add(f.participantIndustry);
    });
    return Array.from(set).sort();
  }, [allFeedback]);

  const filteredFeedback = React.useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return allFeedback.filter((item) => {
      if (questionFilter && item.questionId !== questionFilter) return false;
      if (cardFilter === "__cards_only__" && !item.isCardQuestion) return false;
      if (cardFilter === "__open_only__" && item.isCardQuestion) return false;
      if (
        cardFilter &&
        cardFilter !== "__cards_only__" &&
        cardFilter !== "__open_only__" &&
        item.cardId !== cardFilter
      ) {
        return false;
      }
      if (pillarFilter && !item.pillarIds.includes(pillarFilter)) return false;
      if (industryFilter && item.participantIndustry !== industryFilter) return false;
      if (dateFrom && item.submittedAt) {
        if (item.submittedAt.slice(0, 10) < dateFrom) return false;
      }
      if (dateTo && item.submittedAt) {
        if (item.submittedAt.slice(0, 10) > dateTo) return false;
      }
      if (kw) {
        const haystack =
          `${item.answerText} ${item.explanationText ?? ""} ${item.questionText} ${item.participantName} ${item.participantIndustry ?? ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [
    allFeedback,
    searchQuery,
    questionFilter,
    cardFilter,
    pillarFilter,
    industryFilter,
    dateFrom,
    dateTo,
  ]);

  const themesData = React.useMemo(
    () => computeRecurringThemes(filteredFeedback, 12),
    [filteredFeedback]
  );

  const responseVolumeByQuestion = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number; isCard: boolean }>();
    filteredFeedback.forEach((item) => {
      const existing = counts.get(item.questionId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(item.questionId, {
          label: item.questionText,
          count: 1,
          isCard: item.isCardQuestion,
        });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [filteredFeedback]);

  const hasMoreParticipants =
    submissionsQuery.data &&
    submissionsQuery.data.totalParticipants > submissionsQuery.data.inspectedParticipantCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Qualitative Feedback &amp; Reflections
          </h1>
          <p className="text-sm text-muted-foreground">
            Read verbatim participant takeaways, open-ended reflections, and Question Card answers.
            Reflective responses are preserved unedited and are not scored unless explicitly
            configured in the backend framework.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminEventSelector
            events={eventsQuery.data ?? []}
            value={activeEventId}
            onChange={setSelectedEventId}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnonymiseNames((v) => !v)}
          >
            {anonymiseNames ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {anonymiseNames ? "Show Names" : "Anonymise"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filteredFeedback.length === 0}
            onClick={() =>
              downloadCsvRows(
                filteredFeedback.map((f, idx) => ({
                  participant: anonymiseNames ? `Participant #${idx + 1}` : f.participantName,
                  industry: f.participantIndustry ?? "",
                  role: f.participantRole ?? "",
                  submitted_at: f.submittedAt ?? "",
                  question: f.questionText,
                  card: f.cardTitle ?? "",
                  response: f.answerText,
                  explanation: f.explanationText ?? "",
                })),
                `cci-stem-feedback-${activeEventId.slice(0, 8)}.csv`
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Search Responses</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keyword, topic, or takeaway..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Question</Label>
            <NativeSelect
              value={questionFilter}
              onChange={(e) => setQuestionFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Qualitative Questions</option>
              {uniqueQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text.slice(0, 75)}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Section / Question Card</Label>
            <NativeSelect
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Sources</option>
              <option value="__cards_only__">Reflective Question Cards Only</option>
              <option value="__open_only__">Open-Ended Assessment Questions Only</option>
              {(cardsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  Card: {c.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Measurement Pillar</Label>
            <NativeSelect
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Pillars</option>
              {(pillarsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Industry</Label>
            <NativeSelect
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">All Industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Submitted From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Submitted To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setSearchQuery("");
                setQuestionFilter("");
                setCardFilter("");
                setPillarFilter("");
                setIndustryFilter("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {submissionsQuery.isError && (
        <ErrorAlert
          error={submissionsQuery.error}
          onRetry={() => submissionsQuery.refetch()}
        />
      )}

      <Tabs defaultValue="individual">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="individual">
              Individual Responses ({filteredFeedback.length})
            </TabsTrigger>
            <TabsTrigger value="themes">Common Themes &amp; Distributions</TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            Sample size: {filteredFeedback.length} qualitative response
            {filteredFeedback.length === 1 ? "" : "s"}
          </span>
        </div>

        <TabsContent value="individual" className="space-y-4">
          {submissionsQuery.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : filteredFeedback.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No qualitative feedback matches these filters"
              description="Submitted written takeaways and reflective question card answers will appear here once participants complete assessments."
            />
          ) : (
            <div className="grid gap-4">
              {filteredFeedback.map((item, idx) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold leading-snug">
                          {item.questionText}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {anonymiseNames
                            ? `Attendee #${idx + 1}`
                            : item.participantName}
                          {item.participantRole ? ` · ${item.participantRole}` : ""}
                          {item.participantIndustry ? ` · ${item.participantIndustry}` : ""}
                          {item.submittedAt ? ` · ${formatDate(item.submittedAt)}` : ""}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.isCardQuestion && (
                          <Badge variant="info" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            {item.cardTitle ?? "Question Card"}
                          </Badge>
                        )}
                        {!item.isScorable && (
                          <Badge variant="secondary">Reflective (Unscored)</Badge>
                        )}
                        {item.pillarIds.map((pid) => (
                          <Badge key={pid} variant="outline" className="text-[11px]">
                            {pillarNameMap.get(pid) ?? "Pillar"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <blockquote className="rounded-lg border-l-2 border-primary bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {item.answerText}
                    </blockquote>
                    {item.explanationText && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Additional context:</strong> {item.explanationText}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/assessments/${item.assessmentId}`}>
                          Full Assessment
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="themes" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recurring Terms in Verbatim Responses</CardTitle>
                <CardDescription>
                  Frequency of key terms across {filteredFeedback.length} filtered responses (purely
                  descriptive—no automated scoring).
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {themesData.length === 0 ? (
                  <EmptyState
                    title="Insufficient text responses"
                    description="Common term frequencies populate once participants submit written reflections."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={themesData} layout="vertical" margin={{ left: 24, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.charts.grid} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="term" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Mentions (Responses)"
                        fill={designTokens.colors.brand.primary}
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response Distribution by Question</CardTitle>
                <CardDescription>
                  Volume of qualitative submissions received per question and reflective card
                </CardDescription>
              </CardHeader>
              <CardContent>
                {responseVolumeByQuestion.length === 0 ? (
                  <EmptyState
                    title="No question distributions yet"
                    description="Submit qualitative responses to view per-question volume."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {responseVolumeByQuestion.map((row, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{row.label}</p>
                          {row.isCard && (
                            <Badge variant="info" className="text-[10px]">
                              Question Card
                            </Badge>
                          )}
                        </div>
                        <Badge variant="default" className="shrink-0">
                          {row.count} response{row.count === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {hasMoreParticipants && (
        <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground sm:flex-row">
          <span>
            Inspecting feedback from the first{" "}
            <strong>{submissionsQuery.data?.inspectedParticipantCount}</strong> of{" "}
            <strong>{submissionsQuery.data?.totalParticipants}</strong> participants.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchSize((prev) => Math.min(prev + 25, 100))}
          >
            Load More Participants
          </Button>
        </div>
      )}
    </div>
  );
}
