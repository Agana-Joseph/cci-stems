"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Eye,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardGridSkeleton, ConfirmDialog, EmptyState, ErrorAlert } from "@/components/feedback/states";
import { QuestionField } from "@/features/assessments/components/question-field";
import { getReadableErrorMessage, questionnairesApi } from "@/lib/api";
import { useEvents, useQuestionnaire, useQuestionnaires, useQuestions } from "@/hooks/use-queries";
import { formatEnumLabel } from "@/lib/utils/format";
import type { QuestionnaireRead, QuestionnaireType } from "@/types/api";

interface DraftSection {
  code: string;
  title: string;
  description: string;
}

interface DraftAttachedQuestion {
  question_id: string;
  section_code: string;
  is_required_override: boolean | null;
}

export default function AdminQuestionnairesPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useEvents({ limit: 50 });
  const questionnairesQuery = useQuestionnaires();
  const questionsQuery = useQuestions({ include_archived: false });

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [publishTarget, setPublishTarget] = React.useState<QuestionnaireRead | null>(null);

  const previewDetailQuery = useQuestionnaire(previewId);

  // Builder state
  const [code, setCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [qType, setQType] = React.useState<QuestionnaireType>("post_event");
  const [sections, setSections] = React.useState<DraftSection[]>([
    { code: "section_a", title: "Section A — Professional Background", description: "" },
    { code: "section_b", title: "Section B — Event Engagement", description: "" },
  ]);
  const [attached, setAttached] = React.useState<DraftAttachedQuestion[]>([]);
  const [selectedQuestionToAdd, setSelectedQuestionToAdd] = React.useState("");
  const [selectedSectionForAdd, setSelectedSectionForAdd] = React.useState("section_a");

  const createMutation = useMutation({
    mutationFn: () =>
      questionnairesApi.create({
        code: code.trim(),
        title: title.trim(),
        description: description.trim() || null,
        event_id: eventId || null,
        questionnaire_type: qType,
        sections: sections.map((s, idx) => ({
          code: s.code.trim() || `section_${idx + 1}`,
          title: s.title.trim(),
          description: s.description.trim() || null,
          display_order: idx + 1,
        })),
        questions: attached.map((q, idx) => ({
          question_id: q.question_id,
          section_code: q.section_code,
          is_required_override: q.is_required_override,
          display_order: idx + 1,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
      toast.success("Questionnaire created in draft status.");
      setBuilderOpen(false);
      setCode("");
      setTitle("");
      setDescription("");
      setAttached([]);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => questionnairesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
      toast.success("Questionnaire published and live for participants.");
      setPublishTarget(null);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const moveItem = <T,>(arr: T[], idx: number, dir: -1 | 1): T[] => {
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return arr;
    const copy = [...arr];
    const tmp = copy[idx]!;
    copy[idx] = copy[target]!;
    copy[target] = tmp;
    return copy;
  };

  const questionLookup = React.useMemo(() => {
    const map = new Map<string, string>();
    (questionsQuery.data ?? []).forEach((q) => map.set(q.id, q.question_text));
    return map;
  }, [questionsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Questionnaires</h1>
          <p className="text-sm text-muted-foreground">
            Assemble multi-section questionnaires from your Question Bank, preview the experience,
            and publish for post-event or follow-up stages.
          </p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" />
          Build Questionnaire
        </Button>
      </div>

      {questionnairesQuery.isError && <ErrorAlert error={questionnairesQuery.error} />}

      {questionnairesQuery.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (questionnairesQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No questionnaires yet"
          description="Create a post-event or follow-up questionnaire to dynamically drive participant assessments."
          action={<Button onClick={() => setBuilderOpen(true)}>Build Questionnaire</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(questionnairesQuery.data ?? []).map((qn) => (
            <Card key={qn.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      qn.status === "published"
                        ? "success"
                        : qn.status === "draft"
                          ? "warning"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {qn.status}
                  </Badge>
                  <Badge variant="outline">{formatEnumLabel(qn.questionnaire_type)}</Badge>
                </div>
                <CardTitle className="pt-2 text-lg">{qn.title}</CardTitle>
                <CardDescription className="font-mono text-xs">{qn.code}</CardDescription>
                {qn.description && (
                  <p className="text-sm text-muted-foreground">{qn.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewId(qn.id)}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
                {qn.status === "draft" && (
                  <Button size="sm" onClick={() => setPublishTarget(qn)}>
                    <Send className="h-3.5 w-3.5" />
                    Publish
                  </Button>
                )}
                {qn.status === "published" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Live
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Questionnaire Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Questionnaire Builder</DialogTitle>
            <DialogDescription>
              Starts in <code className="font-mono text-xs">draft</code> status. Publish once at
              least one question is attached.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="cci_stem_2026_post_event"
                />
              </div>
              <div className="space-y-1">
                <Label>Assessment Stage / Type</Label>
                <NativeSelect
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionnaireType)}
                >
                  <option value="post_event">Post-Event Assessment</option>
                  <option value="follow_up">Follow-Up (30 / 60 / 90 Day)</option>
                  <option value="reflection">Reflective</option>
                  <option value="custom">Custom</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="CCI STEM Connect 2026 Post-Event Assessment"
                />
              </div>
              <div className="space-y-1">
                <Label>Event (optional)</Label>
                <NativeSelect value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">Global / Unscoped</option>
                  {(eventsQuery.data ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Sections</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSections((prev) => [
                      ...prev,
                      {
                        code: `section_${prev.length + 1}`,
                        title: `Section ${prev.length + 1}`,
                        description: "",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Section
                </Button>
              </div>
              <div className="space-y-2">
                {sections.map((sec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="w-32 font-mono text-xs"
                      value={sec.code}
                      onChange={(e) => {
                        const next = [...sections];
                        next[idx] = { ...sec, code: e.target.value };
                        setSections(next);
                      }}
                    />
                    <Input
                      className="flex-1"
                      value={sec.title}
                      onChange={(e) => {
                        const next = [...sections];
                        next[idx] = { ...sec, title: e.target.value };
                        setSections(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSections((prev) => moveItem(prev, idx, -1))}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSections((prev) => moveItem(prev, idx, 1))}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSections((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Attach Existing Questions */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <Label className="font-semibold">Attach Questions ({attached.length})</Label>
              <div className="grid gap-2 sm:grid-cols-12">
                <NativeSelect
                  className="sm:col-span-6"
                  value={selectedQuestionToAdd}
                  onChange={(e) => setSelectedQuestionToAdd(e.target.value)}
                >
                  <option value="">Select a question from the bank...</option>
                  {(questionsQuery.data ?? []).map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.code}] {q.question_text.slice(0, 70)}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  className="sm:col-span-4"
                  value={selectedSectionForAdd}
                  onChange={(e) => setSelectedSectionForAdd(e.target.value)}
                >
                  {sections.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.title}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  type="button"
                  className="sm:col-span-2"
                  disabled={!selectedQuestionToAdd}
                  onClick={() => {
                    if (attached.some((a) => a.question_id === selectedQuestionToAdd)) {
                      toast.error("Question is already attached.");
                      return;
                    }
                    setAttached((prev) => [
                      ...prev,
                      {
                        question_id: selectedQuestionToAdd,
                        section_code: selectedSectionForAdd || sections[0]?.code || "section_a",
                        is_required_override: null,
                      },
                    ]);
                    setSelectedQuestionToAdd("");
                  }}
                >
                  Attach
                </Button>
              </div>

              {attached.length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {attached.map((item, idx) => (
                    <div
                      key={item.question_id}
                      className="flex items-center justify-between gap-2 p-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {idx + 1}. {questionLookup.get(item.question_id) ?? item.question_id}
                        </p>
                        <p className="text-muted-foreground">Section: {item.section_code}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAttached((prev) => moveItem(prev, idx, -1))}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAttached((prev) => moveItem(prev, idx, 1))}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setAttached((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!code.trim() || !title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create Draft Questionnaire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Preview Dialog */}
      <Dialog open={Boolean(previewId)} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDetailQuery.data?.title ?? "Questionnaire Preview"}</DialogTitle>
            <DialogDescription>{previewDetailQuery.data?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewDetailQuery.isLoading ? (
              <CardGridSkeleton count={2} />
            ) : (previewDetailQuery.data?.questions?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No questions attached yet.</p>
            ) : (
              (previewDetailQuery.data?.questions ?? []).map((item, idx) => (
                <QuestionField
                  key={item.question.id}
                  question={item.question}
                  required={item.is_required_override ?? item.question.is_required}
                  indexLabel={`Q${idx + 1}.`}
                  onChange={() => {}}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(publishTarget)}
        onOpenChange={(o) => !o && setPublishTarget(null)}
        title={`Publish "${publishTarget?.title}"?`}
        description="Publishing makes this questionnaire available to participants for live submissions. Ensure all sections and questions are reviewed."
        confirmLabel="Publish Questionnaire"
        loading={publishMutation.isPending}
        onConfirm={() => publishTarget && publishMutation.mutate(publishTarget.id)}
      />
    </div>
  );
}
