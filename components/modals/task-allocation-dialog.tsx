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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { TaskAllocation, Person } from "@/lib/types";
import { getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";

interface TaskAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (allocation: Omit<TaskAllocation, "id" | "createdAt">) => void;
  availablePeople: Person[];
  taskId: string;
  allocation?: TaskAllocation;
}

export default function TaskAllocationDialog({
  open,
  onOpenChange,
  onSave,
  availablePeople,
  taskId,
  allocation,
}: TaskAllocationDialogProps) {
  const [personId, setPersonId] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [estimatedWeeklyHours, setEstimatedWeeklyHours] = useState(0);

  useEffect(() => {
    if (allocation) {
      setPersonId(allocation.personId);
      setIsLead(allocation.isLead || false);
      setEstimatedWeeklyHours(allocation.estimatedWeeklyHours);
    } else {
      setPersonId("");
      setIsLead(false);
      setEstimatedWeeklyHours(0);
    }
  }, [allocation, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (personId) {
      onSave({
        taskId,
        personId,
        isLead,
        estimatedWeeklyHours,
      });
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const selectedPerson = availablePeople.find((p) => p.id === personId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {allocation ? "Edit Task Allocation" : "Allocate Person to Task"}
          </DialogTitle>
          <DialogDescription>
            {allocation
              ? "Update the task allocation details."
              : "Assign a person to work on this task."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="person" className="text-right">
                Person
              </Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeople
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{person.name}</span>
                            <span className="text-sm text-gray-500">
                              {person.organisation}
                            </span>
                          </div>
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

            {selectedPerson && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Details</Label>
                <div className="col-span-3 text-sm text-gray-600">
                  <div>
                    <strong>Email:</strong> {selectedPerson.email}
                  </div>
                  <div>
                    <strong>Role:</strong> {selectedPerson.role}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedWeeklyHours" className="text-right">
                Weekly Hours
              </Label>
              <Input
                id="estimatedWeeklyHours"
                type="number"
                min="0"
                step="0.5"
                value={estimatedWeeklyHours}
                onChange={(e) =>
                  setEstimatedWeeklyHours(Number(e.target.value))
                }
                className="col-span-3"
                placeholder="Estimated weekly hours"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isLead" className="text-right">
                Team Lead
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="isLead"
                  checked={isLead}
                  onCheckedChange={(checked) => setIsLead(checked as boolean)}
                />
                <Label htmlFor="isLead" className="text-sm font-normal">
                  This person is the team lead for this task
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {allocation ? "Update Allocation" : "Allocate Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
