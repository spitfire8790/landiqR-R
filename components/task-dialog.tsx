"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, Category, TaskSourceLink } from "@/lib/types";
import {
  createTaskSourceLink,
  updateTaskSourceLink,
  deleteTaskSourceLink,
} from "@/lib/data-service";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    task: Omit<Task, "id" | "createdAt">,
    sourceLinks?: Omit<TaskSourceLink, "id" | "taskId" | "createdAt">[]
  ) => void;
  categories: Category[];
  selectedCategoryId?: string;
  task?: Task;
}

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  categories,
  selectedCategoryId,
  task,
}: TaskDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(0);
  const [sourceLinks, setSourceLinks] = useState<TaskSourceLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkDescription, setNewLinkDescription] = useState("");

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description);
      setCategoryId(task.categoryId);
      setHoursPerWeek(task.hoursPerWeek);
      setSourceLinks(task.sourceLinks || []);
    } else {
      setName("");
      setDescription("");
      setCategoryId(selectedCategoryId || "");
      setHoursPerWeek(0);
      setSourceLinks([]);
    }
    setNewLinkUrl("");
    setNewLinkDescription("");
  }, [task, selectedCategoryId]);

  const handleAddSourceLink = () => {
    if (newLinkUrl.trim()) {
      const newLink: TaskSourceLink = {
        id: `temp-${Date.now()}`, // Temporary ID for new links
        taskId: task?.id || "",
        url: newLinkUrl.trim(),
        description: newLinkDescription.trim(),
        createdAt: new Date().toISOString(),
      };
      setSourceLinks([...sourceLinks, newLink]);
      setNewLinkUrl("");
      setNewLinkDescription("");
    }
  };

  const handleUpdateSourceLink = (
    index: number,
    field: "url" | "description",
    value: string
  ) => {
    const updatedLinks = [...sourceLinks];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setSourceLinks(updatedLinks);
  };

  const handleDeleteSourceLink = (index: number) => {
    const updatedLinks = sourceLinks.filter((_, i) => i !== index);
    setSourceLinks(updatedLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && categoryId) {
      // Prepare task data
      const taskData = {
        name: name.trim(),
        description: description.trim(),
        categoryId,
        hoursPerWeek,
        sourceLinks: [], // Will be handled separately
      };

      if (task?.id) {
        // Editing existing task - handle source links here
        // Handle source links for existing task
        const existingLinks = task.sourceLinks || [];
        const currentLinks = sourceLinks;

        // Delete removed links
        for (const existingLink of existingLinks) {
          const stillExists = currentLinks.find(
            (link) => link.id === existingLink.id
          );
          if (!stillExists) {
            await deleteTaskSourceLink(existingLink.id);
          }
        }

        // Update or create links
        for (const link of currentLinks) {
          if (link.id.startsWith("temp-")) {
            // Create new link
            await createTaskSourceLink({
              taskId: task.id,
              url: link.url,
              description: link.description,
            });
          } else {
            // Update existing link
            const existingLink = existingLinks.find((l) => l.id === link.id);
            if (
              existingLink &&
              (existingLink.url !== link.url ||
                existingLink.description !== link.description)
            ) {
              await updateTaskSourceLink(link);
            }
          }
        }

        // Save task without source links data
        onSave(taskData);
      } else {
        // Creating new task - pass source links to parent
        const newSourceLinks = sourceLinks
          .filter((link) => link.id.startsWith("temp-"))
          .map((link) => ({
            url: link.url,
            description: link.description,
          }));

        onSave(taskData, newSourceLinks);
      }

      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task details."
              : "Create a new task for the selected category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Enter task name"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hoursPerWeek" className="text-right">
                Hours/Week
              </Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min="0"
                step="0.5"
                value={hoursPerWeek}
                onChange={(e) =>
                  setHoursPerWeek(parseFloat(e.target.value) || 0)
                }
                className="col-span-3"
                placeholder="0"
              />
            </div>

            {/* Source Links Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Source Links</Label>
              <div className="col-span-3 space-y-3">
                {/* Existing source links */}
                {sourceLinks.map((link, index) => (
                  <div
                    key={link.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          handleUpdateSourceLink(index, "url", e.target.value)
                        }
                        placeholder="https://example.com"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.url, "_blank")}
                        disabled={!link.url}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSourceLink(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={link.description || ""}
                      onChange={(e) =>
                        handleUpdateSourceLink(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Optional description"
                    />
                  </div>
                ))}

                {/* Add new source link */}
                <div className="border-2 border-dashed rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSourceLink}
                      disabled={!newLinkUrl.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={newLinkDescription}
                    onChange={(e) => setNewLinkDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
