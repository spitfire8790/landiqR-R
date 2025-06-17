"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  PlusCircle, 
  User, 
  Edit,
  Trash2,
  Users,
  Clock,
  AlertCircle,
  ArrowUpDown,
  ExternalLinkIcon,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task, Responsibility, TaskAllocation, Group, Category, Person } from "@/lib/types"
import { SimpleTaskDialog } from "@/components/simple-task-dialog"
import { ResponsibilityDialog } from "@/components/responsibility-dialog"
import { TaskAllocationDialog } from "@/components/task-allocation-dialog"
import {
  fetchTasksByCategory,
  fetchResponsibilities,
  fetchTaskAllocations,
  createTask,
  updateTask,
  deleteTask,
  createResponsibility,
  updateResponsibility,
  deleteResponsibility,
  createTaskAllocation,
  deleteTaskAllocation,
  getPeopleAllocatedToCategory,
} from "@/lib/data-service"
import { useToast } from "@/hooks/use-toast"

interface SimpleTasksViewProps {
  groups: Group[]
  categories: Category[]
  people: Person[]
  isAdmin: boolean
}

type SortOption = 'name-asc' | 'name-desc' | 'created-asc' | 'created-desc' | 'hours-asc' | 'hours-desc'

export default function SimpleTasksView({ groups, categories, people, isAdmin }: SimpleTasksViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskAllocations, setTaskAllocations] = useState<Record<string, TaskAllocation[]>>({})
  const [forceUpdate, setForceUpdate] = useState<number>(0)
  const [availablePeople, setAvailablePeople] = useState<Person[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [editingAllocation, setEditingAllocation] = useState<TaskAllocation | undefined>(undefined)

  const { toast } = useToast()

  // Get categories for selected group
  const filteredCategories = categories.filter(cat => cat.groupId === selectedGroupId)

  // Load tasks when category is selected or when showing all tasks
  useEffect(() => {
    if (selectedCategoryId === "all") {
      // Load all tasks
      loadTasksForCategory()
      // No specific people to load for "all" view
      setAvailablePeople([])
    } else if (selectedCategoryId) {
      // Load tasks for specific category
      loadTasksForCategory(selectedCategoryId)
      loadAvailablePeople(selectedCategoryId)
    } else {
      setTasks([])
      setTaskAllocations({})
      setAvailablePeople([])
    }
  }, [selectedCategoryId])

  const loadTasksForCategory = async (categoryId?: string) => {
    setLoading(true)
    try {
      console.log(`Loading tasks for category: ${categoryId || 'all'}`);
      const tasksData = await fetchTasksByCategory(categoryId)
      console.log(`Fetched ${tasksData.length} tasks:`, tasksData);
      
      // Load allocations for each task
      const allocationsData: Record<string, TaskAllocation[]> = {}

      for (const task of tasksData) {
        const allocations = await fetchTaskAllocations(task.id)
        console.log(`Fetched ${allocations.length} allocations for task ${task.id}:`, allocations);
        allocationsData[task.id] = allocations
      }

      // Update both states at once to ensure consistent UI
      console.log('Updating tasks and allocations state with:', { tasks: tasksData, allocations: allocationsData });
      setTasks(tasksData)
      setTaskAllocations(allocationsData)
      
      // Force a re-render by updating a dummy state
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error("Error loading tasks:", error)
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailablePeople = async (categoryId: string) => {
    try {
      const peopleData = await getPeopleAllocatedToCategory(categoryId)
      setAvailablePeople(peopleData)
    } catch (error) {
      console.error("Error loading available people:", error)
    }
  }

  // Task CRUD operations
  const handleCreateTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    try {
      const newTask = await createTask(taskData)
      if (newTask) {
        setTasks(prev => [...prev, newTask])
        setTaskAllocations(prev => ({ ...prev, [newTask.id]: [] }))
        toast({
          title: "Success",
          description: "Task created successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleTaskSave = async (taskData: Omit<Task, "id" | "createdAt">, allocatedPeople: string[]) => {
    try {
      if (editingTask) {
        // Update existing task
        console.log("Updating existing task:", { ...editingTask, ...taskData });
        const updatedTask = await updateTask({
          ...editingTask,
          ...taskData,
        })

        if (updatedTask) {
          console.log("Task updated successfully:", updatedTask);
          
          // Update task allocations and wait for it to complete
          const updatedAllocations = await updateTaskAllocations(updatedTask.id, allocatedPeople);
          console.log("Updated allocations:", updatedAllocations);
          
          // Update local state immediately
          setTasks(prevTasks => {
            const newTasks = prevTasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            );
            console.log("Updated tasks state:", newTasks);
            return newTasks;
          });
          
          setTaskAllocations(prev => {
            const newAllocations = {
              ...prev,
              [updatedTask.id]: updatedAllocations
            };
            console.log("Updated allocations state:", newAllocations);
            return newAllocations;
          });
          
          // Force a re-render
          setForceUpdate(prev => prev + 1);
          
          // Also refresh from database to ensure everything is in sync
          await loadTasksForCategory(selectedCategoryId === "all" ? undefined : selectedCategoryId);

          toast({
            title: "Success",
            description: "Task updated successfully",
          })
        }
      } else {
        // Create new task
        console.log("Creating new task:", taskData);
        const newTask = await createTask(taskData)

        if (newTask) {
          console.log("New task created:", newTask);
          
          // Create task allocations and wait for it to complete
          const newAllocations = await updateTaskAllocations(newTask.id, allocatedPeople);
          console.log("New allocations created:", newAllocations);
          
          // Update local state immediately
          setTasks(prevTasks => {
            const newTasks = [...prevTasks, newTask];
            console.log("Updated tasks state with new task:", newTasks);
            return newTasks;
          });
          
          setTaskAllocations(prev => {
            const newAllocationState = {
              ...prev,
              [newTask.id]: newAllocations
            };
            console.log("Updated allocations state with new allocations:", newAllocationState);
            return newAllocationState;
          });
          
          // Force a re-render
          setForceUpdate(prev => prev + 1);
          
          // Also refresh from database to ensure everything is in sync
          await loadTasksForCategory(selectedCategoryId === "all" ? undefined : selectedCategoryId);
          console.log("Tasks reloaded after creation");

          toast({
            title: "Success",
            description: "Task created successfully",
          })
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setEditingTask(undefined);
    }
  }

  const updateTaskAllocations = async (taskId: string, allocatedPeople: string[]): Promise<TaskAllocation[]> => {
    try {
      console.log(`Updating allocations for task ${taskId}. People to allocate:`, allocatedPeople);
      
      // Fetch the latest allocations directly from the database to ensure we have the most up-to-date data
      const latestAllocations = await fetchTaskAllocations(taskId);
      console.log(`Current allocations from DB for task ${taskId}:`, latestAllocations);
      
      const currentPersonIds = latestAllocations.map(a => a.personId);
      
      // Find people to add and remove
      const peopleToAdd = allocatedPeople.filter(personId => !currentPersonIds.includes(personId));
      const peopleToRemove = currentPersonIds.filter(personId => !allocatedPeople.includes(personId));
      
      console.log(`People to add: ${peopleToAdd.length}, People to remove: ${peopleToRemove.length}`);
      
      // Remove old allocations
      for (const personId of peopleToRemove) {
        const allocation = latestAllocations.find(a => a.personId === personId);
        if (allocation) {
          console.log(`Removing allocation for person ${personId} from task ${taskId}`);
          const success = await deleteTaskAllocation(allocation.id);
          console.log(`Deletion success: ${success}`);
        }
      }
      
      // Add new allocations
      const newAllocations: TaskAllocation[] = [];
      for (const personId of peopleToAdd) {
        console.log(`Adding allocation for person ${personId} to task ${taskId}`);
        const newAllocation = await createTaskAllocation({
          taskId,
          personId,
          estimatedWeeklyHours: 0, // Default to 0, can be updated later if needed
          isLead: false
        });
        
        if (newAllocation) {
          console.log(`Successfully added allocation:`, newAllocation);
          newAllocations.push(newAllocation);
        } else {
          console.error(`Failed to add allocation for person ${personId} to task ${taskId}`);
        }
      }
      
      // Fetch the final allocations from the database to ensure we have the complete and correct list
      const finalAllocations = await fetchTaskAllocations(taskId);
      console.log(`Final allocations for task ${taskId} after updates:`, finalAllocations);
      
      // Update local state
      setTaskAllocations(prev => ({
        ...prev,
        [taskId]: finalAllocations
      }));
      
      return finalAllocations;
      
    } catch (error) {
      console.error("Error updating task allocations:", error);
      toast({
        title: "Error",
        description: "Failed to update task allocations.",
        variant: "destructive",
      });
      // Return empty array in case of error
      return [];
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId)
      if (success) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setTaskAllocations(prev => {
          const newAllocations = { ...prev }
          delete newAllocations[taskId]
          return newAllocations
        })
        toast({
          title: "Success",
          description: "Task deleted successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Task allocation operations
  const handleCreateTaskAllocation = async (allocationData: Omit<TaskAllocation, "id" | "createdAt">) => {
    try {
      const newAllocation = await createTaskAllocation(allocationData)
      if (newAllocation) {
        setTaskAllocations(prev => ({
          ...prev,
          [allocationData.taskId]: [...(prev[allocationData.taskId] || []), newAllocation]
        }))
        toast({
          title: "Success",
          description: "Task allocation created successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task allocation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTaskAllocation = async (allocationId: string, taskId: string) => {
    try {
      const success = await deleteTaskAllocation(allocationId)
      if (success) {
        setTaskAllocations(prev => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter(a => a.id !== allocationId)
        }))
        toast({
          title: "Success",
          description: "Task allocation deleted successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task allocation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Helper functions
  const getPersonName = (personId: string) => {
    const person = people.find(p => p.id === personId) || availablePeople.find(p => p.id === personId)
    return person?.name || "Unknown"
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || "Unknown"
  }

  // Helper: sort tasks
  const sortTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'created-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'created-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'hours-asc':
          return a.hoursPerWeek - b.hoursPerWeek
        case 'hours-desc':
          return b.hoursPerWeek - a.hoursPerWeek
        default:
          return 0
      }
    })
  }

  // Filter tasks by category
  const filterTasksByCategory = (tasks: Task[]) => {
    if (categoryFilter === "all") return tasks
    return tasks.filter(task => task.categoryId === categoryFilter)
  }

  const filteredTasks = filterTasksByCategory(tasks)
  const sortedTasks = sortTasks(filteredTasks)

  const handleSort = (field: string) => {
    let newSortOption: SortOption
    
    if (field === 'name') {
      newSortOption = sortOption === 'name-asc' ? 'name-desc' : 'name-asc'
    } else if (field === 'hours') {
      newSortOption = sortOption === 'hours-asc' ? 'hours-desc' : 'hours-asc'
    } else if (field === 'created') {
      newSortOption = sortOption === 'created-asc' ? 'created-desc' : 'created-asc'
    } else {
      return
    }
    
    setSortOption(newSortOption)
  }

  const SortIcon = ({ field }: { field: string }) => {
    let isActive = false
    let isAsc = true
    
    if (field === 'name') {
      isActive = sortOption.startsWith('name')
      isAsc = sortOption === 'name-asc'
    } else if (field === 'hours') {
      isActive = sortOption.startsWith('hours')
      isAsc = sortOption === 'hours-asc'
    } else if (field === 'created') {
      isActive = sortOption.startsWith('created')
      isAsc = sortOption === 'created-asc'
    }
    
    if (!isActive) return null
    return isAsc ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4">Tasks & Responsibilities</h2>
        
        {/* Selection Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select 
              value={selectedCategoryId} 
              onValueChange={setSelectedCategoryId}
              disabled={!selectedGroupId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategoryId && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="created-asc">Created (Oldest)</SelectItem>
                  <SelectItem value="created-desc">Created (Newest)</SelectItem>
                  <SelectItem value="hours-asc">Hours (Low-High)</SelectItem>
                  <SelectItem value="hours-desc">Hours (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Add Task Button */}
        {isAdmin && selectedCategoryId && selectedCategoryId !== "all" && (
          <Button 
            onClick={() => {
              setEditingTask(undefined)
              setTaskDialogOpen(true)
            }}
            className="mb-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 bg-gray-50 w-full">
        {!selectedCategoryId ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Select a group and category to view tasks</p>
            <p className="text-sm text-gray-400">Choose from the dropdowns above to get started</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th 
                      className="px-4 py-2 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      Name
                      <SortIcon field="name" />
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-left font-medium">Category</th>
                    <th 
                      className="px-4 py-2 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('hours')}
                    >
                      Hours/Week
                      <SortIcon field="hours" />
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Source</th>
                    <th className="px-4 py-2 text-left font-medium">Assigned To</th>
                    <th className="px-4 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const allocations = taskAllocations[task.id] || []
                    const category = categories.find(cat => cat.id === task.categoryId)
                    
                    // Get organization color for a person
                    const getOrgColor = (personId: string) => {
                      const person = people.find(p => p.id === personId) || availablePeople.find(p => p.id === personId)
                      if (!person) return "#6B7280" // gray fallback
                      
                      // Map organization names to colors
                      const orgColors = {
                        "PDNSW": "#3B82F6", // Blue
                        "WSP": "#EF4444", // Red
                        "Giraffe": "#F59E0B", // Orange
                      }
                      return orgColors[person.organisation as keyof typeof orgColors] || "#6B7280"
                    }
                    
                    return (
                      <tr key={task.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{task.name}</td>
                        <td className="px-4 py-2">{task.description}</td>
                        <td className="px-4 py-2">{category ? category.name : "-"}</td>
                        <td className="px-4 py-2">{task.hoursPerWeek}</td>
                        <td className="px-4 py-2">
                          {task.sourceLink ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(task.sourceLink, '_blank')}
                              className="p-1 h-auto"
                              title="View source material"
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {allocations.length > 0 ? (
                              allocations.map((allocation) => {
                                const personName = getPersonName(allocation.personId)
                                const orgColor = getOrgColor(allocation.personId)
                                return (
                                  <span
                                    key={allocation.id}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: orgColor }}
                                  >
                                    {personName}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-gray-400 text-sm">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTask(task)
                                setTaskDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Filter Controls */}
      {selectedGroupId && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Category:</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>
      )}

      {/* Dialogs */}
      {isAdmin && (
        <>
          <SimpleTaskDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            onSave={(taskData, allocatedPeople) => handleTaskSave(taskData, allocatedPeople)}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            availablePeople={selectedCategoryId === "all" ? people : availablePeople}
            task={editingTask}
            existingAllocations={editingTask ? taskAllocations[editingTask.id] || [] : []}
          />

          {selectedTask && (
            <TaskAllocationDialog
              open={allocationDialogOpen}
              onOpenChange={setAllocationDialogOpen}
              onSave={handleCreateTaskAllocation}
              availablePeople={availablePeople}
              taskId={selectedTask.id}
              allocation={editingAllocation}
            />
          )}
        </>
      )}
    </div>
  )
}
