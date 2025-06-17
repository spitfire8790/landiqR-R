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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Task, Category } from "@/lib/types"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Omit<Task, "id" | "createdAt">) => void
  categories: Category[]
  selectedCategoryId?: string
  task?: Task
}

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  categories,
  selectedCategoryId,
  task,
}: TaskDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [hoursPerWeek, setHoursPerWeek] = useState(0)
  const [sourceLink, setSourceLink] = useState("")

  useEffect(() => {
    if (task) {
      setName(task.name)
      setDescription(task.description)
      setCategoryId(task.categoryId)
      setHoursPerWeek(task.hoursPerWeek)
      setSourceLink(task.sourceLink || "")
    } else {
      setName("")
      setDescription("")
      setCategoryId(selectedCategoryId || "")
      setHoursPerWeek(0)
      setSourceLink("")
    }
  }, [task, selectedCategoryId, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && categoryId) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        hoursPerWeek,
        sourceLink,
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
          <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the task details." : "Create a new task for the selected category."}
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
                  {categories.map((category) => (
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
                onChange={(e) => setHoursPerWeek(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="0"
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
  )
}
