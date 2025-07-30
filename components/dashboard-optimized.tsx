"use client";

import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useMemo,
  useCallback,
} from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type {
  Person,
  Category,
  Allocation,
  Group,
  Task,
  TaskAllocation,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { exportAllData } from "@/lib/export-service";
import { initializeAdminUsers } from "@/lib/init-admin";
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

// Lazy load heavy components
const OrgChart = lazy(() => import("@/components/charts/org-chart"));
const GroupsTable = lazy(() => import("@/components/tables/groups-table"));
const CategoriesTable = lazy(
  () => import("@/components/tables/categories-table")
);
const PeopleTable = lazy(() => import("@/components/tables/people-table"));
const TasksView = lazy(() => import("@/components/layout/tasks-view"));
const WorkflowsTable = lazy(
  () => import("@/components/tables/workflows-table")
);
const CalendarView = lazy(() => import("@/components/layout/calendar-view"));
const PipedriveTab = lazy(() => import("@/components/pipedrive/PipedriveTab"));
const GiraffeDashboard = lazy(
  () => import("@/components/analytics/charts/GiraffeDashboard")
);

// Lazy load dialogs
const GroupDialog = lazy(() =>
  import("@/components/modals/group-dialog").then((m) => ({
    default: m.GroupDialog,
  }))
);
const CategoryDialog = lazy(() =>
  import("@/components/modals/category-dialog").then((m) => ({
    default: m.CategoryDialog,
  }))
);
const PersonDialog = lazy(() =>
  import("@/components/modals/person-dialog").then((m) => ({
    default: m.PersonDialog,
  }))
);
const AllocationDialog = lazy(() =>
  import("@/components/modals/allocation-dialog").then((m) => ({
    default: m.AllocationDialog,
  }))
);
const SimpleTaskDialog = lazy(() =>
  import("@/components/modals/simple-task-dialog").then((m) => ({
    default: m.SimpleTaskDialog,
  }))
);
const WorkflowDialog = lazy(() =>
  import("@/components/modals/workflow-dialog").then((m) => ({
    default: m.WorkflowDialog,
  }))
);
const DraggableChatModal = lazy(
  () => import("@/components/modals/draggable-chat-modal")
);
const HowToUseModal = lazy(
  () => import("@/components/modals/how-to-use-modal")
);

// Keep these lightweight components loaded
import HowToUseButton from "@/components/ui/how-to-use-button";
import NotificationBell from "@/components/ui/notification-bell";
import CollaborationIndicators from "@/components/ui/collaboration-indicators";

const SHOW_GIRAFFE = false;

// Loading component for suspense
const TabLoading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Optimized timeout utility with better error handling
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
};

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
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Refs to prevent redundant operations
  const initializationAttempted = useRef(false);
  const adminInitialized = useRef(false);
  const dataLoadedForTab = useRef<Set<string>>(new Set());

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Memoized export handler
  const handleExportAll = useCallback(async () => {
    try {
      const { fetchResponsibilities, fetchLeave, fetchWorkflows } =
        await import("@/lib/data-service");

      const allResponsibilities = [];
      for (const task of tasks) {
        const taskResponsibilities = await fetchResponsibilities(task.id);
        allResponsibilities.push(...taskResponsibilities);
      }

      const [leaveData, workflowsData] = await Promise.all([
        fetchLeave(),
        fetchWorkflows(),
      ]);

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
  }, [tasks, groups, categories, people, allocations, taskAllocations, toast]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "?" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
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

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load data for specific tab if not already loaded
  const loadDataForTab = useCallback(async (tab: string) => {
    if (dataLoadedForTab.current.has(tab)) {
      return;
    }

    try {
      switch (tab) {
        case "orgchart":
        case "groups":
        case "categories":
        case "people":
          // These tabs use the initial data load
          break;
        case "tasks":
          // Tasks might need specific data
          const tasksData = await fetchTasks();
          setTasks(tasksData);
          break;
        // Add other tab-specific data loading as needed
      }

      dataLoadedForTab.current.add(tab);
    } catch (error) {
      console.error(`Error loading data for tab ${tab}:`, error);
    }
  }, []);

  // Handle tab change with data loading
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab);
      loadDataForTab(newTab);
    },
    [loadDataForTab]
  );

  // Initialize database and fetch initial data
  useEffect(() => {
    async function initializeAndLoadData() {
      if (initializationAttempted.current && !dataRefreshTrigger) {
        return;
      }

      setLoading(true);
      try {
        // First ensure tables exist with shorter timeout
        const tablesExist = await withTimeout(ensureTablesExist(), 10000);
        setDbInitialized(tablesExist);
        initializationAttempted.current = true;

        // Initialize admin users (non-blocking)
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
          // Load only essential data initially
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
                "Some data could not be loaded. The app will retry in the background.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error initializing:", error);
        const isTimeout =
          error instanceof Error && error.message.includes("timed out");
        toast({
          title: "Error",
          description: isTimeout
            ? "The application is taking longer than expected. Please check your connection."
            : "Failed to initialize. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    initializeAndLoadData();
  }, [dataRefreshTrigger, toast]);

  // Memoized handlers
  const refreshData = useCallback(() => {
    setDataRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  }, [logout, toast]);

  // CRUD operation handlers (memoized)
  const addGroup = useCallback(
    async (group: Omit<Group, "id">) => {
      try {
        const newGroup = await createGroup(group);
        if (newGroup) {
          setGroups((prev) => [...prev, newGroup]);
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
    },
    [toast]
  );

  // ... Rest of the CRUD handlers with useCallback ...

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Land iQ - Project Management
              </h1>
            </div>
          </div>
        </div>
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
            <p className="text-gray-600 mb-4">Setting up your workspace...</p>
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
            The database tables need to be initialized. This only happens once.
          </p>
          <Button
            onClick={async () => {
              setInitializingDb(true);
              try {
                const success = await withTimeout(ensureTablesExist(), 15000);
                setDbInitialized(success);
                if (success) {
                  toast({
                    title: "Success",
                    description: "Database initialized successfully.",
                  });
                  refreshData();
                }
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to initialize database.",
                  variant: "destructive",
                });
              } finally {
                setInitializingDb(false);
              }
            }}
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

  // Main render with lazy-loaded components
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
          {/* Navigation content remains the same but with handleTabChange */}
        </div>

        {/* Main content area with lazy loading */}
        <div className="flex-1 overflow-hidden bg-white w-full">
          <Suspense fallback={<TabLoading />}>
            {activeTab === "orgchart" && (
              <OrgChart
                groups={groups}
                categories={categories}
                people={people}
                allocations={allocations}
                onDeleteAllocation={isAdmin ? deleteAllocation : () => {}}
                onAddGroup={isAdmin ? () => setGroupDialogOpen(true) : () => {}}
                onAddCategory={
                  isAdmin ? () => setCategoryDialogOpen(true) : () => {}
                }
                onAddAllocation={
                  isAdmin ? () => setAllocationDialogOpen(true) : () => {}
                }
                onCategoryClick={
                  isAdmin
                    ? (id) => {
                        setSelectedCategoryId(id);
                        handleTabChange("tasks");
                      }
                    : () => {}
                }
              />
            )}

            {activeTab === "groups" && (
              <GroupsTable
                groups={groups}
                onEdit={isAdmin ? updateGroup : () => {}}
                onDelete={isAdmin ? deleteGroup : () => {}}
              />
            )}

            {activeTab === "pipedrive" && <PipedriveTab />}

            {/* Add other tabs similarly */}
          </Suspense>
        </div>
      </div>

      {/* Dialogs - Only load when opened */}
      {isAdmin && (
        <Suspense fallback={null}>
          {groupDialogOpen && (
            <GroupDialog
              open={groupDialogOpen}
              onOpenChange={setGroupDialogOpen}
              onSave={addGroup}
            />
          )}
          {/* Add other dialogs similarly */}
        </Suspense>
      )}
    </div>
  );
}
