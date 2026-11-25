"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/tabs-and-progress";
import { QuestionField } from "@/features/assessments/components/question-field";
import type { AssessmentResponseInput, QuestionCardRead, QuestionRead } from "@/types/api";

interface DeckItem {
  card: QuestionCardRead;
  question: QuestionRead;
}

export function QuestionCardDeck({
  cards,
  responses,
  onResponseChange,
  onBack,
  onComplete,
}: {
  cards: QuestionCardRead[];
  responses: Record<string, AssessmentResponseInput>;
  onResponseChange: (questionId: string, next: AssessmentResponseInput) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const deck = React.useMemo<DeckItem[]>(() => {
    const sortedCards = cards
      .filter((c) => c.is_active)
      .sort((a, b) => a.display_order - b.display_order);

    const items: DeckItem[] = [];
    sortedCards.forEach((card) => {
      const qs = (card.questions ?? [])
        .filter((q) => !q.is_archived)
        .sort((a, b) => a.display_order - b.display_order);
      qs.forEach((question) => {
        items.push({ card, question });
      });
    });
    return items;
  }, [cards]);

  const [index, setIndex] = React.useState(0);

  if (deck.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active reflective question cards are configured for this event.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onBack}>
              Previous Section
            </Button>
            <Button onClick={onComplete}>Review Assessment</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeItem = deck[Math.min(index, deck.length - 1)]!;
  const isLast = index >= deck.length - 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="info" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Reflective Question Cards
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            Card {index + 1} of {deck.length}
          </span>
        </div>
        <ProgressBar
          value={index + 1}
          max={deck.length}
          label="Reflective question cards progress"
        />
      </div>

      <Card className="overflow-hidden border-primary/20 shadow-elevated">
        <div className="h-1.5 bg-gradient-to-r from-[#D41B23] via-[#B5151C] to-[#8E1117]" />
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">{activeItem.card.title}</CardTitle>
            {activeItem.card.category && (
              <Badge variant="outline">{activeItem.card.category}</Badge>
            )}
          </div>
          {activeItem.card.description && (
            <CardDescription>{activeItem.card.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <QuestionField
            question={activeItem.question}
            required={activeItem.question.is_required}
            value={responses[activeItem.question.id]}
            onChange={(next) => onResponseChange(activeItem.question.id, next)}
          />
          {!activeItem.question.is_scorable && (
            <p className="text-xs text-muted-foreground">
              Reflective question cards capture qualitative takeaways from CCI STEM Connect and are
              not automatically scored unless configured by organisers.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (index === 0) onBack();
            else setIndex((i) => i - 1);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          {index === 0 ? "Back to Sections" : "Previous Card"}
        </Button>

        <Button
          onClick={() => {
            if (isLast) onComplete();
            else setIndex((i) => i + 1);
          }}
        >
          {isLast ? "Review Responses" : "Next Card"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
