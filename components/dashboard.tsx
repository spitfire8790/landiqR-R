"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  Layers,
  Users,
  Grid3X3,
  Database,
  BarChart,
  Menu,
  X,
  LogOut,
  UserPlus,
  ListPlus,
  CheckSquare,
  MessageCircle,
  GitBranch,
  Calendar,
  ChevronDown,
  Download,
  Activity,
} from "lucide-react";
import { GroupDialog } from "@/components/group-dialog";
import { CategoryDialog } from "@/components/category-dialog";
import { PersonDialog } from "@/components/person-dialog";
import { AllocationDialog } from "@/components/allocation-dialog";
import { SimpleTaskDialog } from "@/components/simple-task-dialog";
import { WorkflowDialog } from "@/components/workflow-dialog";
import DraggableChatModal from "@/components/draggable-chat-modal";
import HowToUseButton from "@/components/how-to-use-button";
import HowToUseModal from "@/components/how-to-use-modal";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/contexts/auth-context";
import dynamic from "next/dynamic";
import type {
  Person,
  Category,
  Allocation,
  Group,
  Task,
  TaskAllocation,
} from "@/lib/types";
import OrgChart from "@/components/org-chart";
import GroupsTable from "@/components/groups-table";
import CategoriesTable from "@/components/categories-table";
import PeopleTable from "@/components/people-table";
import TasksView from "@/components/tasks-view";
import WorkflowsTable from "@/components/workflows-table";
import CalendarView from "@/components/calendar-view";

// Lazy load the ResponsibilityChart for better performance
const ResponsibilityChart = dynamic(
  () => import("@/components/responsibility-chart"),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-6 h-96">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-64 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`stat-${i}`}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="space-y-2">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <div className="mb-6">
            <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="relative h-64">
            <div className="h-full bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    ),
  }
);

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
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskAllocation,
  fetchTaskAllocations,
  ensureTablesExist,
} from "@/lib/data-service";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { exportAllData } from "@/lib/export-service";
import { initializeAdminUsers } from "@/lib/init-admin";
import EnhancedAnalytics from "@/components/enhanced-analytics";
import ActivityFeed from "@/components/activity-feed";
import CollaborationIndicators from "@/components/collaboration-indicators";

export default function Dashboard() {
  // State variables
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAllocations, setTaskAllocations] = useState<TaskAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  // Trigger for data refresh
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Export handler for all data
  const handleExportAll = async () => {
    try {
      // We need to fetch additional data that might not be loaded yet
      const { fetchResponsibilities, fetchLeave, fetchWorkflows } =
        await import("@/lib/data-service");

      // Fetch all responsibilities across all tasks
      const allResponsibilities = [];
      for (const task of tasks) {
        const taskResponsibilities = await fetchResponsibilities(task.id);
        allResponsibilities.push(...taskResponsibilities);
      }

      // Fetch leave and workflows
      const [leaveData, workflowsData] = await Promise.all([
        fetchLeave(),
        fetchWorkflows(),
      ]);

      // Export all data
      exportAllData(
        groups,
        categories,
        people,
        allocations,
        tasks,
        allResponsibilities,
        taskAllocations,
        leaveData,
        workflowsData
      );

      toast({
        title: "Export Started",
        description:
          "All data is being exported. Multiple CSV files will be downloaded.",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orgchart");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [howToUseModalOpen, setHowToUseModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedWorkflowForDialog, setSelectedWorkflowForDialog] = useState<{
    workflow: any;
    task: Task;
  } | null>(null);

  const { toast } = useToast();
  const { logout, isAdmin, userRole, userId, userEmail } = useAuth();

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if ? key is pressed (Shift + / in most layouts)
      if (
        event.key === "?" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        // Prevent default behavior
        event.preventDefault();

        // Don't trigger if user is typing in an input field
        const activeElement = document.activeElement;
        const isTyping =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.getAttribute("contenteditable") === "true");

        if (!isTyping) {
          setHowToUseModalOpen(true);
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Workflow handlers
  const handleViewWorkflow = (workflow: any) => {
    // Find the task associated with this workflow
    const task = tasks.find((t) => t.id === workflow.taskId);

    if (task) {
      setSelectedWorkflowForDialog({ workflow, task });
      setWorkflowDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: `Could not find the task associated with this workflow. Task ID: ${workflow.taskId}`,
        variant: "destructive",
      });
    }
  };

  const handleEditWorkflow = (workflow: any) => {
    // Find the task associated with this workflow
    const task = tasks.find((t) => t.id === workflow.taskId);
    if (task) {
      setSelectedWorkflowForDialog({ workflow, task });
      setWorkflowDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: `Could not find the task associated with this workflow. Task ID: ${workflow.taskId}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateNewWorkflow = () => {
    // Open WorkflowDialog without a selected workflow (create mode)
    setSelectedWorkflowForDialog(null);
    setWorkflowDialogOpen(true);
  };

  // Initialize database and fetch data
  useEffect(() => {
    async function initializeAndLoadData() {
      setLoading(true);
      try {
        // First try to ensure tables exist
        const tablesExist = await ensureTablesExist();
        setDbInitialized(tablesExist);

        // Initialize admin users from hardcoded list
        await initializeAdminUsers();

        if (tablesExist) {
          // If tables exist, fetch data
          const [
            groupsData,
            categoriesData,
            peopleData,
            allocationsData,
            tasksData,
            taskAllocationsData,
          ] = await Promise.all([
            fetchGroups(),
            fetchCategories(),
            fetchPeople(),
            fetchAllocations(),
            fetchTasks(),
            fetchTaskAllocations(),
          ]);

          setGroups(groupsData);
          setCategories(categoriesData);
          setPeople(peopleData);
          setAllocations(allocationsData);
          setTasks(tasksData);
          setTaskAllocations(taskAllocationsData);
        }
      } catch (error) {
        console.error("Error initializing and loading data:", error);
        toast({
          title: "Error",
          description:
            "Failed to initialize database or load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    initializeAndLoadData();
  }, [dataRefreshTrigger]); // Remove toast dependency to prevent unnecessary re-renders

  // Function to refresh data
  const refreshData = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  // Function to manually initialize the database
  const initializeDatabase = async () => {
    setInitializingDb(true);
    try {
      const success = await ensureTablesExist();
      setDbInitialized(success);
      toast({
        title: "Success",
        description: "Database initialized successfully.",
      });
    } catch (error) {
      console.error("Error initializing database:", error);
      toast({
        title: "Error",
        description: "Failed to initialize database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInitializingDb(false);
    }
  };

  // CRUD operations for groups, categories, people, and allocations
  const addGroup = async (group: Omit<Group, "id">) => {
    try {
      const newGroup = await createGroup(group);
      if (newGroup) {
        setGroups([...groups, newGroup]);
        toast({
          title: "Success",
          description: "Group created successfully",
        });
      }
    } catch (error) {
      console.error("Error adding group:", error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const updateGroupHandler = async (updatedGroup: Group) => {
    try {
      const result = await updateGroup(updatedGroup);
      if (result) {
        setGroups(
          groups.map((grp) => (grp.id === updatedGroup.id ? updatedGroup : grp))
        );
        toast({
          title: "Success",
          description: "Group updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating group:", error);
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      });
    }
  };

  const deleteGroupHandler = async (id: string) => {
    try {
      const success = await deleteGroup(id);
      if (success) {
        setGroups(groups.filter((grp) => grp.id !== id));
        setCategories(categories.filter((cat) => cat.groupId !== id));
        setAllocations(
          allocations.filter(
            (alloc) =>
              !categories.some(
                (cat) => cat.groupId === id && cat.id === alloc.categoryId
              )
          )
        );
        toast({
          title: "Success",
          description: "Group deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const addCategory = async (category: Omit<Category, "id">) => {
    try {
      const newCategory = await createCategory(category);
      if (newCategory) {
        setCategories([...categories, newCategory]);
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const updateCategoryHandler = async (updatedCategory: Category) => {
    try {
      const result = await updateCategory(updatedCategory);
      if (result) {
        setCategories(
          categories.map((cat) =>
            cat.id === updatedCategory.id ? updatedCategory : cat
          )
        );
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const deleteCategoryHandler = async (id: string) => {
    try {
      const success = await deleteCategory(id);
      if (success) {
        setCategories(categories.filter((cat) => cat.id !== id));
        setAllocations(allocations.filter((alloc) => alloc.categoryId !== id));
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const addPerson = async (person: Omit<Person, "id">) => {
    try {
      const newPerson = await createPerson(person);
      if (newPerson) {
        setPeople([...people, newPerson]);
        toast({
          title: "Success",
          description: "Person added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding person:", error);
      toast({
        title: "Error",
        description: "Failed to add person",
        variant: "destructive",
      });
    }
  };

  const updatePersonHandler = async (updatedPerson: Person) => {
    try {
      const result = await updatePerson(updatedPerson);
      if (result) {
        setPeople(
          people.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
        );
        toast({
          title: "Success",
          description: "Person updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating person:", error);
      toast({
        title: "Error",
        description: "Failed to update person",
        variant: "destructive",
      });
    }
  };

  const deletePersonHandler = async (id: string) => {
    try {
      const success = await deletePerson(id);
      if (success) {
        setPeople(people.filter((p) => p.id !== id));
        setAllocations(allocations.filter((alloc) => alloc.personId !== id));
        toast({
          title: "Success",
          description: "Person deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting person:", error);
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      });
    }
  };

  const addAllocationHandler = async (allocation: Omit<Allocation, "id">) => {
    try {
      const newAllocation = await createAllocation(allocation);
      if (newAllocation) {
        setAllocations([...allocations, newAllocation]);
        toast({
          title: "Success",
          description: "Allocation added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding allocation:", error);
      toast({
        title: "Error",
        description: "Failed to add allocation",
        variant: "destructive",
      });
    }
  };

  const deleteAllocationHandler = async (id: string) => {
    try {
      const success = await deleteAllocation(id);
      if (success) {
        setAllocations(allocations.filter((alloc) => alloc.id !== id));
        toast({
          title: "Success",
          description: "Allocation deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting allocation:", error);
      toast({
        title: "Error",
        description: "Failed to delete allocation",
        variant: "destructive",
      });
    }
  };

  const addTaskHandler = async (
    taskData: Omit<Task, "id" | "createdAt">,
    allocatedPeople: string[] = []
  ) => {
    try {
      const newTask = await createTask(taskData);
      if (newTask) {
        setTasks([...tasks, newTask]);

        // Create task allocations for each allocated person
        if (allocatedPeople.length > 0) {
          const allocationPromises = allocatedPeople.map((personId) =>
            createTaskAllocation({
              taskId: newTask.id,
              personId: personId,
              isLead: false,
              estimatedWeeklyHours: 0,
            })
          );

          try {
            await Promise.all(allocationPromises);
            toast({
              title: "Success",
              description: `Task created successfully with ${allocatedPeople.length} people allocated`,
            });
          } catch (allocationError) {
            console.error("Error creating task allocations:", allocationError);
            toast({
              title: "Partial Success",
              description: "Task created but some allocations failed to save",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Success",
            description: "Task created successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const updateTaskHandler = async (updatedTask: Task) => {
    try {
      const result = await updateTask(updatedTask);
      if (result) {
        setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTaskHandler = async (id: string) => {
    try {
      const success = await deleteTask(id);
      if (success) {
        setTasks(tasks.filter((t) => t.id !== id));
        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    // Switch to tasks tab and select the category
    setActiveTab("tasks");
    setSelectedCategoryId(categoryId);
    // The TasksView will handle category selection internally
    // We could add state management here if needed for pre-selection
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Land iQ - Project Management
              </h1>
              <h1 className="text-lg font-bold text-gray-900 sm:hidden">
                Land iQ - Project Management
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex-shrink-0 hidden sm:flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center px-3 py-2">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-3"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
            <div className="flex justify-around">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center py-2 px-3">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-hidden bg-white w-full">
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="space-y-2">
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-12 h-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Chart Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 border border-gray-200 rounded-lg">
                  <div className="mb-6">
                    <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="p-6 border border-gray-200 rounded-lg">
                  <div className="mb-6">
                    <div className="w-28 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 border-b border-gray-100"
                    >
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div
                          key={j}
                          className={`h-4 bg-gray-200 rounded animate-pulse ${
                            j === 0 ? "w-1/4" : "flex-1"
                          }`}
                        ></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dbInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg dark:bg-gray-900">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Database Setup Required</h2>
          <p className="text-gray-600 mb-6">
            The database tables for this application need to be created. Click
            the button below to initialize the database.
          </p>
          <Button
            onClick={initializeDatabase}
            disabled={initializingDb}
            className="bg-black text-white hover:bg-gray-800 transition-colors"
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
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 bg-clip-text text-transparent animate-shimmer transition-all duration-300 cursor-default bg-[length:200%_100%]">
                Land iQ - Project Management
              </h1>
              <CollaborationIndicators className="mt-1" people={people} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 bg-clip-text text-transparent animate-shimmer transition-all duration-300 cursor-default bg-[length:200%_100%] sm:hidden">
              Land iQ - Project Management
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <NotificationBell />
            <HowToUseButton />
            <Button
              onClick={() => setChatModalOpen(true)}
              variant="outline"
              size="sm"
              className="hidden sm:flex bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            {/* Desktop Export/Logout */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button
                onClick={handleExportAll}
                variant="outline"
                size="sm"
                className="bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white p-4 space-y-2">
            <Button
              onClick={() => setChatModalOpen(true)}
              variant="outline"
              size="sm"
              className="w-full justify-start bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </Button>
            <Button
              onClick={handleExportAll}
              variant="outline"
              size="sm"
              className="w-full justify-start bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full justify-start bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex-shrink-0 hidden sm:flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4">Navigation</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("orgchart")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "orgchart"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Grid3X3 className="mr-3 h-4 w-4" />
                Org Chart
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "groups"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Layers className="mr-3 h-4 w-4" />
                Groups
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "categories"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Database className="mr-3 h-4 w-4" />
                Categories
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "people"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Users className="mr-3 h-4 w-4" />
                People
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "tasks"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <CheckSquare className="mr-3 h-4 w-4" />
                Tasks
              </button>
              <button
                onClick={() => setActiveTab("workflows")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "workflows"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <GitBranch className="mr-3 h-4 w-4" />
                Workflows
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "analytics"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <BarChart className="mr-3 h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "activity"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Activity className="mr-3 h-4 w-4" />
                Activity
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  activeTab === "calendar"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Calendar className="mr-3 h-4 w-4" />
                Calendar
              </button>
            </nav>
          </div>

          {/* Admin Quick Actions */}
          {isAdmin && (
            <div className="p-4 border-t border-gray-200 flex-1">
              <h3 className="font-medium text-gray-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={() => setGroupDialogOpen(true)}>
                      <Layers className="mr-2 h-4 w-4" />
                      Add Group
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setCategoryDialogOpen(true)}
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Add Category
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPersonDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Person
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setAllocationDialogOpen(true)}
                    >
                      <ListPlus className="mr-2 h-4 w-4" />
                      Add Allocation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTaskDialogOpen(true)}>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Add Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="flex justify-around">
            {[
              { key: "orgchart", icon: Grid3X3, label: "Chart" },
              { key: "people", icon: Users, label: "People" },
              { key: "tasks", icon: CheckSquare, label: "Tasks" },
              { key: "analytics", icon: BarChart, label: "Analytics" },
              { key: "activity", icon: Activity, label: "Activity" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 text-xs",
                  activeTab === key ? "text-blue-600" : "text-gray-500"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden bg-white w-full">
          {activeTab === "orgchart" && (
            <div className="h-full w-full">
              <OrgChart
                groups={groups}
                categories={categories}
                people={people}
                allocations={allocations}
                onDeleteAllocation={
                  isAdmin ? deleteAllocationHandler : () => {}
                }
                onAddGroup={isAdmin ? () => setGroupDialogOpen(true) : () => {}}
                onAddCategory={
                  isAdmin ? () => setCategoryDialogOpen(true) : () => {}
                }
                onAddAllocation={
                  isAdmin ? () => setAllocationDialogOpen(true) : () => {}
                }
                onCategoryClick={isAdmin ? handleCategoryClick : () => {}}
              />
            </div>
          )}

          {activeTab === "groups" && (
            <div className="h-full w-full">
              <GroupsTable
                groups={groups}
                onEdit={isAdmin ? updateGroupHandler : () => {}}
                onDelete={isAdmin ? deleteGroupHandler : () => {}}
              />
            </div>
          )}

          {activeTab === "categories" && (
            <div className="h-full w-full">
              <CategoriesTable
                categories={categories}
                groups={groups}
                onEdit={isAdmin ? updateCategoryHandler : () => {}}
                onDelete={isAdmin ? deleteCategoryHandler : () => {}}
              />
            </div>
          )}

          {activeTab === "people" && (
            <div className="h-full w-full">
              <PeopleTable
                people={people}
                onEdit={isAdmin ? updatePersonHandler : () => {}}
                onDelete={isAdmin ? deletePersonHandler : () => {}}
              />
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="h-full w-full">
              <TasksView
                groups={groups}
                categories={categories}
                people={people}
                isAdmin={isAdmin}
                selectedCategoryId={selectedCategoryId}
                onDataChange={refreshData}
              />
            </div>
          )}

          {activeTab === "workflows" && (
            <div className="h-full w-full">
              <WorkflowsTable
                groups={groups}
                categories={categories}
                tasks={tasks}
                people={people}
                isAdmin={isAdmin}
                onDataChange={refreshData}
                onView={handleViewWorkflow}
                onEdit={handleEditWorkflow}
                onCreateNew={handleCreateNewWorkflow}
              />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="h-full w-full">
              <EnhancedAnalytics
                people={people}
                allocations={allocations}
                tasks={tasks}
                groups={groups}
                categories={categories}
              />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="h-full w-full p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2">
                  <ActivityFeed
                    className="h-full"
                    people={people}
                    groups={groups}
                    tasks={tasks}
                    categories={categories}
                  />
                </div>
                <div className="space-y-6">
                  <CollaborationIndicators
                    className="p-4 bg-white rounded-lg border"
                    showActivityDetails={true}
                    maxVisible={8}
                    people={people}
                  />
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Users:</span>
                        <span className="font-medium">{people.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Groups:</span>
                        <span className="font-medium">{groups.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Tasks:</span>
                        <span className="font-medium">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Total Allocations:
                        </span>
                        <span className="font-medium">
                          {allocations.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="h-full w-full">
              <CalendarView
                people={people}
                groups={groups}
                tasks={tasks}
                taskAllocations={taskAllocations}
                categories={categories}
                allocations={allocations}
                currentUserId={userId || undefined}
                currentUserEmail={userEmail || undefined}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      {/* Admin-only Dialogs */}
      {isAdmin && (
        <>
          <GroupDialog
            open={groupDialogOpen}
            onOpenChange={setGroupDialogOpen}
            onSave={addGroup}
          />

          <CategoryDialog
            open={categoryDialogOpen}
            onOpenChange={setCategoryDialogOpen}
            onSave={addCategory}
            groups={groups}
          />

          <PersonDialog
            open={personDialogOpen}
            onOpenChange={setPersonDialogOpen}
            onSave={addPerson}
          />

          <AllocationDialog
            open={allocationDialogOpen}
            onOpenChange={setAllocationDialogOpen}
            onSave={addAllocationHandler}
            categories={categories}
            people={people}
          />

          <SimpleTaskDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            onSave={(taskData, allocatedPeople) =>
              addTaskHandler(taskData, allocatedPeople)
            }
            categories={categories}
            availablePeople={people}
            existingAllocations={[]}
          />

          <WorkflowDialog
            open={workflowDialogOpen}
            onOpenChange={setWorkflowDialogOpen}
            task={selectedWorkflowForDialog?.task}
            people={people}
            workflow={selectedWorkflowForDialog?.workflow}
            isCreateMode={!selectedWorkflowForDialog}
          />
        </>
      )}

      {/* How to Use Modal */}
      <HowToUseModal
        open={howToUseModalOpen}
        onOpenChange={setHowToUseModalOpen}
      />

      {/* Chat Modal - Available to all authenticated users */}
      <DraggableChatModal
        open={chatModalOpen}
        onOpenChange={setChatModalOpen}
      />
    </div>
  );
}
