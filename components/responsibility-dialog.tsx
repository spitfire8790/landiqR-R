"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Responsibility, Person } from "@/lib/types"

interface ResponsibilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (responsibility: Omit<Responsibility, "id" | "createdAt">) => void
  availablePeople: Person[]
  taskId: string
  responsibility?: Responsibility
}

export function ResponsibilityDialog({
  open,
  onOpenChange,
  onSave,
  availablePeople,
  taskId,
  responsibility,
}: ResponsibilityDialogProps) {
  const [description, setDescription] = useState("")
  const [assignedPersonId, setAssignedPersonId] = useState<string>("")
  const [estimatedWeeklyHours, setEstimatedWeeklyHours] = useState<number>(0)

  useEffect(() => {
    if (responsibility) {
      setDescription(responsibility.description)
      setAssignedPersonId(responsibility.assignedPersonId || "")
      setEstimatedWeeklyHours(responsibility.estimatedWeeklyHours)
    } else {
      setDescription("")
      setAssignedPersonId("")
      setEstimatedWeeklyHours(0)
    }
  }, [responsibility, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      onSave({
        description: description.trim(),
        taskId,
        assignedPersonId: assignedPersonId || undefined,
        estimatedWeeklyHours,
      })
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{responsibility ? "Edit Responsibility" : "Add New Responsibility"}</DialogTitle>
          <DialogDescription>
            {responsibility ? "Update the responsibility details." : "Create a new responsibility for this task."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter responsibility description"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedPerson" className="text-right">
                Assigned Person
              </Label>
              <Select value={assignedPersonId} onValueChange={setAssignedPersonId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select assigned person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No one assigned</SelectItem>
                  {availablePeople.sort((a, b) => a.name.localeCompare(b.name)).map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weeklyHours" className="text-right">
                Weekly Hours
              </Label>
              <Input
                id="weeklyHours"
                type="number"
                value={estimatedWeeklyHours}
                onChange={(e) => setEstimatedWeeklyHours(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="Enter estimated weekly hours"
                min={0}
                step={0.5}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {responsibility ? "Update Responsibility" : "Create Responsibility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
