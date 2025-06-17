"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Group } from "@/lib/types"
import { motion } from "framer-motion"
import * as LucideIcons from "lucide-react"

// Popular icons suitable for groups
const AVAILABLE_ICONS = [
  { name: "Bookmark", label: "Bookmark" },
  { name: "Briefcase", label: "Briefcase" },
  { name: "Building", label: "Building" },
  { name: "Calendar", label: "Calendar" },
  { name: "Camera", label: "Camera" },
  { name: "Clock", label: "Clock" },
  { name: "Cpu", label: "CPU" },
  { name: "Database", label: "Database" },
  { name: "Factory", label: "Factory" },
  { name: "Folder", label: "Folder" },
  { name: "Gamepad2", label: "Gamepad2" },
  { name: "Globe", label: "Globe" },
  { name: "Heart", label: "Heart" },
  { name: "Home", label: "Home" },
  { name: "Layers", label: "Layers" },
  { name: "Lightbulb", label: "Lightbulb" },
  { name: "MapPin", label: "MapPin" },
  { name: "Music", label: "Music" },
  { name: "Network", label: "Network" },
  { name: "Palette", label: "Palette" },
  { name: "Settings", label: "Settings" },
  { name: "Shield", label: "Shield" },
  { name: "Star", label: "Star" },
  { name: "Target", label: "Target" },
  { name: "Truck", label: "Truck" },
  { name: "Users", label: "Users" },
  { name: "Wrench", label: "Wrench" },
  { name: "Zap", label: "Zap" },
]

interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (group: Group) => void
  defaultValues?: Group
}

export function GroupDialog({ open, onOpenChange, onSave, defaultValues }: GroupDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "")
  const [description, setDescription] = useState(defaultValues?.description || "")
  const [icon, setIcon] = useState(defaultValues?.icon || "Folder")
  const [error, setError] = useState("")

  // Reset form when dialog opens or defaultValues change
  useEffect(() => {
    if (open) {
      setName(defaultValues?.name || "")
      setDescription(defaultValues?.description || "")
      setIcon(defaultValues?.icon || "Folder")
      setError("")
    }
  }, [open, defaultValues])

  const handleSave = () => {
    if (!name.trim()) {
      setError("Group name is required")
      return
    }

    onSave({
      id: defaultValues?.id || "",
      name,
      description,
      icon,
    })

    // Reset form
    setName("")
    setDescription("")
    setIcon("Folder")
    setError("")
    onOpenChange(false)
  }

  // Get the icon component for preview
  const IconComponent = (LucideIcons as any)[icon] || (LucideIcons as any)["Folder"]

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
            <div className="grid gap-2">
              <Label htmlFor="icon" className="text-sm font-medium">
                Icon
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg border">
                  <IconComponent className="h-5 w-5 text-gray-700" />
                </div>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="flex-1 border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800">
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {AVAILABLE_ICONS.map((iconOption) => {
                      const OptionIcon = (LucideIcons as any)[iconOption.name]
                      return (
                        <SelectItem key={iconOption.name} value={iconOption.name}>
                          <div className="flex items-center gap-2">
                            <OptionIcon className="h-4 w-4" />
                            <span>{iconOption.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
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
