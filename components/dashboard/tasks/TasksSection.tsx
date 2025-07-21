"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TasksView from "@/components/tasks-view";
import { SimpleTaskDialog } from "@/components/simple-task-dialog";
import type { Group, Category, Person, Task } from "@/lib/types";

interface TasksSectionProps {
  groups: Group[];
  categories: Category[];
  people: Person[];
  tasks: Task[];
  isAdmin: boolean;
  selectedCategoryId?: string;
  onDataChange: () => void;
  onAddTask?: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  onUpdateTask?: (task: Task) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
}

export default function TasksSection({
  groups,
  categories,
  people,
  tasks,
  isAdmin,
  selectedCategoryId,
  onDataChange,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TasksSectionProps) {
  const [simpleTaskDialogOpen, setSimpleTaskDialogOpen] = useState(false);

  const handleAddTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    if (onAddTask) {
      await onAddTask(taskData);
      onDataChange();
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600">
            Manage tasks and their allocations across categories
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setSimpleTaskDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <TasksView
          groups={groups}
          categories={categories}
          people={people}
          isAdmin={isAdmin}
          selectedCategoryId={selectedCategoryId}
          onDataChange={onDataChange}
        />
      </div>

      {/* Simple Task Dialog */}
      <SimpleTaskDialog
        open={simpleTaskDialogOpen}
        onOpenChange={setSimpleTaskDialogOpen}
        categories={categories}
        people={people}
        onTaskCreate={handleAddTask}
      />
    </div>
  );
}
