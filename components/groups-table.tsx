"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { GroupDialog } from "@/components/group-dialog"
import type { Group } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GroupsTableProps {
  groups: Group[]
  onEdit: (group: Group) => void
  onDelete: (id: string) => void
}

export default function GroupsTable({ groups, onEdit, onDelete }: GroupsTableProps) {
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  const handleEdit = (group: Group) => {
    setEditGroup(group)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setAlertOpen(true)
  }

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Responsibility Groups</h2>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 h-full flex flex-col items-center justify-center"
          >
            <p className="text-gray-500 mb-2">No groups created yet.</p>
            <p className="text-sm text-gray-400">Add your first group to get started.</p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Description</TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, index) => (
                    <motion.tr
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                              <Edit className="h-4 w-4 text-blue-600" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </div>

      {editGroup && (
        <GroupDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={(updatedGroup) => {
            onEdit({ ...updatedGroup, id: editGroup.id })
            setEditGroup(null)
          }}
          defaultValues={editGroup}
        />
      )}

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="shadow-2xl border-none bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                This will permanently delete this group and all its categories and allocations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-gray-300 hover:bg-gray-100 transition-all duration-200">
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
  )
}
