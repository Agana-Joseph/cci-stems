"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { ConfirmDialog, ErrorAlert } from "@/components/feedback/states";
import { questionFormSchema } from "@/lib/validation/schemas";
import { getReadableErrorMessage, questionsApi } from "@/lib/api";
import { usePillars, useQuestions } from "@/hooks/use-queries";
import { formatEnumLabel } from "@/lib/utils/format";
import type { QuestionOptionRead, QuestionRead, QuestionType } from "@/types/api";

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function AdminQuestionsPage() {
  const queryClient = useQueryClient();
  const [pillarFilter, setPillarFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const pillarsQuery = usePillars();
  const questionsQuery = useQuestions({
    include_archived: includeArchived,
    pillar_id: pillarFilter || undefined,
    question_type: (typeFilter || undefined) as QuestionType | undefined,
  });

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<QuestionRead | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<QuestionRead | null>(null);
  const [selectedPillars, setSelectedPillars] = React.useState<string[]>([]);
  const [options, setOptions] = React.useState<QuestionOptionRead[]>([]);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      code: "",
      question_text: "",
      description: "",
      question_type: "rating_scale",
      category: "engagement",
      is_required: true,
      is_scorable: true,
      allow_explanation: false,
      explanation_prompt: "",
      min_value: "1",
      max_value: "5",
      display_order: 1,
    },
  });

  const watchedType = form.watch("question_type");

  const openCreate = () => {
    setEditing(null);
    setSelectedPillars([]);
    setOptions([]);
    form.reset({
      code: "",
      question_text: "",
      description: "",
      question_type: "rating_scale",
      category: "engagement",
      is_required: true,
      is_scorable: true,
      allow_explanation: false,
      explanation_prompt: "",
      min_value: "1",
      max_value: "5",
      display_order: (questionsQuery.data?.length ?? 0) + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (q: QuestionRead) => {
    setEditing(q);
    setSelectedPillars(q.pillar_ids ?? q.pillars?.map((p) => p.id) ?? []);
    setOptions(q.options ?? []);
    form.reset({
      code: q.code,
      question_text: q.question_text,
      description: q.description ?? "",
      question_type: q.question_type,
      category: q.category ?? "",
      is_required: q.is_required,
      is_scorable: q.is_scorable,
      allow_explanation: q.allow_explanation,
      explanation_prompt: q.explanation_prompt ?? "",
      min_value:
        typeof q.validation_config?.min === "number" ? String(q.validation_config.min) : "",
      max_value:
        typeof q.validation_config?.max === "number" ? String(q.validation_config.max) : "",
      display_order: q.display_order,
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (values: QuestionFormValues) => {
      const hasRange =
        values.question_type === "rating_scale" || values.question_type === "numeric";
      const parsedMin =
        values.min_value && values.min_value.trim() !== "" ? Number(values.min_value) : undefined;
      const parsedMax =
        values.max_value && values.max_value.trim() !== "" ? Number(values.max_value) : undefined;
      const validationConfig =
        hasRange &&
        ((parsedMin !== undefined && !Number.isNaN(parsedMin)) ||
          (parsedMax !== undefined && !Number.isNaN(parsedMax)))
          ? {
              ...(parsedMin !== undefined && !Number.isNaN(parsedMin) ? { min: parsedMin } : {}),
              ...(parsedMax !== undefined && !Number.isNaN(parsedMax) ? { max: parsedMax } : {}),
            }
          : null;

      const payload = {
        code: values.code,
        question_text: values.question_text,
        description: values.description || null,
        question_type: values.question_type,
        category: values.category || null,
        is_required: values.is_required,
        is_scorable: values.is_scorable,
        allow_explanation: values.allow_explanation,
        explanation_prompt: values.explanation_prompt || null,
        validation_config: validationConfig,
        scoring_config: values.is_scorable && validationConfig ? validationConfig : null,
        display_order: values.display_order,
        pillar_ids: selectedPillars,
        options: options
          .filter((o) => o.option_value.trim() && o.option_label.trim())
          .map((o, idx) => ({
            ...o,
            display_order: idx + 1,
            is_active: true,
          })),
      };

      if (editing) {
        return questionsApi.update(editing.id, payload);
      }
      return questionsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success(editing ? "Question updated." : "Question created.");
      setModalOpen(false);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => questionsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question archived safely without altering past responses.");
      setArchiveTarget(null);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const columns: ColumnDef<QuestionRead>[] = [
    {
      accessorKey: "question_text",
      header: "Question",
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium text-foreground">{row.original.question_text}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "question_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{formatEnumLabel(row.original.question_type)}</Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => formatEnumLabel(row.original.category),
    },
    {
      id: "flags",
      header: "Config",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.is_required && <Badge variant="warning">Required</Badge>}
          {row.original.is_scorable && <Badge variant="info">Scorable</Badge>}
          {row.original.is_archived && <Badge variant="secondary">Archived</Badge>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          {!row.original.is_archived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setArchiveTarget(row.original)}
              aria-label="Archive question"
            >
              <Archive className="h-3.5 w-3.5 text-amber-700" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            Create reusable questions mapped to measurement pillars, answer options, and validation
            rules.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Question
        </Button>
      </div>

      {questionsQuery.isError && <ErrorAlert error={questionsQuery.error} />}

      <DataTable
        columns={columns}
        data={questionsQuery.data ?? []}
        isLoading={questionsQuery.isLoading}
        searchPlaceholder="Search question text or code..."
        toolbarExtra={
          <>
            <NativeSelect
              aria-label="Filter by pillar"
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="h-9 w-44 text-xs"
            >
              <option value="">All Pillars</option>
              {(pillarsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-40 text-xs"
            >
              <option value="">All Types</option>
              <option value="rating_scale">Rating Scale</option>
              <option value="single_choice">Single Choice</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="yes_no">Yes / No</option>
              <option value="short_text">Short Text</option>
              <option value="long_text">Long Text</option>
              <option value="numeric">Numeric</option>
              <option value="date">Date</option>
            </NativeSelect>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Show archived
            </label>
          </>
        }
      />

      {/* Create / Edit Question Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Question" : "Create Question"}</DialogTitle>
            <DialogDescription>
              Configure question type, pillar mappings, scoring flags, and answer options.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((vals) => saveMutation.mutate(vals))}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Question Code *</Label>
                <Input {...form.register("code")} placeholder="eng_session_relevance" />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Question Type *</Label>
                <NativeSelect {...form.register("question_type")}>
                  <option value="rating_scale">Rating Scale</option>
                  <option value="single_choice">Single Choice</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="yes_no">Yes / No</option>
                  <option value="short_text">Short Text</option>
                  <option value="long_text">Long Text</option>
                  <option value="numeric">Numeric</option>
                  <option value="date">Date</option>
                </NativeSelect>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Question Text *</Label>
                <Textarea
                  rows={2}
                  {...form.register("question_text")}
                  placeholder="How relevant were the sessions to your current STEM work?"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Helper Description</Label>
                <Input {...form.register("description")} placeholder="Optional helper guidance" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input {...form.register("category")} placeholder="engagement" />
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input type="number" min={0} {...form.register("display_order")} />
              </div>

              {(watchedType === "rating_scale" || watchedType === "numeric") && (
                <>
                  <div className="space-y-1">
                    <Label>Min Value</Label>
                    <Input type="number" {...form.register("min_value")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Value</Label>
                    <Input type="number" {...form.register("max_value")} />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("is_required")} className="accent-primary" />
                Required
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("is_scorable")} className="accent-primary" />
                Scorable
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register("allow_explanation")}
                  className="accent-primary"
                />
                Allow Optional Explanation
              </label>
            </div>

            {/* Pillar Assignment */}
            {(pillarsQuery.data?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>Map to Measurement Pillars</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(pillarsQuery.data ?? []).map((p) => {
                    const checked = selectedPillars.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedPillars((prev) =>
                              checked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            )
                          }
                          className="accent-primary"
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Answer Options Editor */}
            {(watchedType === "single_choice" ||
              watchedType === "multiple_choice" ||
              watchedType === "rating_scale") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOptions((prev) => [
                        ...prev,
                        {
                          option_value: String(prev.length + 1),
                          option_label: "",
                          score_value: null,
                          display_order: prev.length + 1,
                          is_active: true,
                        },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <Input
                        className="col-span-3"
                        placeholder="Value"
                        value={opt.option_value}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = { ...opt, option_value: e.target.value };
                          setOptions(next);
                        }}
                      />
                      <Input
                        className="col-span-5"
                        placeholder="Label shown to participant"
                        value={opt.option_label}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = { ...opt, option_label: e.target.value };
                          setOptions(next);
                        }}
                      />
                      <Input
                        className="col-span-3"
                        type="number"
                        placeholder="Score"
                        value={opt.score_value ?? ""}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = {
                            ...opt,
                            score_value: e.target.value === "" ? null : Number(e.target.value),
                          };
                          setOptions(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-span-1"
                        onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archive Question?"
        description="Soft-archiving hides this question from future questionnaires without affecting previously collected responses."
        confirmLabel="Archive Question"
        destructive
        loading={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
      />
    </div>
  );
}
