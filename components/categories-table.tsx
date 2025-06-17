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
import { CategoryDialog } from "@/components/category-dialog"

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

  const sortedCategories = [...categories].sort((a, b) => {
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
    <div className="p-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                Name
                <SortIcon field="name" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('description')}
              >
                Description
                <SortIcon field="description" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('group')}
              >
                Group
                <SortIcon field="group" />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No categories found. Add a category to get started.
                </TableCell>
              </TableRow>
            ) : (
              sortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and remove all associated allocations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
