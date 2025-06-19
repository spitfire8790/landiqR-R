"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Users, Clock, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast"; // Fix useToast import
import { TaskDialog } from "@/components/task-dialog";
import { ResponsibilityDialog } from "@/components/responsibility-dialog";
import TaskAllocationDialog from "@/components/task-allocation-dialog";
import { WorkflowDialog } from "@/components/workflow-dialog";
import { WorkflowToolsDialog } from "@/components/workflow-tools-dialog";
import type {
  Task,
  Responsibility,
  TaskAllocation,
  TaskSourceLink,
  Group,
  Category,
  Person,
} from "@/lib/types";
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
  createTaskSourceLink,
} from "@/lib/data-service";
import { format } from "date-fns";
import { cn, getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";
import {
  PlusCircle,
  Calendar,
  Clock as ClockIcon,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Play,
  Pause,
  Edit as EditIcon,
  Trash2 as Trash2Icon,
  Users as UsersIcon,
  Workflow,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { getPeopleAllocatedToCategory } from "@/lib/data-service";

interface TasksViewProps {
  groups: Group[];
  categories: Category[];
  people: Person[];
  isAdmin: boolean;
}

export default function TasksView({
  groups,
  categories,
  people,
  isAdmin,
}: TasksViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [responsibilities, setResponsibilities] = useState<
    Record<string, Responsibility[]>
  >({});
  const [taskAllocations, setTaskAllocations] = useState<
    Record<string, TaskAllocation[]>
  >({});
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [responsibilityDialogOpen, setResponsibilityDialogOpen] =
    useState(false);
  const [taskAllocationDialogOpen, setTaskAllocationDialogOpen] =
    useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [editingResponsibility, setEditingResponsibility] = useState<
    Responsibility | undefined
  >();
  const [currentTaskId, setCurrentTaskId] = useState<string>("");
  const [availablePeople, setAvailablePeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Dialog states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Add state for workflow dialogs
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowToolsDialogOpen, setWorkflowToolsDialogOpen] = useState(false);
  const [workflowTask, setWorkflowTask] = useState<Task | null>(null);

  // Get categories for selected group (sorted alphabetically)
  const filteredCategories = categories
    .filter((cat) => cat.groupId === selectedGroupId)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get all categories (sorted alphabetically) for independent filtering
  const allCategories = categories.sort((a, b) => a.name.localeCompare(b.name));

  // Load tasks when category is selected or when showing all tasks
  useEffect(() => {
    if (selectedCategoryId === "all") {
      // Load all tasks
      loadTasksForCategory();
    } else if (selectedCategoryId) {
      // Load tasks for specific category
      loadTasksForCategory(selectedCategoryId);
      loadAvailablePeople(selectedCategoryId);
    } else if (selectedGroupId) {
      // Load tasks for all categories in the selected group
      loadTasksForGroup(selectedGroupId);
    } else {
      setTasks([]);
      setResponsibilities({});
      setTaskAllocations({});
      setAvailablePeople([]);
    }
  }, [selectedCategoryId, selectedGroupId]);

  const loadTasksForCategory = async (categoryId?: string) => {
    setLoading(true);
    try {
      const tasksData = await fetchTasksByCategory(categoryId);
      setTasks(tasksData);

      // Load responsibilities and allocations for each task
      const responsibilitiesData: Record<string, Responsibility[]> = {};
      const allocationsData: Record<string, TaskAllocation[]> = {};

      for (const task of tasksData) {
        const [taskResponsibilities, allocations] = await Promise.all([
          fetchResponsibilities(task.id),
          fetchTaskAllocations(task.id),
        ]);
        responsibilitiesData[task.id] = taskResponsibilities;
        allocationsData[task.id] = allocations;
      }

      setResponsibilities(responsibilitiesData);
      setTaskAllocations(allocationsData);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTasksForGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const tasksData = await Promise.all(
        categories
          .filter((cat) => cat.groupId === groupId)
          .map((cat) => fetchTasksByCategory(cat.id))
      );
      setTasks(tasksData.flat());

      // Load responsibilities and allocations for each task
      const responsibilitiesData: Record<string, Responsibility[]> = {};
      const allocationsData: Record<string, TaskAllocation[]> = {};

      for (const task of tasksData.flat()) {
        const [taskResponsibilities, allocations] = await Promise.all([
          fetchResponsibilities(task.id),
          fetchTaskAllocations(task.id),
        ]);
        responsibilitiesData[task.id] = taskResponsibilities;
        allocationsData[task.id] = allocations;
      }

      setResponsibilities(responsibilitiesData);
      setTaskAllocations(allocationsData);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePeople = async (categoryId: string) => {
    try {
      const people = await getPeopleAllocatedToCategory(categoryId);
      setAvailablePeople(people);
    } catch (error) {
      console.error("Error loading available people:", error);
    }
  };

  const handleRefreshTasks = async () => {
    await loadTasksForCategory(selectedCategoryId);
  };

  // Task CRUD operations
  const handleCreateTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    try {
      const newTask = await createTask(taskData);
      if (newTask) {
        await loadTasksForCategory(selectedCategoryId);
        toast({
          title: "Success",
          description: "Task created successfully.",
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskSave = async (
    taskData: Omit<Task, "id" | "createdAt">,
    sourceLinks?: Omit<TaskSourceLink, "id" | "taskId" | "createdAt">[]
  ) => {
    try {
      if (editingTask) {
        const updatedTask = await updateTask({ ...editingTask, ...taskData });
        if (updatedTask) {
          await loadTasksForCategory(selectedCategoryId);
          toast({
            title: "Success",
            description: "Task updated successfully.",
          });
        }
      } else {
        // Create new task
        const newTask = await createTask(taskData);
        if (newTask && sourceLinks && sourceLinks.length > 0) {
          // Create source links for the new task
          for (const linkData of sourceLinks) {
            await createTaskSourceLink({
              taskId: newTask.id,
              url: linkData.url,
              description: linkData.description,
            });
          }
        }
        if (newTask) {
          await loadTasksForCategory(selectedCategoryId);
          toast({
            title: "Success",
            description: "Task created successfully.",
          });
        }
      }
      setTaskDialogOpen(false);
      setEditingTask(undefined);
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId);
      if (success) {
        await loadTasksForCategory(selectedCategoryId);
        toast({
          title: "Success",
          description: "Task deleted successfully.",
        });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Responsibility operations
  const handleCreateResponsibility = async (
    responsibilityData: Omit<Responsibility, "id" | "createdAt">
  ) => {
    try {
      const newResponsibility = await createResponsibility(responsibilityData);
      if (newResponsibility && selectedTask) {
        const taskResponsibilities = await fetchResponsibilities(
          selectedTask.id
        );
        setResponsibilities((prev) => ({
          ...prev,
          [selectedTask.id]: taskResponsibilities,
        }));
        toast({
          title: "Success",
          description: "Responsibility created successfully.",
        });
      }
    } catch (error) {
      console.error("Error creating responsibility:", error);
      toast({
        title: "Error",
        description: "Failed to create responsibility. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResponsibilitySave = async (
    responsibilityData: Omit<Responsibility, "id" | "createdAt">
  ) => {
    try {
      if (editingResponsibility) {
        const updatedResponsibility = await updateResponsibility({
          ...editingResponsibility,
          ...responsibilityData,
        });
        if (updatedResponsibility && selectedTask) {
          const taskResponsibilities = await fetchResponsibilities(
            selectedTask.id
          );
          setResponsibilities((prev) => ({
            ...prev,
            [selectedTask.id]: taskResponsibilities,
          }));
          toast({
            title: "Success",
            description: "Responsibility updated successfully.",
          });
        }
      } else {
        await handleCreateResponsibility(responsibilityData);
      }
      setResponsibilityDialogOpen(false);
      setEditingResponsibility(undefined);
    } catch (error) {
      console.error("Error saving responsibility:", error);
      toast({
        title: "Error",
        description: "Failed to save responsibility. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResponsibility = async (
    responsibilityId: string,
    taskId: string
  ) => {
    try {
      const success = await deleteResponsibility(responsibilityId);
      if (success) {
        const taskResponsibilities = await fetchResponsibilities(taskId);
        setResponsibilities((prev) => ({
          ...prev,
          [taskId]: taskResponsibilities,
        }));
        toast({
          title: "Success",
          description: "Responsibility deleted successfully.",
        });
      }
    } catch (error) {
      console.error("Error deleting responsibility:", error);
      toast({
        title: "Error",
        description: "Failed to delete responsibility. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Task allocation operations
  const handleCreateTaskAllocation = async (
    allocationData: Omit<TaskAllocation, "id" | "createdAt">
  ) => {
    try {
      const newAllocation = await createTaskAllocation(allocationData);
      if (newAllocation && selectedTask) {
        const allocations = await fetchTaskAllocations(selectedTask.id);
        setTaskAllocations((prev) => ({
          ...prev,
          [selectedTask.id]: allocations,
        }));
        toast({
          title: "Success",
          description: "Task allocation created successfully.",
        });
      }
      setTaskAllocationDialogOpen(false);
      setEditingResponsibility(undefined);
    } catch (error) {
      console.error("Error creating task allocation:", error);
      toast({
        title: "Error",
        description: "Failed to create task allocation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTaskAllocation = async (
    allocationId: string,
    taskId: string
  ) => {
    try {
      const success = await deleteTaskAllocation(allocationId);
      if (success) {
        const allocations = await fetchTaskAllocations(taskId);
        setTaskAllocations((prev) => ({
          ...prev,
          [taskId]: allocations,
        }));
        toast({
          title: "Success",
          description: "Task allocation deleted successfully.",
        });
      }
    } catch (error) {
      console.error("Error deleting task allocation:", error);
      toast({
        title: "Error",
        description: "Failed to delete task allocation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions
  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.name : "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage tasks and responsibilities for your categories
          </p>
        </div>
      </div>

      {/* Group and Category Selection */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a group (optional)" />
            </SelectTrigger>
            <SelectContent>
              {groups
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {selectedGroupId
                ? // Show categories for selected group
                  filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                : // Show all categories when no group is selected
                  allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {selectedCategoryId && selectedCategoryId !== "all" && (
            <Button onClick={() => setTaskDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
          <Button onClick={handleRefreshTasks}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No tasks found for the selected category.
            </p>
            {selectedCategoryId && selectedCategoryId !== "all" && (
              <Button className="mt-4" onClick={() => setTaskDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create First Task
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {tasks.map((task) => {
                const taskResponsibilities = responsibilities[task.id] || [];
                const allocations = taskAllocations[task.id] || [];
                const totalWeeklyHours = taskResponsibilities.reduce(
                  (sum, resp) => sum + resp.estimatedWeeklyHours,
                  0
                );

                return (
                  <Card key={task.id} className="w-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-xl">{task.name}</CardTitle>
                          <CardDescription>{task.description}</CardDescription>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              <span>{task.hoursPerWeek}h/week</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Workflow className="h-4 w-4" />
                              <span>
                                {taskResponsibilities.length} responsibilities
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UsersIcon className="h-4 w-4" />
                              <span>{allocations.length} allocated</span>
                            </div>
                            {totalWeeklyHours > 0 && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                <span>{totalWeeklyHours}h total estimated</span>
                              </div>
                            )}
                            {task.sourceLinks &&
                              task.sourceLinks.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="text-sm text-gray-600">
                                    {task.sourceLinks.length} source
                                    {task.sourceLinks.length > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setEditingTask(task);
                              setTaskDialogOpen(true);
                            }}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWorkflowTask(task);
                              setWorkflowDialogOpen(true);
                            }}
                          >
                            <Workflow className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWorkflowToolsDialogOpen(true)}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Task Allocations */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            Task Allocations
                          </h4>
                          {selectedCategoryId &&
                            selectedCategoryId !== "all" &&
                            isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setTaskAllocationDialogOpen(true);
                                }}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Person
                              </Button>
                            )}
                        </div>

                        {allocations.length > 0 ? (
                          <div className="space-y-2">
                            {allocations.map((allocation) => (
                              <div
                                key={allocation.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span className="text-sm">
                                    {getPersonName(allocation.personId)}
                                  </span>
                                  {(() => {
                                    const person = people.find(
                                      (p) => p.id === allocation.personId
                                    );
                                    return person &&
                                      getOrganizationLogo(
                                        person.organisation
                                      ) ? (
                                      <Image
                                        src={getOrganizationLogo(
                                          person.organisation
                                        )}
                                        alt={`${person.organisation} logo`}
                                        width={12}
                                        height={12}
                                        className="flex-shrink-0"
                                      />
                                    ) : null;
                                  })()}
                                  {allocation.isLead && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Lead
                                    </Badge>
                                  )}
                                  {allocation.estimatedWeeklyHours > 0 && (
                                    <span className="text-xs text-gray-500">
                                      ({allocation.estimatedWeeklyHours}h/week)
                                    </span>
                                  )}
                                </div>

                                {selectedCategoryId &&
                                  selectedCategoryId !== "all" &&
                                  isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteTaskAllocation(
                                          allocation.id,
                                          task.id
                                        )
                                      }
                                    >
                                      <Trash2Icon className="h-4 w-4" />
                                    </Button>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No people allocated yet
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Source Links */}
                      {task.sourceLinks && task.sourceLinks.length > 0 && (
                        <>
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">
                              Source Links
                            </h4>
                            <div className="space-y-2">
                              {task.sourceLinks.map((link) => (
                                <div
                                  key={link.id}
                                  className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(link.url, "_blank")
                                    }
                                    className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                  </Button>
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                      title={link.url}
                                    >
                                      {link.url}
                                    </a>
                                    {link.description && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {link.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Responsibilities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            Responsibilities
                          </h4>
                          {selectedCategoryId &&
                            selectedCategoryId !== "all" &&
                            isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setEditingResponsibility(undefined);
                                  setResponsibilityDialogOpen(true);
                                }}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Responsibility
                              </Button>
                            )}
                        </div>

                        {taskResponsibilities.length > 0 ? (
                          <div className="space-y-3">
                            {taskResponsibilities.map((responsibility) => (
                              <div
                                key={responsibility.id}
                                className="flex items-start justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-start gap-2">
                                    <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {responsibility.description}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        {responsibility.assignedPersonId && (
                                          <span className="flex items-center gap-1">
                                            <span>
                                              Assigned:{" "}
                                              {getPersonName(
                                                responsibility.assignedPersonId
                                              )}
                                            </span>
                                            {(() => {
                                              const person = people.find(
                                                (p) =>
                                                  p.id ===
                                                  responsibility.assignedPersonId
                                              );
                                              return person &&
                                                getOrganizationLogo(
                                                  person.organisation
                                                ) ? (
                                                <Image
                                                  src={getOrganizationLogo(
                                                    person.organisation
                                                  )}
                                                  alt={`${person.organisation} logo`}
                                                  width={10}
                                                  height={10}
                                                  className="flex-shrink-0"
                                                />
                                              ) : null;
                                            })()}
                                          </span>
                                        )}
                                        {responsibility.estimatedWeeklyHours >
                                          0 && (
                                          <span>
                                            Est:{" "}
                                            {
                                              responsibility.estimatedWeeklyHours
                                            }
                                            h/week
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {selectedCategoryId &&
                                  selectedCategoryId !== "all" &&
                                  isAdmin && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTask(task);
                                          setEditingResponsibility(
                                            responsibility
                                          );
                                          setResponsibilityDialogOpen(true);
                                        }}
                                      >
                                        <EditIcon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteResponsibility(
                                            responsibility.id,
                                            task.id
                                          )
                                        }
                                      >
                                        <Trash2Icon className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No responsibilities defined yet
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialogs */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleTaskSave}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        task={editingTask}
      />

      {selectedCategoryId && selectedCategoryId !== "all" && (
        <>
          {selectedTask && (
            <>
              <ResponsibilityDialog
                open={responsibilityDialogOpen}
                onOpenChange={setResponsibilityDialogOpen}
                onSave={handleResponsibilitySave}
                availablePeople={availablePeople}
                taskId={selectedTask.id}
                responsibility={editingResponsibility}
              />

              <TaskAllocationDialog
                open={taskAllocationDialogOpen}
                onOpenChange={setTaskAllocationDialogOpen}
                onSave={handleCreateTaskAllocation}
                availablePeople={availablePeople}
                taskId={selectedTask.id}
                allocation={undefined}
              />
            </>
          )}
        </>
      )}

      {workflowTask && (
        <WorkflowDialog
          open={workflowDialogOpen}
          onOpenChange={(open) => {
            setWorkflowDialogOpen(open);
            if (!open) setWorkflowTask(null);
          }}
          task={workflowTask}
          people={people}
        />
      )}
      <WorkflowToolsDialog
        open={workflowToolsDialogOpen}
        onOpenChange={setWorkflowToolsDialogOpen}
      />
    </div>
  );
}
