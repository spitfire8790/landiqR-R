"use client";

import { useState, useEffect, useRef } from "react";
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { GroupDialog } from "@/components/modals/group-dialog";
import { CategoryDialog } from "@/components/modals/category-dialog";
import { PersonDialog } from "@/components/modals/person-dialog";
import { AllocationDialog } from "@/components/modals/allocation-dialog";
import { SimpleTaskDialog } from "@/components/modals/simple-task-dialog";
import { WorkflowDialog } from "@/components/modals/workflow-dialog";
import DraggableChatModal from "@/components/modals/draggable-chat-modal";
import HowToUseButton from "@/components/ui/how-to-use-button";
import HowToUseModal from "@/components/modals/how-to-use-modal";
import NotificationBell from "@/components/ui/notification-bell";
import PipedriveTab from "@/components/pipedrive/PipedriveTab";
import { useAuth } from "@/contexts/auth-context";
import type {
  Person,
  Category,
  Allocation,
  Group,
  Task,
  TaskAllocation,
} from "@/lib/types";
import OrgChart from "@/components/charts/org-chart";
import GroupsTable from "@/components/tables/groups-table";
import CategoriesTable from "@/components/tables/categories-table";
import PeopleTable from "@/components/tables/people-table";
import TasksView from "@/components/layout/tasks-view";
import WorkflowsTable from "@/components/tables/workflows-table";
import CalendarView from "@/components/layout/calendar-view";
import GiraffeDashboard from "@/components/analytics/charts/GiraffeDashboard";
import JiraAnalytics from "@/components/jira/JiraAnalytics";

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

import CollaborationIndicators from "@/components/ui/collaboration-indicators";

const SHOW_GIRAFFE = false;
const SHOW_CROSS_PLATFORM_ANALYTICS = false;

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

  // Add refs to prevent redundant operations
  const initializationAttempted = useRef(false);
  const adminInitialized = useRef(false);

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    mode: "view" | "edit";
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
      setSelectedWorkflowForDialog({ workflow, task, mode: "view" });
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
      setSelectedWorkflowForDialog({ workflow, task, mode: "edit" });
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

  // Timeout utility
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), ms)
      ),
    ]);
  };

  // Initialize database and fetch data
  useEffect(() => {
    async function initializeAndLoadData() {
      // Prevent redundant initialization attempts
      if (initializationAttempted.current && !dataRefreshTrigger) {
        return;
      }

      setLoading(true);
      try {
        // First try to ensure tables exist with timeout
        const tablesExist = await withTimeout(ensureTablesExist(), 10000);
        setDbInitialized(tablesExist);
        initializationAttempted.current = true;

        // Initialize admin users in background (non-blocking)
        if (!adminInitialized.current) {
          initializeAdminUsers()
            .then(() => {
              adminInitialized.current = true;
            })
            .catch((error) =>
              console.warn("Admin initialization failed:", error)
            );
        }

        if (tablesExist) {
          // If tables exist, fetch data with timeout and parallel execution
          try {
            const [groupsData, categoriesData, peopleData] = await withTimeout(
              Promise.all([fetchGroups(), fetchCategories(), fetchPeople()]),
              8000
            );

            setGroups(groupsData);
            setCategories(categoriesData);
            setPeople(peopleData);

            // Load other data in background
            Promise.all([
              fetchAllocations(),
              fetchTasks(),
              fetchTaskAllocations(),
            ])
              .then(([allocationsData, tasksData, taskAllocationsData]) => {
                setAllocations(allocationsData);
                setTasks(tasksData);
                setTaskAllocations(taskAllocationsData);
              })
              .catch((error) => {
                console.error("Error loading secondary data:", error);
              });
          } catch (dataError) {
            console.error("Error fetching data:", dataError);
            toast({
              title: "Warning",
              description:
                "Some data could not be loaded. You can try refreshing the page.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error initializing and loading data:", error);

        // Show different error messages based on the error type
        const isTimeout =
          error instanceof Error && error.message.includes("timed out");
        toast({
          title: "Error",
          description: isTimeout
            ? "The application is taking longer than expected to load. Please check your internet connection and try refreshing."
            : "Failed to initialize database or load data. Please try again.",
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
      const success = await withTimeout(ensureTablesExist(), 15000);
      setDbInitialized(success);
      initializationAttempted.current = true;

      if (success) {
        toast({
          title: "Success",
          description: "Database initialized successfully.",
        });
        // Trigger data refresh
        refreshData();
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      const isTimeout =
        error instanceof Error && error.message.includes("timed out");
      toast({
        title: "Error",
        description: isTimeout
          ? "Database initialization timed out. Please check your connection and try again."
          : "Failed to initialize database. Please try again.",
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

        {/* Main Content with Loading Progress */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg animate-pulse mb-6 mx-auto flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Loading Application</h2>
            <p className="text-gray-600 mb-4">
              Initialising database and loading your data...
            </p>

            {/* Progress indicator */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full animate-pulse"
                style={{ width: "70%" }}
              ></div>
            </div>

            <p className="text-sm text-gray-500">
              This should only take a few seconds. If this continues, please
              check your internet connection.
            </p>
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
                Initialising...
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
        <div
          className={cn(
            "bg-white shadow-lg border-r border-gray-200 flex-shrink-0 hidden sm:flex flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Sidebar Header with Toggle */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-gray-800">Navigation</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 flex-1">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("orgchart")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "orgchart"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Org Chart" : ""}
              >
                <Grid3X3
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Org Chart"}
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "groups"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Groups" : ""}
              >
                <Layers
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Groups"}
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "categories"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Categories" : ""}
              >
                <Database
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Categories"}
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "people"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "People" : ""}
              >
                <Users className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")} />
                {!sidebarCollapsed && "People"}
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "tasks"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Tasks" : ""}
              >
                <CheckSquare
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Tasks"}
              </button>
              <button
                onClick={() => setActiveTab("workflows")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "workflows"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Workflows" : ""}
              >
                <GitBranch
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Workflows"}
              </button>
              <button
                onClick={() => setActiveTab("pipedrive")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "pipedrive"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Analytics" : ""}
              >
                <BarChart
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Analytics"}
              </button>
              {SHOW_GIRAFFE && (
                <button
                  onClick={() => setActiveTab("giraffe")}
                  className={cn(
                    "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                    sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                    activeTab === "giraffe"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={sidebarCollapsed ? "Giraffe" : ""}
                >
                  <BarChart3
                    className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                  />
                  {!sidebarCollapsed && "Giraffe"}
                </button>
              )}
              {SHOW_CROSS_PLATFORM_ANALYTICS && (
                <button
                  onClick={() => setActiveTab("cross-platform-analytics")}
                  className={cn(
                    "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                    sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                    activeTab === "cross-platform-analytics"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={sidebarCollapsed ? "Cross-Platform Analytics" : ""}
                >
                  <BarChart3
                    className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                  />
                  {!sidebarCollapsed && "Cross-Platform"}
                </button>
              )}
              <button
                onClick={() => setActiveTab("calendar")}
                className={cn(
                  "w-full flex items-center text-sm font-medium rounded-md transition-all duration-200",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  activeTab === "calendar"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? "Calendar" : ""}
              >
                <Calendar
                  className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")}
                />
                {!sidebarCollapsed && "Calendar"}
              </button>
            </nav>
          </div>

          {/* Admin Quick Actions */}
          {isAdmin && (
            <div className="p-4 border-t border-gray-200">
              {!sidebarCollapsed && (
                <>
                  <h3 className="font-medium text-gray-800 mb-3">
                    Quick Actions
                  </h3>
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
                        <DropdownMenuItem
                          onClick={() => setGroupDialogOpen(true)}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Add Group
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCategoryDialogOpen(true)}
                        >
                          <Database className="mr-2 h-4 w-4" />
                          Add Category
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPersonDialogOpen(true)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Person
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setAllocationDialogOpen(true)}
                        >
                          <ListPlus className="mr-2 h-4 w-4" />
                          Add Allocation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTaskDialogOpen(true)}
                        >
                          <CheckSquare className="mr-2 h-4 w-4" />
                          Add Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
              {sidebarCollapsed && (
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-8 w-8"
                        title="Quick Actions"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" side="right">
                      <DropdownMenuItem
                        onClick={() => setGroupDialogOpen(true)}
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Add Group
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setCategoryDialogOpen(true)}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Add Category
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPersonDialogOpen(true)}
                      >
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
              )}
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
              { key: "pipedrive", icon: BarChart, label: "Analytics" },
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
            {SHOW_GIRAFFE && (
              <button
                key="giraffe"
                onClick={() => setActiveTab("giraffe")}
                className={cn(
                  "flex flex-col items-center py-2 px-3 text-xs",
                  activeTab === "giraffe" ? "text-blue-600" : "text-gray-500"
                )}
              >
                <BarChart3 className="h-5 w-5 mb-1" />
                <span>Giraffe</span>
              </button>
            )}
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

          {activeTab === "pipedrive" && (
            <div className="h-full w-full">
              <PipedriveTab />
            </div>
          )}

          {SHOW_GIRAFFE && activeTab === "giraffe" && (
            <div className="h-full w-full overflow-auto">
              <GiraffeDashboard />
            </div>
          )}

          {/* Cross-Platform Analytics Tab */}
          {SHOW_CROSS_PLATFORM_ANALYTICS &&
            activeTab === "cross-platform-analytics" && (
              <div className="h-full w-full overflow-auto">
                <JiraAnalytics />
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
            onOpenChange={(open) => {
              setWorkflowDialogOpen(open);
              if (!open) {
                setSelectedWorkflowForDialog(null);
              }
            }}
            task={selectedWorkflowForDialog?.task}
            people={people}
            workflow={selectedWorkflowForDialog?.workflow}
            isCreateMode={!selectedWorkflowForDialog}
            mode={selectedWorkflowForDialog?.mode}
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
