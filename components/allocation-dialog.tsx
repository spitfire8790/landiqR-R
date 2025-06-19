"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Person, Category, Allocation } from "@/lib/types";
import { motion } from "framer-motion";
import { getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";

interface AllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (allocation: Allocation) => void;
  categories: Category[];
  people: Person[];
}

export function AllocationDialog({
  open,
  onOpenChange,
  onSave,
  categories,
  people,
}: AllocationDialogProps) {
  const [categoryId, setCategoryId] = useState("");
  const [personId, setPersonId] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!categoryId) {
      newErrors.categoryId = "Category is required";
    }

    if (!personId) {
      newErrors.personId = "Person is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave({
      id: "",
      categoryId,
      personId,
      isLead,
    });

    // Reset form
    setCategoryId("");
    setPersonId("");
    setIsLead(false);
    setErrors({});
    onOpenChange(false);
  };

  // Filter people by organisation for better UX
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const filteredPeople = useMemo(() => {
    return selectedOrg
      ? people.filter((p) => p.organisation === selectedOrg)
      : people;
  }, [selectedOrg, people]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] shadow-2xl border-none bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Add New Allocation
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Responsibility Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors({ ...errors, categoryId: "" });
                }}
              >
                <SelectTrigger
                  id="category"
                  className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {[...categories]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.categoryId}
                </motion.p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="organisation" className="text-sm font-medium">
                Filter by Organisation
              </Label>
              <Select
                value={selectedOrg || "all"}
                onValueChange={(value) =>
                  setSelectedOrg(value === "all" ? null : value)
                }
              >
                <SelectTrigger
                  id="organisation"
                  className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
                >
                  <SelectValue placeholder="All organisations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organisations</SelectItem>
                  <SelectItem value="PDNSW">PDNSW</SelectItem>
                  <SelectItem value="WSP">WSP</SelectItem>
                  <SelectItem value="Giraffe">Giraffe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="person" className="text-sm font-medium">
                Person <span className="text-red-500">*</span>
              </Label>
              <Select
                value={personId}
                onValueChange={(value) => {
                  setPersonId(value);
                  setErrors({ ...errors, personId: "" });
                }}
              >
                <SelectTrigger
                  id="person"
                  className="border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 shadow-sm transition-all duration-200"
                >
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {[...filteredPeople]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {person.name} ({person.organisation})
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
              {errors.personId && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-500"
                >
                  {errors.personId}
                </motion.p>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="isLead"
                checked={isLead}
                onCheckedChange={(checked) => setIsLead(checked === true)}
                className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
              />
              <Label
                htmlFor="isLead"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Designate as Lead for this responsibility
              </Label>
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
              className="bg-gray-600 hover:bg-gray-500 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              Create
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
