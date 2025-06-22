import { useState, useCallback } from "react";

interface DialogManagerState<T> {
  isOpen: boolean;
  isAlertOpen: boolean;
  editingItem: T | null;
  deleteId: string | null;
}

export function useDialogManager<T>() {
  const [state, setState] = useState<DialogManagerState<T>>({
    isOpen: false,
    isAlertOpen: false,
    editingItem: null,
    deleteId: null,
  });

  const openDialog = useCallback((item?: T) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      editingItem: item || null,
    }));
  }, []);

  const closeDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      editingItem: null,
    }));
  }, []);

  const openAlert = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      isAlertOpen: true,
      deleteId: id,
    }));
  }, []);

  const closeAlert = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAlertOpen: false,
      deleteId: null,
    }));
  }, []);

  const handleEdit = useCallback((item: T) => {
    openDialog(item);
  }, [openDialog]);

  const handleDelete = useCallback((id: string) => {
    openAlert(id);
  }, [openAlert]);

  return {
    ...state,
    openDialog,
    closeDialog,
    openAlert,
    closeAlert,
    handleEdit,
    handleDelete,
  };
} 