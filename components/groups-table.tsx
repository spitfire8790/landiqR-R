"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react"
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

type SortField = 'name' | 'description'
type SortDirection = 'asc' | 'desc'

export default function GroupsTable({ groups, onEdit, onDelete }: GroupsTableProps) {
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedGroups = [...groups].sort((a, b) => {
    const aValue = a[sortField].toLowerCase()
    const bValue = b[sortField].toLowerCase()
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue)
    } else {
      return bValue.localeCompare(aValue)
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Responsibility Groups</h2>
      </div>
      <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 w-full">
        {sortedGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center mx-2 sm:mx-0"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">No groups created yet.</p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Add your first group to get started.</p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700 w-full">
              {/* Mobile Card Layout */}
              <div className="sm:hidden">
                {sortedGroups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{group.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{group.description}</p>
                      </div>
                      <div className="flex space-x-1 ml-3">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(group)} className="touch-target dark:text-blue-400 dark:hover:bg-gray-600">
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)} className="touch-target dark:text-red-400 dark:hover:bg-gray-600">
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    <TableRow>
                      <TableHead 
                        className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors bg-gray-100 dark:bg-gray-700"
                        onClick={() => handleSort('name')}
                      >
                        Name <SortIcon field="name" />
                      </TableHead>
                      <TableHead 
                        className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors bg-gray-100 dark:bg-gray-700"
                        onClick={() => handleSort('description')}
                      >
                        Description <SortIcon field="description" />
                      </TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedGroups.map((group, index) => (
                      <motion.tr
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        <TableCell className="font-medium text-gray-900 dark:text-white">{group.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{group.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(group)} className="dark:hover:bg-gray-600">
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)} className="dark:hover:bg-gray-600">
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
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
        <AlertDialogContent className="shadow-2xl border-none bg-white dark:bg-gray-800 dark:border-gray-700">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800 dark:text-white">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                This will permanently delete this group and all its categories and allocations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 dark:neon-pink-glow"
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
