"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Person } from "@/lib/types"
import { motion } from "framer-motion"

interface PersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (person: Person) => void
  defaultValues?: Person
}

export function PersonDialog({ open, onOpenChange, onSave, defaultValues }: PersonDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "")
  const [email, setEmail] = useState(defaultValues?.email || "")
  const [organisation, setOrganisation] = useState(defaultValues?.organisation || "PDNSW")
  const [role, setRole] = useState(defaultValues?.role || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }

    if (!organisation) {
      newErrors.organisation = "Organisation is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    onSave({
      id: defaultValues?.id || "",
      name,
      email,
      organisation,
      role,
    })

    // Reset form
    setName("")
    setEmail("")
    setOrganisation("PDNSW")
    setRole("")
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] shadow-2xl border-none bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {defaultValues ? "Edit Person" : "Add New Person"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors({ ...errors, name: "" })
                }}
                placeholder="Enter name"
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
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors({ ...errors, email: "" })
                }}
                placeholder="Enter email"
                className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
              />
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organisation" className="text-sm font-medium">
                Organisation <span className="text-red-500">*</span>
              </Label>
              <Select
                value={organisation}
                onValueChange={(value) => {
                  setOrganisation(value)
                  setErrors({ ...errors, organisation: "" })
                }}
              >
                <SelectTrigger
                  id="organisation"
                  className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
                >
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDNSW">PDNSW</SelectItem>
                  <SelectItem value="WSP">WSP</SelectItem>
                  <SelectItem value="Giraffe">Giraffe</SelectItem>
                </SelectContent>
              </Select>
              {errors.organisation && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.organisation}
                </motion.p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter role (optional)"
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
              className="bg-gray-700 hover:bg-gray-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {defaultValues ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
