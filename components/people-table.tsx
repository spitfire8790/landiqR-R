"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
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

interface PeopleTableProps {
  people: Person[]
  onEdit: (person: Person) => void
  onDelete: (id: string) => void
}

export default function PeopleTable({ people, onEdit, onDelete }: PeopleTableProps) {
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

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

  return (
    <>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">People</h2>
        {people.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300"
          >
            <p className="text-gray-500 mb-2">No people added yet.</p>
            <p className="text-sm text-gray-400">Add your first person to get started.</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Email</TableHead>
                  <TableHead className="font-semibold text-gray-700">Organisation</TableHead>
                  <TableHead className="font-semibold text-gray-700">Role</TableHead>
                  <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person, index) => (
                  <motion.tr
                    key={person.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>
                      <Badge className={getBadgeColor(person.organisation)} variant="outline">
                        {person.organisation}
                      </Badge>
                    </TableCell>
                    <TableCell>{person.role}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(person)}>
                            <Edit className="h-4 w-4 text-gray-600" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(person.id)}>
                            <Trash2 className="h-4 w-4 text-gray-600" />
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
        <AlertDialogContent className="shadow-2xl border-none bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                This will permanently delete this person and all associated allocations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-gray-300 hover:bg-gray-100 transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </motion.div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
