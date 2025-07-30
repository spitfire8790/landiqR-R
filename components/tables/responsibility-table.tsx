"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { CategoryDialog } from "@/components/modals/category-dialog";
import type { Category, Group } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResponsibilityTableProps {
  categories: Category[];
  groups: Group[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export default function ResponsibilityTable({
  categories,
  groups,
  onEdit,
  onDelete,
}: ResponsibilityTableProps) {
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setAlertOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Get categories for a specific group
  const getCategoriesForGroup = (groupId: string) => {
    return categories.filter((cat) => cat.groupId === groupId);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        {groups.length === 0 ? (
          <p className="text-muted-foreground">
            No groups created yet. Add a group before creating categories.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground">
            No categories created yet. Add your first category to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const groupCategories = getCategoriesForGroup(group.id);
                const isExpanded = expandedGroups[group.id] ?? true;

                if (groupCategories.length === 0) return null;

                return (
                  <>
                    <TableRow key={group.id} className="bg-muted/30">
                      <TableCell colSpan={3}>
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 mr-1"
                            onClick={() => toggleGroup(group.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-bold">{group.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({groupCategories.length} categories)
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded &&
                      groupCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium pl-8">
                            {category.name}
                          </TableCell>
                          <TableCell>{category.description}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {editCategory && (
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={(updatedCategory) => {
            onEdit({ ...updatedCategory, id: editCategory.id });
            setEditCategory(null);
          }}
          defaultValues={editCategory}
          groups={groups}
        />
      )}

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all associated
              allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
