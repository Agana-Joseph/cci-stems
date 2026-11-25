"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Info, Plus, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminEventSelector } from "@/components/layout/admin-event-selector";
import { CardGridSkeleton, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { getReadableErrorMessage, scoringApi } from "@/lib/api";
import { queryKeys, useEvents, usePillars } from "@/hooks/use-queries";
import { formatDateTime, formatEnumLabel, formatPercent, formatScore } from "@/lib/utils/format";

export default function AdminScoringPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const activeEventId = selectedEventId || eventsQuery.data?.[0]?.id || "";

  const pillarsQuery = usePillars();
  const frameworksQuery = useQuery({
    queryKey: queryKeys.scoringFrameworks,
    queryFn: async () => (await scoringApi.listFrameworks()).data,
  });

  const eventScoresQuery = useQuery({
    queryKey: ["scoring", "events", activeEventId],
    queryFn: async () => (await scoringApi.getEventScores(activeEventId, { latest_only: true })).data,
    enabled: Boolean(activeEventId),
  });

  // Create versioned framework modal
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fwCode, setFwCode] = React.useState("");
  const [fwName, setFwName] = React.useState("");
  const [fwDesc, setFwDesc] = React.useState("");
  const [weights, setWeights] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (pillarsQuery.data && Object.keys(weights).length === 0) {
      const initial: Record<string, number> = {};
      pillarsQuery.data.forEach((p) => {
        initial[p.id] = p.default_weight;
      });
      setWeights(initial);
    }
  }, [pillarsQuery.data, weights]);

  const weightSum = Object.values(weights).reduce((acc, w) => acc + (Number(w) || 0), 0);

  const createFrameworkMutation = useMutation({
    mutationFn: () =>
      scoringApi.createFramework({
        code: fwCode.trim(),
        name: fwName.trim(),
        description: fwDesc.trim() || null,
        is_active: true,
        dimensions: Object.entries(weights).map(([pillar_id, weight]) => ({
          pillar_id,
          weight: Number(weight),
        })),
        rules: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoringFrameworks });
      toast.success("Scoring framework version created.");
      setCreateOpen(false);
      setFwCode("");
      setFwName("");
      setFwDesc("");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const calcEventMutation = useMutation({
    mutationFn: () => scoringApi.calculateEvent(activeEventId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["scoring", "events", activeEventId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", activeEventId] });
      toast.success(
        `Processed ${res.data.participants_processed} participants (${res.data.scores_calculated} scored).`
      );
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Scoring Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect six-pillar weights, versioned scoring frameworks, and server-side score
            calculation history.
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
            disabled={!activeEventId || calcEventMutation.isPending}
            onClick={() => calcEventMutation.mutate()}
          >
            <Calculator className="h-4 w-4" />
            {calcEventMutation.isPending ? "Calculating..." : "Calculate Event Scores"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Framework Version
          </Button>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
        <div className="space-y-1">
          <p className="font-semibold">Server-Side Scoring &amp; Missing-Pillar Renormalisation</p>
          <p className="text-xs leading-relaxed text-sky-900">
            All score calculations and weight validations (sum must equal 1.0) are enforced
            exclusively by the FastAPI backend. Missing pillars are never treated as zero—they
            return <code className="font-mono">normalised_score: null</code> and remaining pillar
            weights are automatically renormalised.
          </p>
        </div>
      </div>

      {/* Six Pillars & Default Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" />
            Six Measurement Pillars &amp; Default Weights
          </CardTitle>
          <CardDescription>Loaded directly from GET /api/v1/pillars</CardDescription>
        </CardHeader>
        <CardContent>
          {pillarsQuery.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : pillarsQuery.isError ? (
            <ErrorAlert error={pillarsQuery.error} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4">Pillar</th>
                    <th className="py-2.5 pr-4">Impact Category</th>
                    <th className="py-2.5 text-right">Default Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(pillarsQuery.data ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="capitalize">
                          {formatEnumLabel(p.impact_category)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-primary">
                        {formatPercent(p.default_weight)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Framework Versions */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Scoring Framework Versions</h2>
        {frameworksQuery.isError && <ErrorAlert error={frameworksQuery.error} />}
        {frameworksQuery.isLoading ? (
          <CardGridSkeleton count={2} />
        ) : (frameworksQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No scoring frameworks returned"
            description="Create a versioned scoring framework with pillar weights summing to 1.0."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(frameworksQuery.data ?? []).map((fw) => (
              <Card key={fw.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{fw.name}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">v{fw.version}</Badge>
                      <Badge variant={fw.is_active ? "success" : "secondary"}>
                        {fw.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs">{fw.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    {fw.dimensions.map((d, i) => (
                      <div key={d.id ?? i} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {d.pillar_name ?? d.pillar_code ?? d.pillar_id}
                        </span>
                        <span className="font-mono font-medium">{formatPercent(d.weight)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="border-t border-border pt-2 text-muted-foreground">
                    Configured scoring rules: <strong>{fw.rules?.length ?? 0}</strong>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Calculation History for Event */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Score Calculation History</CardTitle>
          <CardDescription>
            Latest server-calculated participant scores for the selected event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventScoresQuery.isError ? (
            <ErrorAlert error={eventScoresQuery.error} />
          ) : !eventScoresQuery.data || eventScoresQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scores calculated yet for this event. Click &ldquo;Calculate Event Scores&rdquo;
              above to run server-side scoring.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Participant ID</th>
                    <th className="py-2 pr-4">Overall Score</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Renormalised</th>
                    <th className="py-2">Calculated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {eventScoresQuery.data.slice(0, 25).map((sc) => (
                    <tr key={sc.id}>
                      <td className="py-2.5 pr-4 font-mono">{sc.participant_id.slice(0, 8)}...</td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {formatScore(sc.overall_score, 1)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={sc.score_status === "calculated" ? "success" : "warning"}
                          className="capitalize"
                        >
                          {formatEnumLabel(sc.score_status)}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">{sc.weight_renormalised ? "Yes" : "No"}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDateTime(sc.calculated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Framework Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Scoring Framework Version</DialogTitle>
            <DialogDescription>
              Weights must sum to 1.00 (validated strictly by the backend).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input
                  value={fwCode}
                  onChange={(e) => setFwCode(e.target.value)}
                  placeholder="cci_stem_v2"
                />
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={fwName}
                  onChange={(e) => setFwName(e.target.value)}
                  placeholder="CCI STEM Impact Framework v2"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={fwDesc} onChange={(e) => setFwDesc(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Pillar Weights (Decimal 0.0 – 1.0)</span>
                <span
                  className={
                    Math.abs(weightSum - 1) < 0.001 ? "text-emerald-700" : "text-destructive"
                  }
                >
                  Sum: {weightSum.toFixed(2)} (must equal 1.00)
                </span>
              </div>
              {(pillarsQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{p.name}</span>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    className="w-24 text-right font-mono"
                    value={weights[p.id] ?? p.default_weight}
                    onChange={(e) =>
                      setWeights((prev) => ({
                        ...prev,
                        [p.id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!fwCode.trim() || !fwName.trim() || createFrameworkMutation.isPending}
              onClick={() => createFrameworkMutation.mutate()}
            >
              {createFrameworkMutation.isPending ? "Creating..." : "Create Framework"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
