"use client";

import { useState, memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronUp, ChevronDown, Download } from "lucide-react";
import { GroupDialog } from "@/components/group-dialog";
import type { Group } from "@/lib/types";
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
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportGroups } from "@/lib/export-service";
import {
  DeleteConfirmationDialog,
  BulkDeleteConfirmationDialog,
} from "@/components/ui/confirmation-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface GroupsTableProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
}

type SortField = "name" | "description";
type SortDirection = "asc" | "desc";

const GroupsTable = memo(function GroupsTable({
  groups,
  onEdit,
  onDelete,
}: GroupsTableProps) {
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Virtualization refs
  const parentRef = useRef<HTMLDivElement>(null);

  const handleEdit = (group: Group) => {
    setEditGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = (group: Group) => {
    setDeleteGroup(group);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteGroup) {
      onDelete(deleteGroup.id);
      setDeleteGroup(null);
      setDeleteDialogOpen(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(new Set(sortedGroups.map((group) => group.id)));
    } else {
      setSelectedGroups(new Set());
    }
  };

  const handleSelectGroup = (groupId: string, checked: boolean) => {
    const newSelected = new Set(selectedGroups);
    if (checked) {
      newSelected.add(groupId);
    } else {
      newSelected.delete(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedGroups.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    selectedGroups.forEach((groupId) => {
      onDelete(groupId);
    });
    setSelectedGroups(new Set());
    setBulkDeleteDialogOpen(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedGroups = [...groups].sort((a, b) => {
    const aValue = a[sortField].toLowerCase();
    const bValue = b[sortField].toLowerCase();

    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: sortedGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
          Responsibility Groups
        </h2>
        <div className="flex items-center gap-2">
          {selectedGroups.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedGroups.size} selected
            </Button>
          )}
          <Button
            onClick={() => exportGroups(groups)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 w-full">
        {sortedGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center mx-2 sm:mx-0"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">
              No groups created yet.
            </p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              Add your first group to get started.
            </p>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700 w-full h-full">
            {/* Mobile Card Layout */}
            <div className="sm:hidden h-full">
              <div
                ref={parentRef}
                className="h-full overflow-auto"
                style={{
                  contain: "strict",
                }}
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const group = sortedGroups[virtualItem.index];
                    return (
                      <motion.div
                        key={group.id}
                        data-index={virtualItem.index}
                        ref={rowVirtualizer.measureElement}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                              {group.description}
                            </p>
                          </div>
                          <div className="flex space-x-1 ml-3">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(group)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(group)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden sm:block h-full overflow-hidden">
              {/* Header with same grid structure */}
              <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-10">
                <div
                  className="grid gap-0 items-center px-4 py-3"
                  style={{ gridTemplateColumns: "48px 192px 1fr 96px" }}
                >
                  {/* Checkbox Header */}
                  <div className="flex items-center">
                    <Checkbox
                      checked={
                        selectedGroups.size === sortedGroups.length &&
                        sortedGroups.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all groups"
                    />
                  </div>

                  {/* Name Header */}
                  <div
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 py-2 px-2 rounded -mx-2"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </div>

                  {/* Description Header */}
                  <div
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 py-2 px-2 rounded -mx-2"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Description
                      <SortIcon field="description" />
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-64px)] overflow-auto">
                {sortedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="grid items-center gap-0 px-4 py-4 min-h-[60px] border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    style={{ gridTemplateColumns: "48px 192px 1fr 96px" }}
                  >
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedGroups.has(group.id)}
                        onCheckedChange={(checked) =>
                          handleSelectGroup(group.id, checked as boolean)
                        }
                        aria-label={`Select ${group.name}`}
                      />
                    </div>
                    <div className="font-medium pr-4 truncate whitespace-nowrap overflow-hidden text-ellipsis">
                      {group.name}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 pr-4 truncate whitespace-nowrap overflow-hidden text-ellipsis">
                      {group.description}
                    </div>
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={onEdit}
        group={editGroup}
      />

      {/* Delete Confirmation */}
      {deleteGroup && (
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          itemName={deleteGroup.name}
          itemType="group"
        />
      )}

      {/* Bulk Delete Confirmation */}
      <BulkDeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        count={selectedGroups.size}
        itemType="group"
      />
    </div>
  );
});

export default GroupsTable;
