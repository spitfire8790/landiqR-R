"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, Layers, Users, Grid3X3, Database, BarChart, Menu, X } from "lucide-react"
import { GroupDialog } from "@/components/group-dialog"
import { CategoryDialog } from "@/components/category-dialog"
import { PersonDialog } from "@/components/person-dialog"
import { AllocationDialog } from "@/components/allocation-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Person, Category, Allocation, Group } from "@/lib/types"
import OrgChart from "@/components/org-chart"
import GroupsTable from "@/components/groups-table"
import CategoriesTable from "@/components/categories-table"
import PeopleTable from "@/components/people-table"
import ResponsibilityChart from "@/components/responsibility-chart"
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchPeople,
  createPerson,
  updatePerson,
  deletePerson,
  fetchAllocations,
  createAllocation,
  deleteAllocation,
  ensureTablesExist,
} from "@/lib/data-service"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  // State variables
  const [groups, setGroups] = useState<Group[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [initializingDb, setInitializingDb] = useState(false)

  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [personDialogOpen, setPersonDialogOpen] = useState(false)
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("orgchart")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { toast } = useToast()

  // Initialize database and fetch data
  useEffect(() => {
    async function initializeAndLoadData() {
      setLoading(true)
      try {
        // First try to ensure tables exist
        const tablesExist = await ensureTablesExist()
        setDbInitialized(tablesExist)

        if (tablesExist) {
          // If tables exist, fetch data
          const [groupsData, categoriesData, peopleData, allocationsData] = await Promise.all([
            fetchGroups(),
            fetchCategories(),
            fetchPeople(),
            fetchAllocations(),
          ])

          setGroups(groupsData)
          setCategories(categoriesData)
          setPeople(peopleData)
          setAllocations(allocationsData)
        }
      } catch (error) {
        console.error("Error initializing and loading data:", error)
        toast({
          title: "Error",
          description: "Failed to initialize database or load data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    initializeAndLoadData()
  }, [toast])

  // Function to manually initialize the database
  const initializeDatabase = async () => {
    setInitializingDb(true)
    try {
      const success = await ensureTablesExist()
      setDbInitialized(success)
      toast({
        title: "Success",
        description: "Database initialized successfully.",
      })
    } catch (error) {
      console.error("Error initializing database:", error)
      toast({
        title: "Error",
        description: "Failed to initialize database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setInitializingDb(false)
    }
  }

  // CRUD operations for groups, categories, people, and allocations
  const addGroup = async (group: Omit<Group, "id">) => {
    try {
      const newGroup = await createGroup(group)
      if (newGroup) {
        setGroups([...groups, newGroup])
        toast({
          title: "Success",
          description: "Group created successfully",
        })
      }
    } catch (error) {
      console.error("Error adding group:", error)
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      })
    }
  }

  const updateGroupHandler = async (updatedGroup: Group) => {
    try {
      const result = await updateGroup(updatedGroup)
      if (result) {
        setGroups(groups.map((grp) => (grp.id === updatedGroup.id ? updatedGroup : grp)))
        toast({
          title: "Success",
          description: "Group updated successfully",
        })
      }
    } catch (error) {
      console.error("Error updating group:", error)
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      })
    }
  }

  const deleteGroupHandler = async (id: string) => {
    try {
      const success = await deleteGroup(id)
      if (success) {
        setGroups(groups.filter((grp) => grp.id !== id))
        setCategories(categories.filter((cat) => cat.groupId !== id))
        setAllocations(
          allocations.filter((alloc) => !categories.some((cat) => cat.groupId === id && cat.id === alloc.categoryId)),
        )
        toast({
          title: "Success",
          description: "Group deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      })
    }
  }

  const addCategory = async (category: Omit<Category, "id">) => {
    try {
      const newCategory = await createCategory(category)
      if (newCategory) {
        setCategories([...categories, newCategory])
        toast({
          title: "Success",
          description: "Category created successfully",
        })
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }

  const updateCategoryHandler = async (updatedCategory: Category) => {
    try {
      const result = await updateCategory(updatedCategory)
      if (result) {
        setCategories(categories.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat)))
        toast({
          title: "Success",
          description: "Category updated successfully",
        })
      }
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      })
    }
  }

  const deleteCategoryHandler = async (id: string) => {
    try {
      const success = await deleteCategory(id)
      if (success) {
        setCategories(categories.filter((cat) => cat.id !== id))
        setAllocations(allocations.filter((alloc) => alloc.categoryId !== id))
        toast({
          title: "Success",
          description: "Category deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const addPerson = async (person: Omit<Person, "id">) => {
    try {
      const newPerson = await createPerson(person)
      if (newPerson) {
        setPeople([...people, newPerson])
        toast({
          title: "Success",
          description: "Person added successfully",
        })
      }
    } catch (error) {
      console.error("Error adding person:", error)
      toast({
        title: "Error",
        description: "Failed to add person",
        variant: "destructive",
      })
    }
  }

  const updatePersonHandler = async (updatedPerson: Person) => {
    try {
      const result = await updatePerson(updatedPerson)
      if (result) {
        setPeople(people.map((p) => (p.id === updatedPerson.id ? updatedPerson : p)))
        toast({
          title: "Success",
          description: "Person updated successfully",
        })
      }
    } catch (error) {
      console.error("Error updating person:", error)
      toast({
        title: "Error",
        description: "Failed to update person",
        variant: "destructive",
      })
    }
  }

  const deletePersonHandler = async (id: string) => {
    try {
      const success = await deletePerson(id)
      if (success) {
        setPeople(people.filter((p) => p.id !== id))
        setAllocations(allocations.filter((alloc) => alloc.personId !== id))
        toast({
          title: "Success",
          description: "Person deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting person:", error)
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      })
    }
  }

  const addAllocationHandler = async (allocation: Omit<Allocation, "id">) => {
    try {
      const newAllocation = await createAllocation(allocation)
      if (newAllocation) {
        setAllocations([...allocations, newAllocation])
        toast({
          title: "Success",
          description: "Allocation added successfully",
        })
      }
    } catch (error) {
      console.error("Error adding allocation:", error)
      toast({
        title: "Error",
        description: "Failed to add allocation",
        variant: "destructive",
      })
    }
  }

  const deleteAllocationHandler = async (id: string) => {
    try {
      const success = await deleteAllocation(id)
      if (success) {
        setAllocations(allocations.filter((alloc) => alloc.id !== id))
        toast({
          title: "Success",
          description: "Allocation deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting allocation:", error)
      toast({
        title: "Error",
        description: "Failed to delete allocation",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  if (!dbInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg dark:bg-gray-900">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Database Setup Required</h2>
          <p className="text-gray-600 mb-6">
            The database tables for this application need to be created. Click the button below to initialize the
            database.
          </p>
          <Button
            onClick={initializeDatabase}
            disabled={initializingDb}
            className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200 dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow"
          >
            {initializingDb ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Initializing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Initialize Database
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3 sm:mb-0">
          <div className="flex items-center">
            <img
              src="/New_South_Wales_Government_logo.svg.png"
              alt="New South Wales Government Logo"
              className="h-6 sm:h-8 w-auto mr-2"
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white dark:neon-text">Land iQ Responsibility</h1>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="dark:text-white dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex gap-2 items-center">
          <ThemeToggle />
          <Button onClick={() => setGroupDialogOpen(true)} size="sm" className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Group
          </Button>
          <Button
            onClick={() => setCategoryDialogOpen(true)}
            size="sm"
            className="bg-gray-800 hover:bg-gray-700 text-white dark:bg-pink-600 dark:hover:bg-pink-700 dark:neon-pink-glow"
            disabled={groups.length === 0}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
          <Button
            onClick={() => setPersonDialogOpen(true)}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:neon-green-glow"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Person
          </Button>
          <Button
            onClick={() => setAllocationDialogOpen(true)}
            size="sm"
            className="bg-gray-600 hover:bg-gray-500 text-white dark:bg-purple-600 dark:hover:bg-purple-700 dark:neon-purple-glow"
            disabled={categories.length === 0 || people.length === 0}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Allocation
          </Button>
        </div>

        {/* Mobile Action Buttons */}
        {mobileMenuOpen && (
          <div className="sm:hidden flex flex-col gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={() => {setGroupDialogOpen(true); setMobileMenuOpen(false)}} size="sm" className="bg-black hover:bg-gray-800 text-white w-full justify-start dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Group
            </Button>
            <Button
              onClick={() => {setCategoryDialogOpen(true); setMobileMenuOpen(false)}}
              size="sm"
              className="bg-gray-800 hover:bg-gray-700 text-white w-full justify-start dark:bg-pink-600 dark:hover:bg-pink-700 dark:neon-pink-glow"
              disabled={groups.length === 0}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button
              onClick={() => {setPersonDialogOpen(true); setMobileMenuOpen(false)}}
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white w-full justify-start dark:bg-green-600 dark:hover:bg-green-700 dark:neon-green-glow"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Person
            </Button>
            <Button
              onClick={() => {setAllocationDialogOpen(true); setMobileMenuOpen(false)}}
              size="sm"
              className="bg-gray-600 hover:bg-gray-500 text-white w-full justify-start dark:bg-purple-600 dark:hover:bg-purple-700 dark:neon-purple-glow"
              disabled={categories.length === 0 || people.length === 0}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Allocation
            </Button>
          </div>
        )}
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("orgchart")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "orgchart"
                ? "border-black text-black dark:border-cyan-400 dark:text-cyan-400 dark:neon-text"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300 dark:text-gray-400 dark:hover:text-cyan-400 dark:hover:border-cyan-400",
            )}
          >
            <Grid3X3 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Orgchart</span>
            <span className="sm:hidden">Chart</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "groups"
                ? "border-black text-black dark:border-pink-400 dark:text-pink-400 dark:neon-text"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:border-pink-400",
            )}
          >
            <Layers className="mr-2 h-4 w-4" />
            Groups
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "categories"
                ? "border-black text-black dark:border-green-400 dark:text-green-400 dark:neon-text"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300 dark:text-gray-400 dark:hover:text-green-400 dark:hover:border-green-400",
            )}
          >
            <Layers className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
            <span className="sm:hidden">Cats</span>
          </button>
          <button
            onClick={() => setActiveTab("people")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "people"
                ? "border-black text-black dark:border-purple-400 dark:text-purple-400 dark:neon-text"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:border-purple-400",
            )}
          >
            <Users className="mr-2 h-4 w-4" />
            People
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "analytics"
                ? "border-black text-black dark:border-yellow-400 dark:text-yellow-400 dark:neon-text"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300 dark:text-gray-400 dark:hover:text-yellow-400 dark:hover:border-yellow-400",
            )}
          >
            <BarChart className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden dark:bg-gray-900">
        {activeTab === "orgchart" && (
          <div className="h-full">
            <OrgChart
              groups={groups}
              categories={categories}
              people={people}
              allocations={allocations}
              onDeleteAllocation={deleteAllocationHandler}
              onAddGroup={() => setGroupDialogOpen(true)}
              onAddCategory={() => setCategoryDialogOpen(true)}
              onAddAllocation={() => setAllocationDialogOpen(true)}
            />
          </div>
        )}

        {activeTab === "groups" && (
          <div className="h-full">
            <GroupsTable groups={groups} onEdit={updateGroupHandler} onDelete={deleteGroupHandler} />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="h-full">
            <CategoriesTable
              categories={categories}
              groups={groups}
              onEdit={updateCategoryHandler}
              onDelete={deleteCategoryHandler}
            />
          </div>
        )}

        {activeTab === "people" && (
          <div className="h-full">
            <PeopleTable people={people} onEdit={updatePersonHandler} onDelete={deletePersonHandler} />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="h-full">
            <ResponsibilityChart people={people} allocations={allocations} />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <GroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} onSave={addGroup} />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSave={addCategory}
        groups={groups}
      />

      <PersonDialog open={personDialogOpen} onOpenChange={setPersonDialogOpen} onSave={addPerson} />

      <AllocationDialog
        open={allocationDialogOpen}
        onOpenChange={setAllocationDialogOpen}
        onSave={addAllocationHandler}
        categories={categories}
        people={people}
      />
    </div>
  )
}
