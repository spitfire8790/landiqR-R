"use client";

import React, { useState, useEffect } from "react";
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
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  ExternalLink,
  RefreshCw,
  Layers,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  User,
  Edit as EditIcon,
  Trash2 as TrashIcon,
  Users as UsersIcon,
  Clock as ClockIcon,
  AlertCircle,
  ArrowUpDown,
  ExternalLinkIcon,
  ChevronUp,
  ChevronDown,
  Workflow,
  Wrench,
} from "lucide-react";
import { cn, getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";
import type {
  Task,
  Responsibility,
  TaskAllocation,
  TaskSourceLink,
  Group,
  Category,
  Person,
} from "@/lib/types";
import { TaskDialog } from "@/components/modals/task-dialog";
import { ResponsibilityDialog } from "@/components/modals/responsibility-dialog";
import TaskAllocationDialog from "@/components/modals/task-allocation-dialog";
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
} from "@/lib/data-service";
import { useToast } from "@/components/ui/use-toast";
import { WorkflowDialog } from "@/components/modals/workflow-dialog";
import { WorkflowToolsDialog } from "@/components/modals/workflow-tools-dialog";
import { exportTasks } from "@/lib/export-service";

interface TasksViewProps {
  groups: Group[];
  categories: Category[];
  people: Person[];
  isAdmin: boolean;
  selectedCategoryId?: string | null;
  onDataChange?: () => void;
}

type SortOption =
  | "name-asc"
  | "name-desc"
  | "created-asc"
  | "created-desc"
  | "hours-asc"
  | "hours-desc";

export default function TasksView({
  groups,
  categories,
  people,
  isAdmin,
  selectedCategoryId: initialSelectedCategoryId,
  onDataChange,
}: TasksViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAllocations, setTaskAllocations] = useState<
    Record<string, TaskAllocation[]>
  >({});
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [availablePeople, setAvailablePeople] = useState<Person[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [personFilter, setPersonFilter] = useState<string>("all");

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [editingAllocation, setEditingAllocation] = useState<
    TaskAllocation | undefined
  >(undefined);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowToolsDialogOpen, setWorkflowToolsDialogOpen] = useState(false);
  const [workflowTask, setWorkflowTask] = useState<Task | null>(null);

  const { toast } = useToast();

  // Debug logging
  useEffect(() => {
    console.log("TasksView received props:", {
      groupsCount: groups.length,
      categoriesCount: categories.length,
      peopleCount: people.length,
      isAdmin,
      selectedCategoryId: initialSelectedCategoryId,
    });
  }, [
    groups.length,
    categories.length,
    people.length,
    isAdmin,
    initialSelectedCategoryId,
  ]);

  // Handle initial category selection from prop
  useEffect(() => {
    if (initialSelectedCategoryId) {
      // Find the group that contains this category
      const category = categories.find(
        (cat) => cat.id === initialSelectedCategoryId
      );
      if (category) {
        setSelectedGroupId(category.groupId);
        setSelectedCategoryId(initialSelectedCategoryId);
        setCategoryFilter(initialSelectedCategoryId);
      }
    }
  }, [initialSelectedCategoryId, categories]);

  // Keep categoryFilter in sync with selectedCategoryId
  useEffect(() => {
    setCategoryFilter(selectedCategoryId);
  }, [selectedCategoryId]);

  // Get categories for selected group
  const filteredCategories =
    selectedGroupId === "all"
      ? categories // Show all categories when "All Groups" is selected
      : categories.filter((cat) => cat.groupId === selectedGroupId);

  // Load tasks when category is selected or when showing all tasks
  useEffect(() => {
    if (selectedCategoryId === "all") {
      // If "all" is selected and we have a group selected, load tasks for that group
      if (selectedGroupId && selectedGroupId !== "all") {
        loadTasksForGroup(selectedGroupId);
      } else {
        // Load all tasks across all categories
        loadTasksForCategory();
      }
      // No specific people to load for "all" view
      setAvailablePeople([]);
    } else if (selectedCategoryId) {
      // Load tasks for specific category
      loadTasksForCategory(selectedCategoryId);
      loadAvailablePeople(selectedCategoryId);
    } else {
      // Initial load - show all tasks if no category is selected yet
      loadTasksForCategory();
      setAvailablePeople([]);
    }
  }, [selectedCategoryId, selectedGroupId]);

  const loadTasksForCategory = async (categoryId?: string) => {
    setLoading(true);
    try {
      console.log(`Loading tasks for category: ${categoryId || "all"}`);
      const tasksData = await fetchTasksByCategory(categoryId);
      console.log(`Fetched ${tasksData.length} tasks:`, tasksData);

      // Load allocations for each task (but handle empty tasks list)
      const allocationsData: Record<string, TaskAllocation[]> = {};

      if (tasksData.length > 0) {
        for (const task of tasksData) {
          try {
            const allocations = await fetchTaskAllocations(task.id);
            console.log(
              `Fetched ${allocations.length} allocations for task ${task.id}:`,
              allocations
            );
            allocationsData[task.id] = allocations;
          } catch (allocationError) {
            console.error(
              `Error loading allocations for task ${task.id}:`,
              allocationError
            );
            allocationsData[task.id] = []; // Default to empty array on error
          }
        }
      }

      // Update both states at once to ensure consistent UI
      console.log("Updating tasks and allocations state with:", {
        tasks: tasksData,
        allocations: allocationsData,
      });
      setTasks(tasksData);
      setTaskAllocations(allocationsData);

      // Force a re-render by updating a dummy state
      setForceUpdate((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading tasks:", error);
      // Still update state to empty to clear loading
      setTasks([]);
      setTaskAllocations({});
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
      console.log(`Loading tasks for group: ${groupId}`);

      // Get all categories in the selected group
      const groupCategories = categories.filter(
        (cat) => cat.groupId === groupId
      );

      if (groupCategories.length === 0) {
        console.log(`No categories found for group: ${groupId}`);
        setTasks([]);
        setTaskAllocations({});
        return;
      }

      // Load tasks for all categories in the group
      const tasksData = await Promise.all(
        groupCategories.map((cat) => fetchTasksByCategory(cat.id))
      );
      const allTasks = tasksData.flat();

      console.log(`Fetched ${allTasks.length} tasks for group:`, allTasks);

      // Load allocations for each task
      const allocationsData: Record<string, TaskAllocation[]> = {};

      if (allTasks.length > 0) {
        for (const task of allTasks) {
          try {
            const allocations = await fetchTaskAllocations(task.id);
            console.log(
              `Fetched ${allocations.length} allocations for task ${task.id}:`,
              allocations
            );
            allocationsData[task.id] = allocations;
          } catch (allocationError) {
            console.error(
              `Error loading allocations for task ${task.id}:`,
              allocationError
            );
            allocationsData[task.id] = []; // Default to empty array on error
          }
        }
      }

      // Update both states at once to ensure consistent UI
      console.log("Updating tasks and allocations state with:", {
        tasks: allTasks,
        allocations: allocationsData,
      });
      setTasks(allTasks);
      setTaskAllocations(allocationsData);

      // Force a re-render by updating a dummy state
      setForceUpdate((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading tasks for group:", error);
      // Still update state to empty to clear loading
      setTasks([]);
      setTaskAllocations({});
      toast({
        title: "Error",
        description: "Failed to load tasks for group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePeople = async (categoryId: string) => {
    try {
      const peopleData = await getPeopleAllocatedToCategory(categoryId);
      setAvailablePeople(peopleData);
    } catch (error) {
      console.error("Error loading available people:", error);
    }
  };

  // Task CRUD operations
  const handleCreateTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    try {
      const newTask = await createTask(taskData);
      if (newTask) {
        setTasks([...tasks, newTask]);
        setTaskAllocations({
          ...taskAllocations,
          [newTask.id]: [],
        });

        // Notify parent component to refresh data
        if (onDataChange) onDataChange();

        toast({
          title: "Task created",
          description: `Task "${newTask.name}" has been created.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskSave = async (
    taskData: Omit<Task, "id" | "createdAt">,
    allocatedPeople: string[]
  ) => {
    try {
      if (editingTask) {
        // Update existing task
        console.log("Updating existing task:", { ...editingTask, ...taskData });
        const updatedTask = await updateTask({
          ...editingTask,
          ...taskData,
        });

        if (updatedTask) {
          console.log("Task updated successfully:", updatedTask);

          // Update task allocations and wait for it to complete
          const updatedAllocations = await updateTaskAllocations(
            updatedTask.id,
            allocatedPeople
          );
          console.log("Updated allocations:", updatedAllocations);

          // Update local state immediately
          setTasks((prevTasks) => {
            const newTasks = prevTasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            );
            console.log("Updated tasks state:", newTasks);
            return newTasks;
          });

          setTaskAllocations((prev) => {
            const newAllocations = {
              ...prev,
              [updatedTask.id]: updatedAllocations,
            };
            console.log("Updated allocations state:", newAllocations);
            return newAllocations;
          });

          // Force a re-render
          setForceUpdate((prev) => prev + 1);

          // Also refresh from database to ensure everything is in sync
          await loadTasksForCategory(
            selectedCategoryId === "all" ? undefined : selectedCategoryId
          );

          // Notify parent component to refresh data
          if (onDataChange) onDataChange();

          toast({
            title: "Success",
            description: "Task updated successfully",
          });
        }
      } else {
        // Create new task
        console.log("Creating new task:", taskData);
        const newTask = await createTask(taskData);

        if (newTask) {
          console.log("New task created:", newTask);

          // Create task allocations and wait for it to complete
          const newAllocations = await updateTaskAllocations(
            newTask.id,
            allocatedPeople
          );
          console.log("New allocations created:", newAllocations);

          // Update local state immediately
          setTasks((prevTasks) => {
            const newTasks = [...prevTasks, newTask];
            console.log("Updated tasks state with new task:", newTasks);
            return newTasks;
          });

          setTaskAllocations((prev) => {
            const newAllocationState = {
              ...prev,
              [newTask.id]: newAllocations,
            };
            console.log(
              "Updated allocations state with new allocations:",
              newAllocationState
            );
            return newAllocationState;
          });

          // Force a re-render
          setForceUpdate((prev) => prev + 1);

          // Also refresh from database to ensure everything is in sync
          await loadTasksForCategory(
            selectedCategoryId === "all" ? undefined : selectedCategoryId
          );
          console.log("Tasks reloaded after creation");

          // Notify parent component to refresh data
          if (onDataChange) onDataChange();

          toast({
            title: "Success",
            description: "Task created successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditingTask(undefined);
    }
  };

  const updateTaskAllocations = async (
    taskId: string,
    allocatedPeople: string[]
  ): Promise<TaskAllocation[]> => {
    try {
      console.log(
        `Updating allocations for task ${taskId}. People to allocate:`,
        allocatedPeople
      );

      // Fetch the latest allocations directly from the database to ensure we have the most up-to-date data
      const latestAllocations = await fetchTaskAllocations(taskId);
      console.log(
        `Current allocations from DB for task ${taskId}:`,
        latestAllocations
      );

      const currentPersonIds = latestAllocations.map((a) => a.personId);

      // Find people to add and remove
      const peopleToAdd = allocatedPeople.filter(
        (personId) => !currentPersonIds.includes(personId)
      );
      const peopleToRemove = currentPersonIds.filter(
        (personId) => !allocatedPeople.includes(personId)
      );

      console.log(
        `People to add: ${peopleToAdd.length}, People to remove: ${peopleToRemove.length}`
      );

      // Remove old allocations
      for (const personId of peopleToRemove) {
        const allocation = latestAllocations.find(
          (a) => a.personId === personId
        );
        if (allocation) {
          console.log(
            `Removing allocation for person ${personId} from task ${taskId}`
          );
          const success = await deleteTaskAllocation(allocation.id);
          console.log(`Deletion success: ${success}`);
        }
      }

      // Add new allocations
      const newAllocations: TaskAllocation[] = [];
      for (const personId of peopleToAdd) {
        console.log(
          `Adding allocation for person ${personId} to task ${taskId}`
        );
        const newAllocation = await createTaskAllocation({
          taskId,
          personId,
          estimatedWeeklyHours: 0, // Default to 0, can be updated later if needed
          isLead: false,
        });

        if (newAllocation) {
          console.log(`Successfully added allocation:`, newAllocation);
          newAllocations.push(newAllocation);
        } else {
          console.error(
            `Failed to add allocation for person ${personId} to task ${taskId}`
          );
        }
      }

      // Fetch the final allocations from the database to ensure we have the complete and correct list
      const finalAllocations = await fetchTaskAllocations(taskId);
      console.log(
        `Final allocations for task ${taskId} after updates:`,
        finalAllocations
      );

      // Update local state
      setTaskAllocations((prev) => ({
        ...prev,
        [taskId]: finalAllocations,
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
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId);
      if (success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setTaskAllocations((prev) => {
          const newAllocations = { ...prev };
          delete newAllocations[taskId];
          return newAllocations;
        });

        // Notify parent component to refresh data
        if (onDataChange) onDataChange();

        toast({
          title: "Task deleted",
          description: "Task has been deleted.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
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
      if (newAllocation) {
        setTaskAllocations((prev) => ({
          ...prev,
          [allocationData.taskId]: [
            ...(prev[allocationData.taskId] || []),
            newAllocation,
          ],
        }));

        // Notify parent component to refresh data
        if (onDataChange) onDataChange();

        toast({
          title: "Person allocated",
          description: `${getPersonName(
            newAllocation.personId
          )} has been allocated to the task.`,
        });
      }
    } catch (error) {
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
        setTaskAllocations((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter((a) => a.id !== allocationId),
        }));
        toast({
          title: "Success",
          description: "Task allocation deleted successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task allocation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions
  const getPersonName = (personId: string) => {
    const person =
      people.find((p) => p.id === personId) ||
      availablePeople.find((p) => p.id === personId);
    return person?.name || "Unknown";
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  // Helper: sort tasks
  const sortTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "created-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "created-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "hours-asc":
          return a.hoursPerWeek - b.hoursPerWeek;
        case "hours-desc":
          return b.hoursPerWeek - a.hoursPerWeek;
        default:
          return 0;
      }
    });
  };

  // Filter tasks by category and person
  const filterTasksByCategory = (tasks: Task[]) => {
    if (categoryFilter === "all") return tasks;
    return tasks.filter((task) => task.categoryId === categoryFilter);
  };

  const filterTasksByPerson = (tasks: Task[]) => {
    if (personFilter === "all") return tasks;

    return tasks.filter((task) => {
      const allocations = taskAllocations[task.id] || [];
      return allocations.some(
        (allocation) => allocation.personId === personFilter
      );
    });
  };

  const filteredTasks = filterTasksByPerson(filterTasksByCategory(tasks));
  const sortedTasks = sortTasks(filteredTasks);

  // Group tasks by their group (via category)
  const groupedTasks = sortedTasks.reduce((acc, task) => {
    const category = categories.find((cat) => cat.id === task.categoryId);
    const group = groups.find((grp) => grp.id === category?.groupId);
    const groupName = group?.name || "Unknown Group";
    const groupId = group?.id || "unknown";

    if (!acc[groupId]) {
      acc[groupId] = {
        groupName,
        tasks: [],
      };
    }
    acc[groupId].tasks.push(task);
    return acc;
  }, {} as Record<string, { groupName: string; tasks: Task[] }>);

  // Sort groups by name
  const sortedGroups = Object.entries(groupedTasks).sort(([, a], [, b]) =>
    a.groupName.localeCompare(b.groupName)
  );

  const handleSort = (field: string) => {
    let newSortOption: SortOption;

    if (field === "name") {
      newSortOption = sortOption === "name-asc" ? "name-desc" : "name-asc";
    } else if (field === "hours") {
      newSortOption = sortOption === "hours-asc" ? "hours-desc" : "hours-asc";
    } else if (field === "created") {
      newSortOption =
        sortOption === "created-asc" ? "created-desc" : "created-asc";
    } else {
      return;
    }

    setSortOption(newSortOption);
  };

  const SortIcon = ({ field }: { field: string }) => {
    let isActive = false;
    let isAsc = true;

    if (field === "name") {
      isActive = sortOption.startsWith("name");
      isAsc = sortOption === "name-asc";
    } else if (field === "hours") {
      isActive = sortOption.startsWith("hours");
      isAsc = sortOption === "hours-asc";
    } else if (field === "created") {
      isActive = sortOption.startsWith("created");
      isAsc = sortOption === "created-asc";
    }

    if (!isActive) return null;
    return isAsc ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const clearAllFilters = () => {
    setSelectedGroupId("");
    setSelectedCategoryId("all");
    setCategoryFilter("all");
    setPersonFilter("all");
  };

  // Wrapper function to handle TaskDialog's onSave signature
  const handleTaskDialogSave = (
    taskData: Omit<Task, "id" | "createdAt">,
    sourceLinks?: Omit<TaskSourceLink, "id" | "taskId" | "createdAt">[]
  ) => {
    // For now, we'll handle the task save without source links integration
    // The TaskDialog will handle source links internally
    handleTaskSave(taskData, []);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
              Tasks & Responsibilities
            </h2>
            {groups.length === 0 && (
              <p className="text-sm text-orange-600">
                No groups found. Add some groups first to create tasks.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => exportTasks(tasks, categories, groups)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setWorkflowToolsDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Workflow Tools
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group
            </label>
            <Select
              value={selectedGroupId}
              onValueChange={(value) => {
                setSelectedGroupId(value);
                // When a group is selected, reset category to "all" to enable group filtering
                if (value && value !== "all" && selectedCategoryId !== "all") {
                  setSelectedCategoryId("all");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filteredCategories
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategoryId && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Person
              </label>
              <Select value={personFilter} onValueChange={setPersonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All People" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All People</SelectItem>
                  {people
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} ({person.organisation})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Add Task Button */}
        <div className="flex gap-2 mb-2">
          {isAdmin && selectedCategoryId && selectedCategoryId !== "all" && (
            <Button
              onClick={() => {
                setEditingTask(undefined);
                setTaskDialogOpen(true);
              }}
              className="mb-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
          <Button
            onClick={() =>
              loadTasksForCategory(
                selectedCategoryId === "all" ? undefined : selectedCategoryId
              )
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 w-full">
        {loading ? (
          <div className="p-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Loading Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                  <div className="w-48 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {/* Loading Tasks */}
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-40 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex gap-2">
                      {Array.from({
                        length: 2 + Math.floor(Math.random() * 3),
                      }).map((_, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                        >
                          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="overflow-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-50 shadow-lg">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        Task Name
                        <SortIcon field="name" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => handleSort("description")}
                      >
                        Description
                        <SortIcon field="description" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
                        Hours/Week
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroups.map(
                      ([groupId, { groupName, tasks: groupTasks }]) => (
                        <React.Fragment key={`group-fragment-${groupId}`}>
                          {/* Group Divider Row */}
                          <tr
                            key={`group-${groupId}`}
                            className="bg-gray-100 dark:bg-gray-800"
                          >
                            <td
                              colSpan={7}
                              className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 border-t-2 border-gray-300 dark:border-gray-600"
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                {groupName} ({groupTasks.length} task
                                {groupTasks.length !== 1 ? "s" : ""})
                              </div>
                            </td>
                          </tr>
                          {/* Tasks for this group */}
                          {groupTasks.map((task) => {
                            const allocations = taskAllocations[task.id] || [];
                            const category = categories.find(
                              (cat) => cat.id === task.categoryId
                            );

                            // Get organization color for a person
                            const getOrgColor = (personId: string) => {
                              const person =
                                people.find((p) => p.id === personId) ||
                                availablePeople.find((p) => p.id === personId);
                              if (!person) return "#6B7280"; // gray fallback

                              // Map organization names to colors
                              const orgColors = {
                                PDNSW: "#3B82F6", // Blue
                                WSP: "#EF4444", // Red
                                Giraffe: "#F59E0B", // Orange
                              };
                              return (
                                orgColors[
                                  person.organisation as keyof typeof orgColors
                                ] || "#6B7280"
                              );
                            };

                            return (
                              <tr
                                key={task.id}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="px-4 py-2 font-medium">
                                  {task.name}
                                </td>
                                <td className="px-4 py-2">
                                  {task.description}
                                </td>
                                <td className="px-4 py-2">
                                  {category ? category.name : "-"}
                                </td>
                                <td className="px-4 py-2">
                                  {task.hoursPerWeek}
                                </td>
                                <td className="px-4 py-2">
                                  {task.sourceLinks &&
                                  task.sourceLinks.length > 0 ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(
                                          task.sourceLinks![0].url,
                                          "_blank"
                                        )
                                      }
                                      className="p-1 h-auto"
                                      title="View source material"
                                    >
                                      <ExternalLinkIcon className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {allocations.length > 0 ? (
                                      allocations.map((allocation) => {
                                        const personName = getPersonName(
                                          allocation.personId
                                        );
                                        const orgColor = getOrgColor(
                                          allocation.personId
                                        );
                                        const person =
                                          people.find(
                                            (p) => p.id === allocation.personId
                                          ) ||
                                          availablePeople.find(
                                            (p) => p.id === allocation.personId
                                          );
                                        return (
                                          <span
                                            key={allocation.id}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-black bg-transparent border-2"
                                            style={{ borderColor: orgColor }}
                                          >
                                            <span>{personName}</span>
                                            {person &&
                                              getOrganizationLogo(
                                                person.organisation
                                              ) && (
                                                <Image
                                                  src={getOrganizationLogo(
                                                    person.organisation
                                                  )}
                                                  alt={`${person.organisation} logo`}
                                                  width={12}
                                                  height={12}
                                                  className="flex-shrink-0"
                                                />
                                              )}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-gray-400 text-sm">
                                        Unassigned
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
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
                                      <TrashIcon className="h-4 w-4" />
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
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleTaskDialogSave}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        task={editingTask}
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
