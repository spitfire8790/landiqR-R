import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  title: string;
  emptyMessage?: string;
  emptySubMessage?: string;
  showActions?: boolean;
  getItemId: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  onEdit,
  onDelete,
  title,
  emptyMessage = "No items found",
  emptySubMessage = "Add your first item to get started",
  showActions = true,
  getItemId,
}: DataTableProps<T>) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setAlertOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId && onDelete) {
      onDelete(deleteId);
      setDeleteId(null);
      setAlertOpen(false);
    }
  };

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = String(a[sortField]).toLowerCase();
    const bValue = String(b[sortField]).toLowerCase();

    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const SortIcon = ({ field }: { field: keyof T }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 w-full">
        {sortedData.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center mx-2 sm:mx-0"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">
              {emptyMessage}
            </p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              {emptySubMessage}
            </p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700 w-full">
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead
                          key={String(column.key)}
                          className={`font-semibold text-gray-700 dark:text-gray-300 ${
                            column.sortable
                              ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              : ""
                          } bg-gray-100 dark:bg-gray-700`}
                          onClick={() =>
                            column.sortable && handleSort(column.key)
                          }
                        >
                          {column.label}
                          {column.sortable && <SortIcon field={column.key} />}
                        </TableHead>
                      ))}
                      {showActions && (
                        <TableHead className="w-[100px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((item, index) => (
                      <motion.tr
                        key={getItemId(item)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={String(column.key)}
                            className="text-gray-700 dark:text-gray-300"
                          >
                            {column.render
                              ? column.render(item[column.key], item)
                              : String(item[column.key] || "")}
                          </TableCell>
                        ))}
                        {showActions && (
                          <TableCell>
                            <div className="flex space-x-2">
                              {onEdit && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(item)}
                                    className="dark:hover:bg-gray-600"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </motion.div>
                              )}
                              {onDelete && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDelete(getItemId(item))
                                    }
                                    className="dark:hover:bg-gray-600"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="shadow-2xl border-none bg-white dark:bg-gray-800 dark:border-gray-700">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800 dark:text-white">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                This action cannot be undone. This will permanently delete the
                item.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </motion.div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
