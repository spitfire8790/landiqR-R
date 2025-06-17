"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { PersonDialog } from "@/components/person-dialog"
import type { Person } from "@/lib/types"
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
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PeopleTableProps {
  people: Person[]
  onEdit: (person: Person) => void
  onDelete: (id: string) => void
}

type SortField = 'name' | 'email' | 'organisation' | 'role'
type SortDirection = 'asc' | 'desc'

export default function PeopleTable({ people, onEdit, onDelete }: PeopleTableProps) {
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleEdit = (person: Person) => {
    setEditPerson(person)
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

  const getBadgeColor = (org: string) => {
    switch (org) {
      case "PDNSW":
        return "bg-blue-800/90 text-white border-blue-900"
      case "WSP":
        return "bg-red-100 text-red-800 border-red-200"
      case "Giraffe":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
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

  const sortedPeople = [...people].sort((a, b) => {
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">People</h2>
      </div>
      <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
        {sortedPeople.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center mx-2 sm:mx-0"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">No people added yet.</p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Add your first person to get started.</p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700">
              <Table>
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
                      onClick={() => handleSort('email')}
                    >
                      Email
                      <SortIcon field="email" />
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('organisation')}
                    >
                      Organisation
                      <SortIcon field="organisation" />
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      Role
                      <SortIcon field="role" />
                    </TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPeople.map((person, index) => (
                    <motion.tr
                      key={person.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">{person.name}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{person.email}</TableCell>
                      <TableCell>
                        <Badge className={getBadgeColor(person.organisation)} variant="outline">
                          {person.organisation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{person.role}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(person)} className="dark:hover:bg-gray-600">
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(person.id)} className="dark:hover:bg-gray-600">
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
          </ScrollArea>
        )}
      </div>

      {editPerson && (
        <PersonDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={(updatedPerson) => {
            onEdit({ ...updatedPerson, id: editPerson.id })
            setEditPerson(null)
          }}
          defaultValues={editPerson}
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
                This will permanently delete this person and all associated allocations.
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
