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
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  PlusCircle, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  Users,
  Workflow
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Task, WorkflowStep, TaskAllocation, Group, Category, Person } from "@/lib/types"
import { TaskDialog } from "@/components/task-dialog"
import { WorkflowStepDialog } from "@/components/workflow-step-dialog"
import { TaskAllocationDialog } from "@/components/task-allocation-dialog"
import {
  fetchTasksByCategory,
  fetchWorkflowSteps,
  fetchTaskAllocations,
  createTask,
  updateTask,
  deleteTask,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  createTaskAllocation,
  deleteTaskAllocation,
  getPeopleAllocatedToCategory,
} from "@/lib/data-service"
import { useToast } from "@/hooks/use-toast"

interface TasksViewProps {
  groups: Group[]
  categories: Category[]
  people: Person[]
  isAdmin: boolean
}

export default function TasksView({ groups, categories, people, isAdmin }: TasksViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [tasks, setTasks] = useState<Task[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<Record<string, WorkflowStep[]>>({})
  const [taskAllocations, setTaskAllocations] = useState<Record<string, TaskAllocation[]>>({})
  const [availablePeople, setAvailablePeople] = useState<Person[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false)
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [editingStep, setEditingStep] = useState<WorkflowStep | undefined>(undefined)
  const [editingAllocation, setEditingAllocation] = useState<TaskAllocation | undefined>(undefined)

  const { toast } = useToast()

  // Get categories for selected group
  const filteredCategories = categories.filter(cat => cat.groupId === selectedGroupId)

  // Load tasks when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      loadTasksForCategory(selectedCategoryId)
      loadAvailablePeople(selectedCategoryId)
    } else {
      setTasks([])
      setWorkflowSteps({})
      setTaskAllocations({})
      setAvailablePeople([])
    }
  }, [selectedCategoryId])

  const loadTasksForCategory = async (categoryId: string) => {
    setLoading(true)
    try {
      const tasksData = await fetchTasksByCategory(categoryId)
      setTasks(tasksData)

      // Load workflow steps and allocations for each task
      const stepsData: Record<string, WorkflowStep[]> = {}
      const allocationsData: Record<string, TaskAllocation[]> = {}

      for (const task of tasksData) {
        const [steps, allocations] = await Promise.all([
          fetchWorkflowSteps(task.id),
          fetchTaskAllocations(task.id),
        ])
        stepsData[task.id] = steps
        allocationsData[task.id] = allocations
      }

      setWorkflowSteps(stepsData)
      setTaskAllocations(allocationsData)
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
        setWorkflowSteps(prev => ({ ...prev, [newTask.id]: [] }))
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

  const handleTaskSave = async (taskData: Omit<Task, "id" | "createdAt">) => {
    if (editingTask) {
      // Update existing task
      const fullTask: Task = {
        ...taskData,
        id: editingTask.id,
        createdAt: editingTask.createdAt
      }
      const updatedTask = await updateTask(fullTask)
      if (updatedTask) {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
        toast({
          title: "Success",
          description: "Task updated successfully.",
        })
      }
    } else {
      // Create new task
      await handleCreateTask(taskData)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId)
      if (success) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setWorkflowSteps(prev => {
          const newSteps = { ...prev }
          delete newSteps[taskId]
          return newSteps
        })
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

  // Workflow step operations
  const handleCreateWorkflowStep = async (stepData: Omit<WorkflowStep, "id" | "createdAt">) => {
    try {
      const newStep = await createWorkflowStep(stepData)
      if (newStep) {
        setWorkflowSteps(prev => ({
          ...prev,
          [stepData.taskId]: [...(prev[stepData.taskId] || []), newStep].sort((a, b) => a.order - b.order)
        }))
        toast({
          title: "Success",
          description: "Workflow step created successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workflow step. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStepSave = async (stepData: Omit<WorkflowStep, "id" | "createdAt">) => {
    if (editingStep) {
      // Update existing step
      const fullStep: WorkflowStep = {
        ...stepData,
        id: editingStep.id,
        createdAt: editingStep.createdAt
      }
      const updatedStep = await updateWorkflowStep(fullStep)
      if (updatedStep) {
        setWorkflowSteps(prev => ({
          ...prev,
          [stepData.taskId]: (prev[stepData.taskId] || [])
            .map(s => s.id === updatedStep.id ? updatedStep : s)
            .sort((a, b) => a.order - b.order)
        }))
        toast({
          title: "Success",
          description: "Workflow step updated successfully.",
        })
      }
    } else {
      // Create new step
      await handleCreateWorkflowStep(stepData)
    }
  }

  const handleDeleteWorkflowStep = async (stepId: string, taskId: string) => {
    try {
      const success = await deleteWorkflowStep(stepId)
      if (success) {
        setWorkflowSteps(prev => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter(s => s.id !== stepId)
        }))
        toast({
          title: "Success",
          description: "Workflow step deleted successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete workflow step. Please try again.",
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
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 border-red-200"
      case "high": return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200"
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200"
      case "on_hold": return "bg-orange-100 text-orange-800 border-orange-200"
      case "not_started": return "bg-gray-100 text-gray-800 border-gray-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4" />
      case "in_progress": return <Play className="h-4 w-4" />
      case "on_hold": return <Pause className="h-4 w-4" />
      case "not_started": return <Circle className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const getWorkflowProgress = (steps: WorkflowStep[]) => {
    if (steps.length === 0) return 0
    const completedSteps = steps.filter(s => s.status === "completed").length
    return (completedSteps / steps.length) * 100
  }

  const getPersonName = (personId: string) => {
    const person = people.find(p => p.id === personId) || availablePeople.find(p => p.id === personId)
    return person?.name || "Unknown"
  }

  const getNextStepOrder = (taskId: string) => {
    const steps = workflowSteps[taskId] || []
    return steps.length > 0 ? Math.max(...steps.map(s => s.order)) + 1 : 1
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-gray-600">Manage tasks and workflows for your categories</p>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex gap-4 p-6 border-b bg-gray-50">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Select Group</label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a group" />
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
          <label className="block text-sm font-medium mb-2">Select Category</label>
          <Select 
            value={selectedCategoryId} 
            onValueChange={setSelectedCategoryId}
            disabled={!selectedGroupId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && selectedCategoryId && (
          <div className="flex items-end">
            <Button 
              onClick={() => {
                setEditingTask(undefined)
                setTaskDialogOpen(true)
              }}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Tasks Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedCategoryId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Category Selected</h3>
              <p className="text-gray-600">Please select a group and category to view tasks.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first task for this category to get started.
              </p>
              {isAdmin && (
                <Button 
                  onClick={() => {
                    setEditingTask(undefined)
                    setTaskDialogOpen(true)
                  }}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create First Task
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {tasks.map((task) => {
                const steps = workflowSteps[task.id] || []
                const allocations = taskAllocations[task.id] || []
                const progress = getWorkflowProgress(steps)
                
                return (
                  <Card key={task.id} className="w-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{task.name}</CardTitle>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          <CardDescription>{task.description}</CardDescription>
                        </div>
                        
                        {isAdmin && (
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
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{allocations.length} people assigned</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Workflow className="h-4 w-4" />
                          <span>{steps.length} workflow steps</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Task Allocations */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Assigned People</h4>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task)
                                setEditingAllocation(undefined)
                                setAllocationDialogOpen(true)
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          )}
                        </div>
                        
                        {allocations.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {allocations.map((allocation) => (
                              <Badge key={allocation.id} variant="secondary" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {getPersonName(allocation.personId)}
                                {allocation.isLead && <span className="text-xs">(Lead)</span>}
                                {allocation.hoursAllocated && (
                                  <span className="text-xs">({allocation.hoursAllocated}h)</span>
                                )}
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1"
                                    onClick={() => handleDeleteTaskAllocation(allocation.id, task.id)}
                                  >
                                    ×
                                  </Button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No one assigned yet</p>
                        )}
                      </div>

                      {/* Workflow Progress */}
                      {steps.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Workflow Progress</h4>
                            <span className="text-sm text-gray-600">{Math.round(progress)}% complete</span>
                          </div>
                          <Progress value={progress} className="mb-3" />
                        </div>
                      )}

                      {/* Workflow Steps */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Workflow Steps</h4>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task)
                                setEditingStep(undefined)
                                setWorkflowDialogOpen(true)
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Add Step
                            </Button>
                          )}
                        </div>
                        
                        {steps.length > 0 ? (
                          <div className="space-y-2">
                            {steps.map((step, index) => (
                              <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-500">#{step.order}</span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{step.name}</span>
                                      <Badge 
                                        variant={step.status === "completed" ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {step.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    {step.description && (
                                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                      {step.responsiblePersonId && (
                                        <span>Assigned: {getPersonName(step.responsiblePersonId)}</span>
                                      )}
                                      {step.estimatedHours && (
                                        <span>Est: {step.estimatedHours}h</span>
                                      )}
                                      {step.actualHours && (
                                        <span>Actual: {step.actualHours}h</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {isAdmin && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTask(task)
                                        setEditingStep(step)
                                        setWorkflowDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteWorkflowStep(step.id, task.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No workflow steps defined yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialogs */}
      {isAdmin && (
        <>
          <TaskDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            onSave={handleTaskSave}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            task={editingTask}
          />

          {selectedTask && (
            <>
              <WorkflowStepDialog
                open={workflowDialogOpen}
                onOpenChange={setWorkflowDialogOpen}
                onSave={handleStepSave}
                availablePeople={availablePeople}
                taskId={selectedTask.id}
                step={editingStep}
                nextOrder={getNextStepOrder(selectedTask.id)}
              />

              <TaskAllocationDialog
                open={allocationDialogOpen}
                onOpenChange={setAllocationDialogOpen}
                onSave={handleCreateTaskAllocation}
                availablePeople={availablePeople}
                taskId={selectedTask.id}
                allocation={editingAllocation}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
