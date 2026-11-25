"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Edit3, Eye, Plus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import { questionCardSchema } from "@/lib/validation/schemas";
import { getReadableErrorMessage, questionCardsApi } from "@/lib/api";
import { useQuestionCards } from "@/hooks/use-queries";
import type { QuestionCardRead, QuestionType } from "@/types/api";

type CardFormValues = z.infer<typeof questionCardSchema>;

export default function AdminQuestionCardsPage() {
  const queryClient = useQueryClient();
  const cardsQuery = useQuestionCards(true);

  const [cardModalOpen, setCardModalOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<QuestionCardRead | null>(null);
  const [previewCard, setPreviewCard] = React.useState<QuestionCardRead | null>(null);
  const [toggleTarget, setToggleTarget] = React.useState<QuestionCardRead | null>(null);

  // Add Question to Card modal
  const [addQCard, setAddQCard] = React.useState<QuestionCardRead | null>(null);
  const [qCode, setQCode] = React.useState("");
  const [qText, setQText] = React.useState("");
  const [qDesc, setQDesc] = React.useState("");
  const [qType, setQType] = React.useState<QuestionType>("long_text");
  const [qRequired, setQRequired] = React.useState(false);

  const form = useForm<CardFormValues>({
    resolver: zodResolver(questionCardSchema),
    defaultValues: {
      code: "",
      title: "",
      description: "",
      category: "reflection",
      display_order: 1,
      is_active: true,
    },
  });

  const openCreate = () => {
    setEditingCard(null);
    form.reset({
      code: "",
      title: "",
      description: "",
      category: "reflection",
      display_order: (cardsQuery.data?.length ?? 0) + 1,
      is_active: true,
    });
    setCardModalOpen(true);
  };

  const openEdit = (card: QuestionCardRead) => {
    setEditingCard(card);
    form.reset({
      code: card.code,
      title: card.title,
      description: card.description ?? "",
      category: card.category ?? "",
      display_order: card.display_order,
      is_active: card.is_active,
    });
    setCardModalOpen(true);
  };

  const saveCardMutation = useMutation({
    mutationFn: (values: CardFormValues) => {
      if (editingCard) {
        return questionCardsApi.update(editingCard.id, values);
      }
      return questionCardsApi.create(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-cards"] });
      toast.success(editingCard ? "Question card updated." : "Question card created.");
      setCardModalOpen(false);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (card: QuestionCardRead) =>
      questionCardsApi.update(card.id, { is_active: !card.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-cards"] });
      toast.success("Question card status updated.");
      setToggleTarget(null);
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const addQuestionMutation = useMutation({
    mutationFn: () => {
      if (!addQCard) throw new Error("No card selected");
      return questionCardsApi.addQuestion(addQCard.id, {
        code: qCode.trim(),
        question_text: qText.trim(),
        description: qDesc.trim() || null,
        question_type: qType,
        card_id: addQCard.id,
        category: addQCard.category ?? "reflection",
        is_required: qRequired,
        is_scorable: false,
        display_order: (addQCard.questions?.length ?? 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-cards"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Reflective question added to card.");
      setAddQCard(null);
      setQCode("");
      setQText("");
      setQDesc("");
    },
    onError: (err) => toast.error(getReadableErrorMessage(err)),
  });

  const cards = (cardsQuery.data ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Question Cards</h1>
          <p className="text-sm text-muted-foreground">
            Manage reflective question cards shared during CCI STEM Connect. Active cards appear
            automatically in the participant assessment flow.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Question Card
        </Button>
      </div>

      {cardsQuery.isError && (
        <ErrorAlert error={cardsQuery.error} onRetry={() => cardsQuery.refetch()} />
      )}

      {cardsQuery.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No question cards configured"
          description="Create reflective question cards (e.g., early career priorities, skills that simplify work, 10-minute teaching topics) without code changes."
          action={<Button onClick={openCreate}>Create First Card</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={card.is_active ? "success" : "secondary"}>
                    {card.is_active ? "Active" : "Archived"}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    Order #{card.display_order}
                  </span>
                </div>
                <CardTitle className="pt-2 text-lg">{card.title}</CardTitle>
                <CardDescription>
                  <code className="font-mono text-xs">{card.code}</code>
                  {card.category ? ` · ${card.category}` : ""}
                </CardDescription>
                {card.description && (
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Questions ({card.questions?.length ?? 0})
                  </p>
                  {card.questions && card.questions.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                      {card.questions.map((q) => (
                        <li key={q.id} className="line-clamp-2">
                          &bull; {q.question_text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No questions attached yet.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAddQCard(card)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewCard(card)}>
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(card)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToggleTarget(card)}>
                    {card.is_active ? (
                      <Archive className="h-3.5 w-3.5 text-amber-700" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-700" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Card Dialog */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit Question Card" : "Create Question Card"}</DialogTitle>
            <DialogDescription>
              Configure card metadata and display order in the participant deck.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((vals) => saveCardMutation.mutate(vals))}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input {...form.register("code")} placeholder="career_reflection_01" />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input {...form.register("category")} placeholder="reflection" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Title *</Label>
                <Input {...form.register("title")} placeholder="Early Career Priorities" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea {...form.register("description")} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input type="number" min={0} {...form.register("display_order")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCardModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveCardMutation.isPending}>
                {saveCardMutation.isPending ? "Saving..." : "Save Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Question to Card Dialog */}
      <Dialog open={Boolean(addQCard)} onOpenChange={(o) => !o && setAddQCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question to &ldquo;{addQCard?.title}&rdquo;</DialogTitle>
            <DialogDescription>
              Reflective card questions default to non-scorable qualitative prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Question Code *</Label>
                <Input
                  value={qCode}
                  onChange={(e) => setQCode(e.target.value)}
                  placeholder="card_teach_10min"
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <NativeSelect
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                >
                  <option value="long_text">Long Text</option>
                  <option value="short_text">Short Text</option>
                  <option value="yes_no">Yes / No</option>
                  <option value="rating_scale">Rating Scale</option>
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Question Text *</Label>
              <Textarea
                rows={2}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="What can you teach someone in 10 minutes?"
              />
            </div>
            <div className="space-y-1">
              <Label>Supporting Prompt (optional)</Label>
              <Input
                value={qDesc}
                onChange={(e) => setQDesc(e.target.value)}
                placeholder="Share a skill, workflow, or concept..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={qRequired}
                onChange={(e) => setQRequired(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Required question
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddQCard(null)}>
              Cancel
            </Button>
            <Button
              disabled={!qCode.trim() || !qText.trim() || addQuestionMutation.isPending}
              onClick={() => addQuestionMutation.mutate()}
            >
              {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Card Preview Dialog */}
      <Dialog open={Boolean(previewCard)} onOpenChange={(o) => !o && setPreviewCard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Preview: {previewCard?.title}
            </DialogTitle>
            <DialogDescription>{previewCard?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {previewCard?.questions && previewCard.questions.length > 0 ? (
              previewCard.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  required={q.is_required}
                  onChange={() => {}}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No questions added to this card yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.is_active ? "Archive Question Card?" : "Restore Question Card?"}
        description={
          toggleTarget?.is_active
            ? "Archived cards will no longer appear to new participants, while historical responses remain preserved."
            : "Restoring this card makes it visible again in active participant flows."
        }
        confirmLabel={toggleTarget?.is_active ? "Archive Card" : "Restore Card"}
        destructive={Boolean(toggleTarget?.is_active)}
        loading={toggleActiveMutation.isPending}
        onConfirm={() => toggleTarget && toggleActiveMutation.mutate(toggleTarget)}
      />
    </div>
  );
}
