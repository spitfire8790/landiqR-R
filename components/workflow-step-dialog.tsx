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
import type { Person } from "@/lib/types";
import { getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";

// Define WorkflowStep interface locally since it's not exported from lib/types
interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  order: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
  responsiblePersonId?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  taskId: string;
}

interface WorkflowStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (step: Omit<WorkflowStep, "id" | "createdAt">) => void;
  availablePeople: Person[];
  taskId: string;
  step?: WorkflowStep;
  nextOrder: number;
}

export function WorkflowStepDialog({
  open,
  onOpenChange,
  onSave,
  availablePeople,
  taskId,
  step,
  nextOrder,
}: WorkflowStepDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(nextOrder);
  const [status, setStatus] = useState<WorkflowStep["status"]>("pending");
  const [responsiblePersonId, setResponsiblePersonId] = useState<string>("");
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(
    undefined
  );
  const [actualHours, setActualHours] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (step) {
      setName(step.name);
      setDescription(step.description);
      setOrder(step.order);
      setStatus(step.status);
      setResponsiblePersonId(step.responsiblePersonId || "");
      setEstimatedHours(step.estimatedHours);
      setActualHours(step.actualHours);
    } else {
      setName("");
      setDescription("");
      setOrder(nextOrder);
      setStatus("pending");
      setResponsiblePersonId("");
      setEstimatedHours(undefined);
      setActualHours(undefined);
    }
  }, [step, nextOrder, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        taskId,
        order,
        status,
        responsiblePersonId: responsiblePersonId || undefined,
        estimatedHours,
        actualHours,
      });
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  const getStatusColor = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "in_progress":
        return "text-blue-600";
      case "pending":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(event: KeyboardEvent) => {
          // Only allow plain Escape (no modifiers) to close the dialog
          if (event.ctrlKey || event.shiftKey || event.altKey) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {step ? "Edit Workflow Step" : "Add New Workflow Step"}
          </DialogTitle>
          <DialogDescription>
            {step
              ? "Update the workflow step details."
              : "Create a new step in the workflow."}
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
                placeholder="Enter step name"
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
                placeholder="Enter step description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order" className="text-right">
                Order
              </Label>
              <Input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                className="col-span-3"
                min={1}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value: WorkflowStep["status"]) =>
                  setStatus(value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span
                        className={getStatusColor(
                          option.value as WorkflowStep["status"]
                        )}
                      >
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="responsible" className="text-right">
                Responsible Person
              </Label>
              <Select
                value={responsiblePersonId}
                onValueChange={setResponsiblePersonId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select responsible person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No one assigned</SelectItem>
                  {availablePeople
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {person.name} - {person.organisation}
                          </span>
                          {getOrganizationLogo(person.organisation) && (
                            <Image
                              src={getOrganizationLogo(person.organisation)}
                              alt={`${person.organisation} logo`}
                              width={16}
                              height={16}
                              className="flex-shrink-0"
                            />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedHours" className="text-right">
                Estimated Hours
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                value={estimatedHours || ""}
                onChange={(e) =>
                  setEstimatedHours(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                className="col-span-3"
                placeholder="Enter estimated hours"
                min={0}
                step={0.5}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="actualHours" className="text-right">
                Actual Hours
              </Label>
              <Input
                id="actualHours"
                type="number"
                value={actualHours || ""}
                onChange={(e) =>
                  setActualHours(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                className="col-span-3"
                placeholder="Enter actual hours"
                min={0}
                step={0.5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {step ? "Update Step" : "Create Step"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
