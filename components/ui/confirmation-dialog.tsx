import React from "react";
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
import { Trash2, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "info";
  icon?: React.ReactNode;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  icon,
  showIcon = true,
  children,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          iconColor: "text-red-600",
          confirmButton: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
          defaultIcon: <Trash2 className="h-6 w-6" />,
        };
      case "warning":
        return {
          iconColor: "text-yellow-600",
          confirmButton:
            "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
          defaultIcon: <AlertTriangle className="h-6 w-6" />,
        };
      case "info":
        return {
          iconColor: "text-blue-600",
          confirmButton: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
          defaultIcon: <Info className="h-6 w-6" />,
        };
      default:
        return {
          iconColor: "text-gray-600",
          confirmButton: "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500",
          defaultIcon: <HelpCircle className="h-6 w-6" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {showIcon && (
              <div className={cn("flex-shrink-0", styles.iconColor)}>
                {icon || styles.defaultIcon}
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children && (
          <div className="py-4 border-y border-gray-200">{children}</div>
        )}

        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn("text-white", styles.confirmButton)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Predefined confirmation dialogs for common actions
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="destructive"
    />
  );
}

interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  itemType: string;
}

export function BulkDeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  itemType,
}: BulkDeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={`Delete ${count} ${itemType}${count > 1 ? "s" : ""}`}
      description={`Are you sure you want to delete ${count} ${itemType}${
        count > 1 ? "s" : ""
      }? This action cannot be undone.`}
      confirmText={`Delete ${count} ${itemType}${count > 1 ? "s" : ""}`}
      variant="destructive"
    >
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-800">
          <strong>Warning:</strong> This will permanently delete all selected
          items and any related data.
        </p>
      </div>
    </ConfirmationDialog>
  );
}
