import { useState, useCallback } from "react";
import { createToastHelpers } from "@/lib/toast";

export interface CrudHookOptions<T> {
  entityName: string;
  createFn: (data: Omit<T, "id">) => Promise<T | null>;
  updateFn: (data: T) => Promise<T | null>;
  deleteFn: (id: string) => Promise<boolean>;
  onDataChange: (data: T[]) => void;
}

export function useCrud<T extends { id: string }>(
  items: T[],
  options: CrudHookOptions<T>
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  
  const toast = createToastHelpers();

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: T) => {
    setEditingItem(item);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (itemData: Omit<T, "id">) => {
    setLoading(true);
    try {
      if (editingItem) {
        // Update existing item
        const updatedItem = { ...editingItem, ...itemData } as T;
        const result = await options.updateFn(updatedItem);
        if (result) {
          const newItems = items.map((item) => 
            item.id === editingItem.id ? updatedItem : item
          );
          options.onDataChange(newItems);
          toast.saveSuccess(options.entityName);
        }
      } else {
        // Create new item
        const newItem = await options.createFn(itemData);
        if (newItem) {
          options.onDataChange([...items, newItem]);
          toast.saveSuccess(options.entityName);
        }
      }
      setDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error(`Error saving ${options.entityName.toLowerCase()}:`, error);
      toast.saveError(options.entityName);
    } finally {
      setLoading(false);
    }
  }, [editingItem, items, options, toast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${options.entityName.toLowerCase()}?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const success = await options.deleteFn(id);
      if (success) {
        const newItems = items.filter((item) => item.id !== id);
        options.onDataChange(newItems);
        toast.deleteSuccess(options.entityName);
      }
    } catch (error) {
      console.error(`Error deleting ${options.entityName.toLowerCase()}:`, error);
      toast.deleteError(options.entityName);
    } finally {
      setLoading(false);
    }
  }, [items, options, toast]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingItem(null);
  }, []);

  return {
    // State
    dialogOpen,
    editingItem,
    loading,
    
    // Actions
    handleAdd,
    handleEdit,
    handleSave,
    handleDelete,
    closeDialog,
    setDialogOpen,
  };
}

// Specialized hook for entities with cascading deletes
export function useCrudWithWarning<T extends { id: string }>(
  items: T[],
  options: CrudHookOptions<T> & { deleteWarning?: string }
) {
  const crud = useCrud(items, options);
  
  const handleDeleteWithWarning = useCallback(async (id: string) => {
    const warning = options.deleteWarning || 
      `Are you sure you want to delete this ${options.entityName.toLowerCase()}?`;
    
    if (!confirm(warning)) {
      return;
    }
    
    return crud.handleDelete(id);
  }, [crud, options]);

  return {
    ...crud,
    handleDelete: handleDeleteWithWarning,
  };
}

// Hook for managing list state with pagination
export function useListState<T>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    
    // Generic search through string properties
    return Object.values(item as Record<string, unknown>).some(value => 
      typeof value === 'string' && 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = (a as any)[sortField];
    const bValue = (b as any)[sortField];
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(sortedItems.length / pageSize);

  return {
    // Data
    items,
    filteredItems: paginatedItems,
    totalItems: sortedItems.length,
    totalPages,
    
    // Pagination state
    currentPage,
    pageSize,
    
    // Search & sort state
    searchTerm,
    sortField,
    sortDirection,
    
    // Actions
    setItems,
    setSearchTerm,
    setSortField,
    setSortDirection,
    setCurrentPage,
    setPageSize,
  };
} 