"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CategoryDialog } from "@/components/modals/category-dialog";
import CategoriesTable from "@/components/tables/categories-table";
import type { Category, Group } from "@/lib/types";
import { createToastHelpers } from "@/lib/toast";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/data-service";

interface CategoriesSectionProps {
  categories: Category[];
  groups: Group[];
  onCategoriesChange: (categories: Category[]) => void;
  isAdmin: boolean;
}

export function CategoriesSection({
  categories,
  groups,
  onCategoriesChange,
  isAdmin,
}: CategoriesSectionProps) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  const toast = createToastHelpers();

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (categoryData: Omit<Category, "id">) => {
    setLoading(true);
    try {
      if (editingCategory) {
        // Update existing category
        const updatedCategory = { ...editingCategory, ...categoryData };
        const result = await updateCategory(updatedCategory);
        if (result) {
          const newCategories = categories.map((c) =>
            c.id === editingCategory.id ? updatedCategory : c
          );
          onCategoriesChange(newCategories);
          toast.saveSuccess("Category");
        }
      } else {
        // Create new category
        const newCategory = await createCategory(categoryData);
        if (newCategory) {
          onCategoriesChange([...categories, newCategory]);
          toast.saveSuccess("Category");
        }
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error("Error saving category:", error);
      toast.saveError("Category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This will also delete all associated allocations."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const success = await deleteCategory(id);
      if (success) {
        const newCategories = categories.filter((c) => c.id !== id);
        onCategoriesChange(newCategories);
        toast.deleteSuccess("Category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.deleteError("Category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Button onClick={handleAddCategory} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      )}

      {isAdmin ? (
        <CategoriesTable
          categories={categories}
          groups={groups}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <h3 className="font-medium mb-2">
              Categories ({categories.length})
            </h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const group = groups.find((g) => g.id === category.groupId);
                return (
                  <div key={category.id} className="p-2 bg-muted rounded">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-muted-foreground">
                        {category.description}
                      </div>
                    )}
                    {group && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Group: {group.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onSave={handleSaveCategory}
          groups={groups}
          defaultValues={editingCategory || undefined}
        />
      )}
    </div>
  );
}
