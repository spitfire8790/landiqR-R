"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Group } from "@/lib/types"
import { motion } from "framer-motion"

interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (group: Group) => void
  defaultValues?: Group
}

export function GroupDialog({ open, onOpenChange, onSave, defaultValues }: GroupDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "")
  const [description, setDescription] = useState(defaultValues?.description || "")
  const [error, setError] = useState("")

  const handleSave = () => {
    if (!name.trim()) {
      setError("Group name is required")
      return
    }

    onSave({
      id: defaultValues?.id || "",
      name,
      description,
    })

    // Reset form
    setName("")
    setDescription("")
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] shadow-2xl border-none bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {defaultValues ? "Edit Group" : "Add New Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Group Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError("")
                }}
                placeholder="Enter group name"
                className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {error}
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
                placeholder="Enter group description"
                rows={3}
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
              className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {defaultValues ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
