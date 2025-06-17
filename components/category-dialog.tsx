"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category, Group } from "@/lib/types"
import { motion } from "framer-motion"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (category: Category) => void
  defaultValues?: Category
  groups: Group[]
}

export function CategoryDialog({ open, onOpenChange, onSave, defaultValues, groups = [] }: CategoryDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "")
  const [description, setDescription] = useState(defaultValues?.description || "")
  const [sourceLink, setSourceLink] = useState(defaultValues?.sourceLink || "")
  const [groupId, setGroupId] = useState(defaultValues?.groupId || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      setName(defaultValues.name)
      setDescription(defaultValues.description || "")
      setSourceLink(defaultValues.sourceLink || "")
      setGroupId(defaultValues.groupId)
    } else {
      setName("")
      setDescription("")
      setSourceLink("")
      setGroupId("")
    }
    setErrors({})
  }, [defaultValues])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Category name is required"
    }

    if (!groupId) {
      newErrors.groupId = "Group is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    onSave({
      id: defaultValues?.id || "",
      name,
      description,
      sourceLink,
      groupId,
    })

    // Reset form
    setName("")
    setDescription("")
    setSourceLink("")
    setGroupId("")
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] shadow-2xl border-none bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {defaultValues ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group" className="text-sm font-medium">
                Group <span className="text-red-500">*</span>
              </Label>
              <Select
                value={groupId}
                onValueChange={(value) => {
                  setGroupId(value)
                  setErrors({ ...errors, groupId: "" })
                }}
              >
                <SelectTrigger
                  id="group"
                  className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
                >
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {[...groups]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.groupId && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.groupId}
                </motion.p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors({ ...errors, name: "" })
                }}
                placeholder="Enter category name"
                className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.name}
                </motion.p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter category description"
                rows={3}
                className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sourceLink" className="text-sm font-medium">
                Source Link
              </Label>
              <Input
                id="sourceLink"
                type="url"
                value={sourceLink}
                onChange={(e) => setSourceLink(e.target.value)}
                placeholder="https://example.com/source-material"
                className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 hover:bg-gray-100 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gray-800 hover:bg-gray-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {defaultValues ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
