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
} from "lucide-react";
import { GroupDialog } from "@/components/group-dialog";
import { CategoryDialog } from "@/components/category-dialog";
import { PersonDialog } from "@/components/person-dialog";
import { AllocationDialog } from "@/components/allocation-dialog";
import { SimpleTaskDialog } from "@/components/simple-task-dialog";
import { WorkflowDialog } from "@/components/workflow-dialog";
import DraggableChatModal from "@/components/draggable-chat-modal";
import HowToUseButton from "@/components/how-to-use-button";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/contexts/auth-context";
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
import ResponsibilityChart from "@/components/responsibility-chart";
import TasksView from "@/components/tasks-view";
import WorkflowsTable from "@/components/workflows-table";
import CalendarView from "@/components/calendar-view";

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
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0); // Trigger for data refresh

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedWorkflowForDialog, setSelectedWorkflowForDialog] = useState<{
    workflow: any;
    task: Task;
  } | null>(null);

  const { toast } = useToast();
  const { logout, isAdmin, userRole, userId, userEmail } = useAuth();

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
        description: "Could not find the task associated with this workflow.",
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
        description: "Could not find the task associated with this workflow.",
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
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Land iQ - Project Management
          </h1>
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {userRole?.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Quick Add Dropdown - Only show if admin */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-black text-white hover:bg-gray-800 transition-colors"
                  size="sm"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Quick Add
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setAllocationDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Add Allocation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCategoryDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Category
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGroupDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Add Group
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPersonDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Person
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTaskDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Add Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWorkflowDialogOpen(true)}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  Add Workflow
                </DropdownMenuItem>
                <div className="border-t my-1"></div>
                <DropdownMenuItem
                  onClick={handleExportAll}
                  className="hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Chat Button - Available to all authenticated users */}
          <Button
            onClick={() => setChatModalOpen(true)}
            className="bg-black text-white hover:bg-gray-800 transition-colors"
            size="sm"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat
          </Button>

          {/* Notification Bell - Available to all authenticated users */}
          <NotificationBell />

          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-gray-200 bg-white w-full">
        <div className="flex overflow-x-auto scrollbar-hide w-full">
          <button
            onClick={() => setActiveTab("orgchart")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "orgchart"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <Grid3X3 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Chart</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "groups"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
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
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
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
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <Users className="mr-2 h-4 w-4" />
            People
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "tasks"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "workflows"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Workflows
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "analytics"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <BarChart className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "flex items-center py-3 px-4 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap min-w-fit",
              activeTab === "calendar"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-white w-full">
        {activeTab === "orgchart" && (
          <div className="h-full w-full">
            <OrgChart
              groups={groups}
              categories={categories}
              people={people}
              allocations={allocations}
              onDeleteAllocation={isAdmin ? deleteAllocationHandler : () => {}}
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
            <ResponsibilityChart people={people} allocations={allocations} />
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

          {workflowDialogOpen && (
            <WorkflowDialog
              open={workflowDialogOpen}
              onOpenChange={setWorkflowDialogOpen}
              task={selectedWorkflowForDialog?.task}
              people={people}
              workflow={selectedWorkflowForDialog?.workflow}
              isCreateMode={!selectedWorkflowForDialog}
            />
          )}
        </>
      )}

      {/* Chat Modal - Available to all authenticated users */}
      <DraggableChatModal
        open={chatModalOpen}
        onOpenChange={setChatModalOpen}
      />
    </div>
  );
}
