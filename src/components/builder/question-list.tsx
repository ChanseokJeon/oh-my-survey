"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { QuestionItem } from "./question-item";

interface Question {
  id: string;
  type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
  title: string;
  options: string[] | null;
  required: boolean;
  order: number;
}

interface QuestionListProps {
  questions: Question[];
  onReorder: (questionIds: string[]) => void;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

export function QuestionList({
  questions,
  onReorder,
  onEdit,
  onDelete,
}: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const newOrder = arrayMove(questions, oldIndex, newIndex);
      onReorder(newOrder.map((q) => q.id));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={questions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
