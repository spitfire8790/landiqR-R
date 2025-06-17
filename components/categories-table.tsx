"use client"

import { useState } from "react"
import type { Category, Group } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { PencilIcon, TrashIcon, ChevronUp, ChevronDown, ExternalLinkIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryDialog } from "@/components/category-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"

interface CategoriesTableProps {
  categories: Category[]
  groups: Group[]
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

type SortField = 'name' | 'description' | 'group'
type SortDirection = 'asc' | 'desc'

export default function CategoriesTable({ categories, groups, onEdit, onDelete }: CategoriesTableProps) {
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')

  const handleEdit = (category: Category) => {
    setEditCategory(category)
    setDialogOpen(true)
  }

  const handleSaveEdit = (updatedCategory: Category) => {
    onEdit(updatedCategory)
    setEditCategory(null)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setAlertOpen(true)
  }

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
      setAlertOpen(false)
    }
  }

  // Find group name by ID
  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'Unknown Group'
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter categories by selected group
  const filteredCategories = selectedGroupId === 'all' 
    ? categories 
    : categories.filter(category => category.groupId === selectedGroupId)

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let aValue: string
    let bValue: string
    
    if (sortField === 'group') {
      aValue = getGroupName(a.groupId).toLowerCase()
      bValue = getGroupName(b.groupId).toLowerCase()
    } else {
      aValue = a[sortField].toLowerCase()
      bValue = b[sortField].toLowerCase()
    }
    
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
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Categories</h2>
      </div>
      <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 w-full">
        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label htmlFor="group-filter" className="text-sm font-medium">
              Filter by Group:
            </label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredCategories.length} of {categories.length} categories
          </div>
        </div>

        {sortedCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center mx-2 sm:mx-0"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">No categories found.</p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Add categories to get started.</p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700 w-full">
              <Table className="w-full">
                <TableHeader className="bg-gray-100 dark:bg-gray-700">
                  <TableRow>
                    <TableHead 
                      className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      Name
                      <SortIcon field="name" />
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('description')}
                    >
                      Description
                      <SortIcon field="description" />
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('group')}
                    >
                      Group
                      <SortIcon field="group" />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Source</TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category, index) => (
                    <motion.tr
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>{getGroupName(category.groupId)}</TableCell>
                      <TableCell>
                        {category.sourceLink ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(category.sourceLink, '_blank')}
                            className="p-1 h-auto"
                            title="View source material"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                              className="dark:hover:bg-gray-600"
                            >
                              <PencilIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(category.id)}
                              className="dark:hover:bg-gray-600"
                            >
                              <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
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

      {/* Edit Category Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditCategory(null);
        }}
        onSave={handleSaveEdit}
        defaultValues={editCategory || undefined}
        groups={groups}
      />

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
                This will permanently delete this category and remove all associated allocations.
                This action cannot be undone.
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
