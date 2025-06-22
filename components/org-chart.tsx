"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Star,
  X,
  PlusCircle,
  AlertCircle,
  User,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type {
  Person,
  Category,
  Allocation,
  Group,
  Task,
  TaskAllocation,
} from "@/lib/types";
import { cn, getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
import { fetchTasksByCategory, fetchTaskAllocations } from "@/lib/data-service";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface OrgChartProps {
  groups: Group[];
  categories: Category[];
  people: Person[];
  allocations: Allocation[];
  onDeleteAllocation: (id: string) => void;
  onAddGroup: () => void;
  onAddCategory: () => void;
  onAddAllocation: () => void;
  onCategoryClick?: (categoryId: string) => void;
}

// Sortable item wrapper for groups
function SortableGroup({
  group,
  children,
  width,
}: {
  group: Group;
  children: React.ReactNode;
  width: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group-${group.id}`,
    data: {
      type: "group",
      group,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    width: width ? `${width}px` : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

// Sortable item wrapper for categories
function SortableCategory({
  category,
  children,
}: {
  category: Category;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `category-${category.id}`,
    data: {
      type: "category",
      category,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

// Group container component
function GroupContainer({
  group,
  categories,
  onDragEnd,
  highlightedCategory,
  setHighlightedCategory,
  onCategoryClick,
  onCategoryClickForTasks,
}: {
  group: Group;
  categories: Category[];
  onDragEnd: (event: any) => void;
  highlightedCategory: string | null;
  setHighlightedCategory: (id: string | null) => void;
  onCategoryClick?: (categoryId: string) => void;
  onCategoryClickForTasks?: (categoryId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="flex flex-col w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={categories.map((c) => `category-${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2 mt-3">
            {categories.map((category) => (
              <SortableCategory key={category.id} category={category}>
                <div
                  className={cn(
                    "p-2 rounded-lg shadow-lg border-2 transition-all duration-200 w-32 h-[80px] flex items-start relative overflow-hidden cursor-pointer",
                    highlightedCategory === category.id
                      ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-indigo-400 shadow-indigo-500/50 dark:neon-pink-glow"
                      : "bg-slate-400 text-white border-slate-300 shadow-slate-400/30 hover:bg-slate-500 hover:shadow-slate-500/50 transform hover:scale-105"
                  )}
                  onClick={() => {
                    setHighlightedCategory(
                      highlightedCategory === category.id ? null : category.id
                    );
                    if (onCategoryClickForTasks)
                      onCategoryClickForTasks(category.id);
                  }}
                >
                  <div className="font-bold text-xs pr-3 text-white drop-shadow-sm whitespace-normal">
                    {category.name}
                  </div>
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </SortableCategory>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default function OrgChart({
  groups,
  categories,
  people,
  allocations,
  onDeleteAllocation,
  onAddGroup,
  onAddCategory,
  onAddAllocation,
  onCategoryClick,
}: OrgChartProps) {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(
    null
  );
  const [highlightedOrg, setHighlightedOrg] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCategoryForTasks, setSelectedCategoryForTasks] = useState<
    string | null
  >(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAllocations, setTaskAllocations] = useState<TaskAllocation[]>([]);
  const [allTasksData, setAllTasksData] = useState<{
    [categoryId: string]: { tasks: Task[]; allocations: TaskAllocation[] };
  }>({});

  // State for drag and drop ordering
  const [orderedGroups, setOrderedGroups] = useState<Group[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<
    Record<string, Category[]>
  >({});

  // Calculate group widths based on number of categories
  const groupWidths = useMemo(() => {
    const widths: Record<string, number> = {};

    Object.entries(orderedCategories).forEach(([groupId, cats]) => {
      // Each category is 128px (w-32) wide with 8px gap (2 in tailwind)
      widths[groupId] =
        cats.length > 0 ? cats.length * 128 + (cats.length - 1) * 8 : 0;
    });

    return widths;
  }, [orderedCategories]);

  // Initialize ordered groups and categories
  useEffect(() => {
    setOrderedGroups([...groups]);

    const categoryMap: Record<string, Category[]> = {};
    groups.forEach((group) => {
      const groupCategories = categories.filter(
        (cat) => cat.groupId === group.id
      );
      categoryMap[group.id] = groupCategories;
    });

    setOrderedCategories(categoryMap);
  }, [groups, categories]);

  // Reset highlights when data changes
  useEffect(() => {
    setHighlightedCategory(null);
    setHighlightedOrg(null);
  }, [categories, groups]);

  // Load all tasks and task allocations when component mounts or categories change
  useEffect(() => {
    if (categories.length > 0) {
      loadAllTasksAndAllocations();
    }
  }, [categories.length]); // Only depend on categories.length to prevent frequent re-renders

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for groups
  const handleDragEndGroups = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = String(active.id).replace("group-", "");
    const overId = String(over.id).replace("group-", "");

    const oldIndex = orderedGroups.findIndex((g) => g.id === activeId);
    const newIndex = orderedGroups.findIndex((g) => g.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      setOrderedGroups(arrayMove(orderedGroups, oldIndex, newIndex));
    }
  };

  // Handle drag end for categories within a specific group
  const handleDragEndCategories = (groupId: string) => (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = String(active.id).replace("category-", "");
    const overId = String(over.id).replace("category-", "");

    const groupCategories = [...(orderedCategories[groupId] || [])];
    const oldIndex = groupCategories.findIndex((c) => c.id === activeId);
    const newIndex = groupCategories.findIndex((c) => c.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newGroupCategories = arrayMove(groupCategories, oldIndex, newIndex);
      setOrderedCategories({
        ...orderedCategories,
        [groupId]: newGroupCategories,
      });
    }
  };

  const getOrgColor = (org: string, isHighlighted = false) => {
    const baseColors = {
      PDNSW: isHighlighted
        ? "bg-blue-900 text-white border-blue-800 dark:bg-blue-600 dark:neon-glow"
        : "bg-blue-800/90 text-white border-blue-900 dark:bg-blue-700 dark:border-blue-500",
      WSP: isHighlighted
        ? "bg-red-200 text-red-900 border-red-300 dark:bg-red-600 dark:text-white dark:neon-pink-glow"
        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-700 dark:text-red-100 dark:border-red-500",
      Giraffe: isHighlighted
        ? "bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-600 dark:text-white dark:neon-glow"
        : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-700 dark:text-orange-100 dark:border-orange-500",
    };
    return (
      baseColors[org as keyof typeof baseColors] ||
      (isHighlighted
        ? "bg-gray-200 text-gray-900 border-gray-400 dark:bg-gray-600 dark:text-white dark:neon-glow"
        : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500")
    );
  };

  const organisations = ["PDNSW", "WSP", "Giraffe"];

  // Get categories for a specific group
  const getCategoriesForGroup = (groupId: string) => {
    return orderedCategories[groupId] || [];
  };

  // Check if there's any data
  const hasData =
    groups.length > 0 || categories.length > 0 || people.length > 0;

  // Get allocations for a specific category and organisation, filtered by selected person if applicable
  const getAllocationsForCategoryAndOrg = (categoryId: string, org: string) => {
    return allocations.filter((a) => {
      // Filter by category and organisation
      const matchesBasicCriteria =
        a.categoryId === categoryId &&
        people.find((p) => p.id === a.personId)?.organisation === org;

      // If a person is selected, only show their allocations
      if (selectedPersonId) {
        return matchesBasicCriteria && a.personId === selectedPersonId;
      }

      return matchesBasicCriteria;
    });
  };

  // Check if a cell should be highlighted
  const isCellHighlighted = (categoryId: string, org: string) => {
    return highlightedCategory === categoryId || highlightedOrg === org;
  };

  // Get people from task allocations for a specific category and organization
  const getPeopleFromTaskAllocations = (categoryId: string, org: string) => {
    // First check if we have the selected category data loaded
    if (selectedCategoryForTasks === categoryId && tasks.length > 0) {
      // Use the selected category data
      const taskIds = tasks.map((task) => task.id);

      // Get all people IDs from task allocations for these tasks
      const personIds = new Set<string>();
      taskIds.forEach((taskId) => {
        const allocations = taskAllocations.filter((a) => a.taskId === taskId);
        allocations.forEach((allocation) => {
          // Apply person filter if selected
          if (selectedPersonId && allocation.personId !== selectedPersonId) {
            return; // Skip this allocation if it doesn't match the selected person
          }
          personIds.add(allocation.personId);
        });
      });

      // Filter people by organization and return allocation-like objects
      return Array.from(personIds)
        .map((personId) => {
          const person = people.find((p) => p.id === personId);
          if (!person || person.organisation !== org) return null;

          // Create a synthetic allocation object for rendering
          return {
            id: `task-${personId}-${categoryId}`,
            personId,
            categoryId,
            isLead: false, // We don't have lead info from task allocations
            person,
          };
        })
        .filter(Boolean) as {
        id: string;
        personId: string;
        categoryId: string;
        isLead: boolean;
        person: Person;
      }[];
    }
    // Otherwise, check if we have all tasks data loaded
    else if (
      allTasksData[categoryId] &&
      allTasksData[categoryId].tasks.length > 0
    ) {
      // Use the all tasks data
      const tasks = allTasksData[categoryId].tasks;
      const taskIds = tasks.map((task) => task.id);

      // Get all people IDs from task allocations for these tasks
      const personIds = new Set<string>();
      taskIds.forEach((taskId) => {
        const allocations = allTasksData[categoryId].allocations.filter(
          (a) => a.taskId === taskId
        );
        allocations.forEach((allocation) => {
          // Apply person filter if selected
          if (selectedPersonId && allocation.personId !== selectedPersonId) {
            return; // Skip this allocation if it doesn't match the selected person
          }
          personIds.add(allocation.personId);
        });
      });

      // Filter people by organization and return allocation-like objects
      return Array.from(personIds)
        .map((personId) => {
          const person = people.find((p) => p.id === personId);
          if (!person || person.organisation !== org) return null;

          // Create a synthetic allocation object for rendering
          return {
            id: `task-${personId}-${categoryId}`,
            personId,
            categoryId,
            isLead: false, // We don't have lead info from task allocations
            person,
          };
        })
        .filter(Boolean) as {
        id: string;
        personId: string;
        categoryId: string;
        isLead: boolean;
        person: Person;
      }[];
    }

    // If no data is available, return empty array
    return [];
  };

  // Helper function to extract first name
  const getFirstName = (fullName: string) => {
    return fullName.split(" ")[0];
  };

  // Load tasks for selected category
  const loadTasksForCategory = async (categoryId: string) => {
    const tasksData = await fetchTasksByCategory(categoryId);
    setTasks(tasksData);

    // Load allocations for each task
    const allocationsData: TaskAllocation[] = [];
    for (const task of tasksData) {
      const allocations = await fetchTaskAllocations(task.id);
      allocationsData.push(...allocations);
    }
    setTaskAllocations(allocationsData);
  };

  // Load all tasks and task allocations for all categories
  const loadAllTasksAndAllocations = async () => {
    if (categories.length === 0) return;

    try {
      const tasksData: Record<
        string,
        { tasks: Task[]; allocations: TaskAllocation[] }
      > = {};

      // Load tasks for each category
      for (const category of categories) {
        const tasks = await fetchTasksByCategory(category.id);
        tasksData[category.id] = { tasks, allocations: [] };

        // Load allocations for each task
        for (const task of tasks) {
          const allocations = await fetchTaskAllocations(task.id);
          tasksData[category.id].allocations.push(...allocations);
        }
      }

      setAllTasksData(tasksData);
    } catch (error) {
      console.error("Error loading all tasks and allocations:", error);
    }
  };

  // Handle category click for tasks
  const handleCategoryClickForTasks = (categoryId: string) => {
    if (selectedCategoryForTasks === categoryId) {
      // If already selected, deselect
      setSelectedCategoryForTasks(null);
      setTasks([]);
      setTaskAllocations([]);
    } else {
      // Select new category
      setSelectedCategoryForTasks(categoryId);
      loadTasksForCategory(categoryId);
    }
  };

  // Get person name for task allocations
  const getPersonNameForTask = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.name : "Unknown";
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  // Resolve a Lucide icon from the group's icon name (string stored in DB)
  const resolveGroupIcon = (iconName?: string) => {
    if (!iconName) return (LucideIcons as any)["Folder"];
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? Icon : (LucideIcons as any)["Folder"];
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header with legend and controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white dark:neon-text">
              Land iQ Functional Responsibility Chart
            </h2>

            {/* Legend for Lead */}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1 border border-gray-200 dark:border-gray-600 shadow-sm">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="font-medium">Lead</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                - Indicates the person is a Lead for this responsibility
              </span>
            </div>

            {/* Mobile-optimised organisation legend */}
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-800 dark:bg-blue-600 rounded border"></div>
                <span className="text-gray-700 dark:text-gray-300">PDNSW</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 dark:bg-red-700 border border-red-200 dark:border-red-500 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">WSP</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 dark:bg-orange-700 border border-orange-200 dark:border-orange-500 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Giraffe
                </span>
              </div>
            </div>
          </div>

          {/* Mobile-friendly controls */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={selectedPersonId || ""}
              onChange={(e) => setSelectedPersonId(e.target.value || null)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-400 dark:focus:ring-cyan-400"
              aria-label="Filter by person"
            >
              <option value="">All People</option>
              {[...people]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.organisation})
                  </option>
                ))}
            </select>

            {selectedPersonId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPersonId(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasData ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md">
                <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No data available yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  Start by creating groups, then add categories within those
                  groups, and finally allocate people to categories.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={onAddGroup}
                    className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add First Group
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4">
              {categories.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12 px-6 flex flex-col items-center">
                    {groups.length === 0 ? (
                      <>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          No groups or categories defined yet.
                        </p>
                        <Button
                          onClick={onAddGroup}
                          className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add First Group
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          You have groups but no categories yet.
                        </p>
                        <Button
                          onClick={onAddCategory}
                          className="bg-gray-800 hover:bg-gray-700 text-white dark:bg-pink-600 dark:hover:bg-pink-700 dark:neon-pink-glow"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add First Category
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-auto h-full">
                  <div className="w-full p-4">
                    {/* Matrix Header - Groups and Categories across the top */}
                    <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 pb-4 mb-4">
                      <div className="flex gap-4 flex-wrap">
                        {orderedGroups.map((group) => {
                          const groupCategories = getCategoriesForGroup(
                            group.id
                          );
                          if (groupCategories.length === 0) return null;

                          return (
                            <div key={group.id} className="flex-shrink-0 mb-4">
                              {/* Group Header */}
                              <div
                                className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 p-3 rounded-t-lg shadow-lg border border-slate-500"
                                style={{
                                  width: `${groupCategories.length * 200}px`,
                                }}
                              >
                                <div className="flex items-center justify-center gap-2 text-white drop-shadow-sm font-bold">
                                  {React.createElement(
                                    resolveGroupIcon(group.icon),
                                    { className: "h-4 w-4" }
                                  )}
                                  <span className="text-sm">{group.name}</span>
                                </div>
                              </div>

                              {/* Categories under this group */}
                              <div className="flex">
                                {groupCategories.map((category, index) => (
                                  <div
                                    key={category.id}
                                    className={cn(
                                      "border-l border-r border-b border-slate-300 dark:border-slate-600 w-[200px] bg-white dark:bg-gray-800",
                                      index === 0 && "rounded-bl-lg",
                                      index === groupCategories.length - 1 &&
                                        "rounded-br-lg"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "p-2 cursor-pointer transition-all duration-200 text-center border-b border-slate-200 dark:border-slate-600 h-16 flex items-center justify-center",
                                        highlightedCategory === category.id
                                          ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white"
                                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                      )}
                                      onClick={() => {
                                        setHighlightedCategory(
                                          highlightedCategory === category.id
                                            ? null
                                            : category.id
                                        );
                                        if (onCategoryClick) {
                                          onCategoryClick(category.id);
                                        }
                                      }}
                                    >
                                      <span className="text-xs font-medium leading-tight px-1 overflow-hidden text-ellipsis">
                                        {category.name}
                                      </span>
                                    </div>

                                    {/* People allocated to this category */}
                                    <div className="p-3 min-h-[200px]">
                                      {(() => {
                                        // Get all allocations for this category (from all organizations)
                                        const allOrgs = [
                                          "PDNSW",
                                          "WSP",
                                          "Giraffe",
                                        ];
                                        const allAllocations: any[] = [];

                                        allOrgs.forEach((org) => {
                                          const directAllocations =
                                            getAllocationsForCategoryAndOrg(
                                              category.id,
                                              org
                                            );
                                          const taskAllocations =
                                            getPeopleFromTaskAllocations(
                                              category.id,
                                              org
                                            );

                                          // Add direct allocations
                                          directAllocations.forEach((alloc) => {
                                            if (
                                              !allAllocations.some(
                                                (existing) =>
                                                  existing.personId ===
                                                  alloc.personId
                                              )
                                            ) {
                                              allAllocations.push(alloc);
                                            }
                                          });

                                          // Add task allocations (avoiding duplicates by personId)
                                          taskAllocations.forEach(
                                            (taskAlloc) => {
                                              if (
                                                !allAllocations.some(
                                                  (existing) =>
                                                    existing.personId ===
                                                    taskAlloc.personId
                                                )
                                              ) {
                                                allAllocations.push(taskAlloc);
                                              }
                                            }
                                          );
                                        });

                                        if (allAllocations.length > 0) {
                                          return (
                                            <div className="space-y-2">
                                              {allAllocations.map(
                                                (allocation) => {
                                                  const person = people.find(
                                                    (p) =>
                                                      p.id ===
                                                      allocation.personId
                                                  );
                                                  if (!person) return null;

                                                  // Get organization color
                                                  const getPersonOrgColor = (
                                                    org: string
                                                  ) => {
                                                    switch (org) {
                                                      case "PDNSW":
                                                        return "text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700";
                                                      case "WSP":
                                                        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700";
                                                      case "Giraffe":
                                                        return "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700";
                                                      default:
                                                        return "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600";
                                                    }
                                                  };

                                                  return (
                                                    <div
                                                      key={allocation.id}
                                                      className={cn(
                                                        "flex items-center justify-between gap-2 p-2 rounded text-xs group border",
                                                        getPersonOrgColor(
                                                          person.organisation
                                                        )
                                                      )}
                                                    >
                                                      <div className="flex items-center gap-1 min-w-0 flex-1">
                                                        <User className="h-3 w-3 flex-shrink-0" />
                                                        <span className="font-medium truncate">
                                                          {person.name}
                                                        </span>
                                                        {getOrganizationLogo(
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
                                                        {allocation.isLead && (
                                                          <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                                        )}
                                                      </div>
                                                      <div>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          onClick={() =>
                                                            onDeleteAllocation(
                                                              allocation.id
                                                            )
                                                          }
                                                          className="h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                          <X className="h-3 w-3" />
                                                          <span className="sr-only">
                                                            Remove
                                                          </span>
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div
                                              className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                              onClick={(e) => {
                                                handleCategoryClickForTasks(
                                                  category.id
                                                );
                                                onAddAllocation();
                                              }}
                                            >
                                              <div className="text-center">
                                                <User className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                                <span className="text-xs">
                                                  No allocations
                                                </span>
                                                <div className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                                                  Click to add
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* No groups message */}
                    {orderedGroups.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          No groups defined yet.
                        </p>
                        <Button
                          onClick={onAddGroup}
                          className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add First Group
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
