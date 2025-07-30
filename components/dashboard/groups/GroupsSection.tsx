"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { GroupDialog } from "@/components/modals/group-dialog";
import GroupsTable from "@/components/tables/groups-table";
import type { Group } from "@/lib/types";
import { createToastHelpers } from "@/lib/toast";
import { createGroup, updateGroup, deleteGroup } from "@/lib/data-service";

interface GroupsSectionProps {
  groups: Group[];
  onGroupsChange: (groups: Group[]) => void;
  isAdmin: boolean;
}

export function GroupsSection({
  groups,
  onGroupsChange,
  isAdmin,
}: GroupsSectionProps) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);

  const toast = createToastHelpers();

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = async (groupData: Omit<Group, "id">) => {
    setLoading(true);
    try {
      if (editingGroup) {
        // Update existing group
        const updatedGroup = { ...editingGroup, ...groupData };
        const result = await updateGroup(updatedGroup);
        if (result) {
          const newGroups = groups.map((g) =>
            g.id === editingGroup.id ? updatedGroup : g
          );
          onGroupsChange(newGroups);
          toast.saveSuccess("Group");
        }
      } else {
        // Create new group
        const newGroup = await createGroup(groupData);
        if (newGroup) {
          onGroupsChange([...groups, newGroup]);
          toast.saveSuccess("Group");
        }
      }
      setGroupDialogOpen(false);
      setEditingGroup(null);
    } catch (error) {
      console.error("Error saving group:", error);
      toast.saveError("Group");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this group? This will also delete all associated categories and allocations."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const success = await deleteGroup(id);
      if (success) {
        const newGroups = groups.filter((g) => g.id !== id);
        onGroupsChange(newGroups);
        toast.deleteSuccess("Group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.deleteError("Group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Groups</h2>
          <Button onClick={handleAddGroup} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>
      )}

      {isAdmin ? (
        <GroupsTable
          groups={groups}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
        />
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <h3 className="font-medium mb-2">Groups ({groups.length})</h3>
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.id} className="p-2 bg-muted rounded">
                  <div className="font-medium">{group.name}</div>
                  {group.description && (
                    <div className="text-sm text-muted-foreground">
                      {group.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <GroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          onSave={handleSaveGroup}
          defaultValues={editingGroup || undefined}
        />
      )}
    </div>
  );
}
