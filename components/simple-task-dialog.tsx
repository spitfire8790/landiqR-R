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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { Task, Category, Person, TaskAllocation } from "@/lib/types";
import { getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";

interface SimpleTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    task: Omit<Task, "id" | "createdAt">,
    allocatedPeople: string[]
  ) => void;
  categories: Category[];
  availablePeople: Person[];
  selectedCategoryId?: string;
  task?: Task;
  existingAllocations?: TaskAllocation[];
}

export function SimpleTaskDialog({
  open,
  onOpenChange,
  onSave,
  categories,
  availablePeople,
  selectedCategoryId,
  task,
  existingAllocations,
}: SimpleTaskDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(0);
  const [sourceLink, setSourceLink] = useState("");
  const [allocatedPeople, setAllocatedPeople] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description);
      setCategoryId(task.categoryId);
      setHoursPerWeek(task.hoursPerWeek || 0);
      setSourceLink(task.sourceLink || "");
      if (existingAllocations) {
        setAllocatedPeople(
          existingAllocations.map((allocation) => allocation.personId)
        );
      }
    } else {
      setName("");
      setDescription("");
      setCategoryId(selectedCategoryId || "");
      setHoursPerWeek(0);
      setSourceLink("");
      setAllocatedPeople([]);
    }
  }, [task, selectedCategoryId, existingAllocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && categoryId && hoursPerWeek > 0) {
      onSave(
        {
          name: name.trim(),
          description: description.trim(),
          categoryId,
          hoursPerWeek: Number(hoursPerWeek),
          sourceLink,
        },
        allocatedPeople
      );
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handlePersonChange = (personId: string, checked: boolean) => {
    if (checked) {
      setAllocatedPeople([...allocatedPeople, personId]);
    } else {
      setAllocatedPeople(allocatedPeople.filter((id) => id !== personId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
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
                Hours per Week
              </Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min={0}
                step={0.5}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="col-span-3"
                placeholder="e.g. 5"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sourceLink" className="text-right">
                Source Link
              </Label>
              <Input
                id="sourceLink"
                type="url"
                value={sourceLink}
                onChange={(e) => setSourceLink(e.target.value)}
                className="col-span-3"
                placeholder="https://example.com/source-material"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="allocatedPeople" className="text-right pt-2">
                Allocated People
              </Label>
              <div className="col-span-3">
                <ScrollArea className="h-32 w-full border rounded-md p-2">
                  <div className="space-y-2">
                    {(availablePeople || [])
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`person-${person.id}`}
                            checked={allocatedPeople.includes(person.id)}
                            onCheckedChange={(checked) =>
                              handlePersonChange(person.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`person-${person.id}`}
                            className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
                          >
                            <span>
                              {person.name} ({person.organisation})
                            </span>
                            {getOrganizationLogo(person.organisation) && (
                              <Image
                                src={getOrganizationLogo(person.organisation)}
                                alt={`${person.organisation} logo`}
                                width={12}
                                height={12}
                                className="flex-shrink-0"
                              />
                            )}
                          </Label>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
                {allocatedPeople.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600">Selected:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allocatedPeople.map((personId) => {
                        const person = (availablePeople || []).find(
                          (p) => p.id === personId
                        );
                        return person ? (
                          <Badge
                            key={personId}
                            variant="secondary"
                            className="text-xs"
                          >
                            {person.name}
                            <X
                              className="ml-1 h-3 w-3 cursor-pointer"
                              onClick={() =>
                                handlePersonChange(personId, false)
                              }
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
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
