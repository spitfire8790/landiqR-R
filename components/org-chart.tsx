"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Star, X, PlusCircle, AlertCircle, GripVertical } from "lucide-react"
import type { Person, Category, Allocation, Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface OrgChartProps {
  groups: Group[]
  categories: Category[]
  people: Person[]
  allocations: Allocation[]
  onDeleteAllocation: (id: string) => void
  onAddGroup: () => void
  onAddCategory: () => void
  onAddAllocation: () => void
}

// Sortable item wrapper for groups
function SortableGroup({
  group,
  children,
  width,
}: {
  group: Group
  children: React.ReactNode
  width: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group.id}`,
    data: {
      type: "group",
      group,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    width: width ? `${width}px` : "auto",
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 z-10"
      >
        <GripVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
      {children}
    </div>
  )
}

// Sortable item wrapper for categories
function SortableCategory({ category, children }: { category: Category; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${category.id}`,
    data: {
      type: "category",
      category,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        {...listeners}
        className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 z-10"
      >
        <GripVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
      {children}
    </div>
  )
}

// Group container component
function GroupContainer({
  group,
  categories,
  onDragEnd,
  highlightedCategory,
  setHighlightedCategory,
}: {
  group: Group
  categories: Category[]
  onDragEnd: (event: any) => void
  highlightedCategory: string | null
  setHighlightedCategory: (id: string | null) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <div className="flex flex-col w-full">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={categories.map((c) => `category-${c.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 mt-4">
            {categories.map((category) => (
              <SortableCategory key={category.id} category={category}>
                <motion.div
                  className={cn(
                    "p-3 rounded-lg shadow-sm border transition-all duration-200 w-36 h-[70px] flex items-center",
                    highlightedCategory === category.id
                      ? "bg-black dark:bg-pink-600 text-white border-gray-800 dark:border-pink-400 dark:neon-pink-glow"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700",
                  )}
                  whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setHighlightedCategory(highlightedCategory === category.id ? null : category.id)}
                >
                  <div className="font-medium text-xs pr-6 text-gray-900 dark:text-white">{category.name}</div>
                </motion.div>
              </SortableCategory>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
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
}: OrgChartProps) {
  const [activeView, setActiveView] = useState("matrix")
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)
  const [highlightedOrg, setHighlightedOrg] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // State for drag and drop ordering
  const [orderedGroups, setOrderedGroups] = useState<Group[]>([])
  const [orderedCategories, setOrderedCategories] = useState<Record<string, Category[]>>({})

  // Calculate group widths based on number of categories
  const groupWidths = useMemo(() => {
    const widths: Record<string, number> = {}

    Object.entries(orderedCategories).forEach(([groupId, cats]) => {
      // Each category is 144px (w-36) wide with 16px gap (4 in tailwind)
      widths[groupId] = cats.length > 0 ? cats.length * 144 + (cats.length - 1) * 16 : 0
    })

    return widths
  }, [orderedCategories])

  // Initialize ordered groups and categories
  useEffect(() => {
    setOrderedGroups([...groups])

    const categoryMap: Record<string, Category[]> = {}
    groups.forEach((group) => {
      const groupCategories = categories.filter((cat) => cat.groupId === group.id)
      categoryMap[group.id] = groupCategories
    })

    setOrderedCategories(categoryMap)
  }, [groups, categories])

  // Reset highlights when data changes
  useEffect(() => {
    setHighlightedCategory(null)
    setHighlightedOrg(null)
  }, [categories, groups])

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Handle drag end for groups
  const handleDragEndGroups = (event: any) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = String(active.id).replace("group-", "")
    const overId = String(over.id).replace("group-", "")

    const oldIndex = orderedGroups.findIndex((g) => g.id === activeId)
    const newIndex = orderedGroups.findIndex((g) => g.id === overId)

    if (oldIndex !== -1 && newIndex !== -1) {
      setOrderedGroups(arrayMove(orderedGroups, oldIndex, newIndex))
    }
  }

  // Handle drag end for categories within a specific group
  const handleDragEndCategories = (groupId: string) => (event: any) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = String(active.id).replace("category-", "")
    const overId = String(over.id).replace("category-", "")

    const groupCategories = [...(orderedCategories[groupId] || [])]
    const oldIndex = groupCategories.findIndex((c) => c.id === activeId)
    const newIndex = groupCategories.findIndex((c) => c.id === overId)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newGroupCategories = arrayMove(groupCategories, oldIndex, newIndex)
      setOrderedCategories({
        ...orderedCategories,
        [groupId]: newGroupCategories,
      })
    }
  }

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
    }
    return baseColors[org as keyof typeof baseColors] || (isHighlighted 
      ? "bg-gray-200 text-gray-900 border-gray-400 dark:bg-gray-600 dark:text-white dark:neon-glow" 
      : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500")
  }

  const organisations = ["PDNSW", "WSP", "Giraffe"]

  // Get categories for a specific group
  const getCategoriesForGroup = (groupId: string) => {
    return orderedCategories[groupId] || []
  }

  // Check if there's any data
  const hasData = groups.length > 0 || categories.length > 0 || people.length > 0

  // Get allocations for a specific category and organization, filtered by selected person if applicable
  const getAllocationsForCategoryAndOrg = (categoryId: string, org: string) => {
    return allocations.filter(
      (a) => {
        // Filter by category and organization
        const matchesBasicCriteria = a.categoryId === categoryId && 
          people.find((p) => p.id === a.personId)?.organisation === org;
        
        // If a person is selected, only show their allocations
        if (selectedPersonId) {
          return matchesBasicCriteria && a.personId === selectedPersonId;
        }
        
        return matchesBasicCriteria;
      }
    )
  }

  // Check if a cell should be highlighted
  const isCellHighlighted = (categoryId: string, org: string) => {
    return highlightedCategory === categoryId || highlightedOrg === org
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header with legend and controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white dark:neon-text">Land iQ Functional Responsibility Chart</h2>
            
            {/* Legend for Lead */}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1 border border-gray-200 dark:border-gray-600 shadow-sm">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="font-medium">Lead</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">- Indicates the person is a Lead for this responsibility</span>
            </div>
            
            {/* Mobile-optimized organization legend */}
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
                <span className="text-gray-700 dark:text-gray-300">Giraffe</span>
              </div>
            </div>
          </div>

          {/* Mobile-friendly controls */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={selectedPersonId || ""}
              onChange={(e) => setSelectedPersonId(e.target.value || null)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-400 dark:focus:ring-cyan-400"
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
        <div className="flex-1 overflow-hidden">
          {!hasData ? (
            <div className="h-full flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md"
              >
                <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No data available yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  Start by creating groups, then add categories within those groups, and finally allocate people to categories.
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
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4">
              {/* Custom Tab Navigation for Matrix/Org View */}
              <div className="grid grid-cols-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView("matrix")}
                  className={cn(
                    "py-2 px-4 text-sm font-medium transition-colors rounded-md",
                    activeView === "matrix" 
                      ? "bg-white dark:bg-gray-700 shadow-md text-black dark:text-white dark:neon-glow" 
                      : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white",
                  )}
                >
                  Matrix View
                </button>
                <button
                  onClick={() => setActiveView("org")}
                  className={cn(
                    "py-2 px-4 text-sm font-medium transition-colors rounded-md",
                    activeView === "org" 
                      ? "bg-white dark:bg-gray-700 shadow-md text-black dark:text-white dark:neon-glow" 
                      : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white",
                  )}
                >
                  Organisation View
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {activeView === "matrix" ? (
                      <div className="h-full flex flex-col">
                        {categories.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-12 px-6 flex flex-col items-center"
                            >
                              {groups.length === 0 ? (
                                <>
                                  <p className="text-gray-500 dark:text-gray-400 mb-4">No groups or categories defined yet.</p>
                                  <Button onClick={onAddGroup} className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add First Group
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <p className="text-gray-500 dark:text-gray-400 mb-4">You have groups but no categories yet.</p>
                                  <Button onClick={onAddCategory} className="bg-gray-800 hover:bg-gray-700 text-white dark:bg-pink-600 dark:hover:bg-pink-700 dark:neon-pink-glow">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add First Category
                                  </Button>
                                </>
                              )}
                            </motion.div>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-hidden">
                            {/* Mobile: Vertical stack, Desktop: Horizontal scroll */}
                            <div className="h-full w-full overflow-auto">
                              <div className="pb-4 pr-4 min-w-max">
                                {/* Matrix Header - Organization label */}
                                <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
                                  <div className="font-bold p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-white sticky top-0 z-10">Organisation</div>

                                  {/* Group headers and their categories */}
                                  <div className="grid gap-4">
                                    {/* Group headers row with DnD */}
                                    <DndContext
                                      sensors={sensors}
                                      collisionDetection={closestCenter}
                                      onDragEnd={handleDragEndGroups}
                                    >
                                      <SortableContext
                                        items={orderedGroups.map((g) => `group-${g.id}`)}
                                        strategy={horizontalListSortingStrategy}
                                      >
                                        <div className="flex gap-4 min-w-max">
                                          {orderedGroups.map((group) => {
                                            const groupCategories = getCategoriesForGroup(group.id)
                                            if (groupCategories.length === 0) return null

                                            const groupWidth = groupWidths[group.id] || 0

                                            return (
                                              <SortableGroup key={group.id} group={group} width={groupWidth}>
                                                <div
                                                  className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-sm h-[56px] flex items-center"
                                                  style={{ width: "100%" }}
                                                >
                                                  <div className="font-bold pl-6 text-gray-900 dark:text-white">{group.name}</div>
                                                </div>

                                                {/* Categories for this group */}
                                                <GroupContainer
                                                  group={group}
                                                  categories={groupCategories}
                                                  onDragEnd={handleDragEndCategories(group.id)}
                                                  highlightedCategory={highlightedCategory}
                                                  setHighlightedCategory={setHighlightedCategory}
                                                />
                                              </SortableGroup>
                                            )
                                          })}
                                        </div>
                                      </SortableContext>
                                    </DndContext>
                                  </div>
                                </div>

                                {/* Matrix Rows - One per organisation */}
                                {organisations.map((org) => (
                                  <div key={org} className="grid grid-cols-[200px_1fr] gap-4 mb-4">
                                    <motion.div
                                      className={cn(
                                        "p-4 rounded-lg font-medium shadow-sm border cursor-pointer transition-all duration-200 overflow-hidden sticky top-0 z-10",
                                        getOrgColor(org, highlightedOrg === org),
                                      )}
                                      whileHover={{ scale: 1.02 }}
                                      transition={{ duration: 0.2 }}
                                      onClick={() => setHighlightedOrg(highlightedOrg === org ? null : org)}
                                    >
                                      {org}
                                    </motion.div>

                                    <div className="flex gap-4 min-w-max">
                                      {orderedGroups.map((group) => {
                                        const groupCategories = getCategoriesForGroup(group.id)
                                        if (groupCategories.length === 0) return null

                                        return (
                                          <div key={`${org}-${group.id}`} className="flex gap-4">
                                            {groupCategories.map((category) => {
                                              const cellAllocations = getAllocationsForCategoryAndOrg(category.id, org)
                                              const isHighlighted = isCellHighlighted(category.id, org)

                                              return (
                                                <motion.div
                                                  key={`${org}-${category.id}`}
                                                  className={cn(
                                                    "border p-2 rounded-lg shadow-sm transition-all duration-200 w-36 flex-1 cursor-pointer",
                                                    isHighlighted
                                                      ? "bg-gray-50 dark:bg-gray-700 border-gray-400 dark:border-gray-500 shadow-md"
                                                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600",
                                                  )}
                                                  whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                                                  transition={{ duration: 0.2 }}
                                                  onClick={onAddAllocation}
                                                >
                                                  {cellAllocations.length === 0 ? (
                                                    <div
                                                      className="text-xs text-gray-400 dark:text-gray-500 italic h-full flex items-center justify-center cursor-pointer"
                                                      onClick={onAddAllocation}
                                                    >
                                                      <PlusCircle className="h-4 w-4 opacity-50" />
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col space-y-2 flex-1">
                                                      {cellAllocations.map((allocation) => {
                                                        const person = people.find((p) => p.id === allocation.personId)
                                                        if (!person) return null
                                                        return (
                                                          <motion.div
                                                            key={allocation.id}
                                                            className={cn(
                                                              "flex justify-between items-center p-1.5 rounded-md border shadow-sm",
                                                              allocation.isLead
                                                                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600 shadow-yellow-200 dark:neon-yellow-glow"
                                                                : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600",
                                                              isHighlighted && !allocation.isLead ? "border-gray-300 dark:border-gray-500" : ""
                                                            )}
                                                            whileHover={{ scale: 1.02 }}
                                                            transition={{ duration: 0.2 }}
                                                          >
                                                            <div className="flex items-center gap-1">
                                                              {allocation.isLead && (
                                                                <TooltipProvider>
                                                                  <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                      <Star className="h-3 w-3 text-yellow-400 flex-shrink-0 animate-pulse" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                      <p>Lead</p>
                                                                    </TooltipContent>
                                                                  </Tooltip>
                                                                </TooltipProvider>
                                                              )}
                                                              <div>
                                                                <div className="font-medium text-xs text-gray-900 dark:text-white">{person.name}</div>
                                                              </div>
                                                            </div>
                                                            <motion.div
                                                              whileHover={{ scale: 1.1 }}
                                                              whileTap={{ scale: 0.9 }}
                                                            >
                                                              <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onDeleteAllocation(allocation.id)}
                                                                className="h-5 w-5 opacity-50 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white"
                                                              >
                                                                <X className="h-3 w-3" />
                                                                <span className="sr-only">Remove</span>
                                                              </Button>
                                                            </motion.div>
                                                          </motion.div>
                                                        )
                                                      })}
                                                    </div>
                                                  )}
                                                </motion.div>
                                              )
                                            })}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Organization View - Mobile optimized */
                      <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                          <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
                            {organisations.map((org) => (
                              <motion.div
                                key={org}
                                className={cn(
                                  "border rounded-lg overflow-hidden shadow-lg",
                                  getOrgColor(org, highlightedOrg === org),
                                )}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                              >
                                <div className="p-3 sm:p-4 bg-white bg-opacity-30 backdrop-blur-sm">
                                  <h3 className="text-lg font-bold">{org}</h3>
                                </div>
                                <div className="p-3 sm:p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {orderedGroups.map((group) => {
                                      const groupCategories = getCategoriesForGroup(group.id)

                                      if (groupCategories.length === 0) return null

                                      const hasAllocations = groupCategories.some((category) =>
                                        allocations.some(
                                          (a) =>
                                            a.categoryId === category.id &&
                                            people.find((p) => p.id === a.personId)?.organisation === org,
                                        ),
                                      )

                                      if (!hasAllocations) return null

                                      return (
                                        <motion.div
                                          key={`${org}-${group.id}`}
                                          className="border bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                                          whileHover={{
                                            y: -5,
                                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                                          }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <div className="bg-gray-100 dark:bg-gray-700 p-3 border-b dark:border-gray-600">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{group.name}</h4>
                                          </div>
                                          <div className="p-3 space-y-4">
                                            {groupCategories.map((category) => {
                                              const categoryAllocations = allocations.filter(
                                                (a) =>
                                                  a.categoryId === category.id &&
                                                  people.find((p) => p.id === a.personId)?.organisation === org,
                                              )

                                              if (categoryAllocations.length === 0) return null

                                              return (
                                                <div key={category.id} className="border-t dark:border-gray-600 pt-3">
                                                  <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300">{category.name}</h5>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={onAddAllocation}
                                                      className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                    >
                                                      <PlusCircle className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                                      <span className="sr-only">Add allocation</span>
                                                    </Button>
                                                  </div>
                                                  <ul className="space-y-2">
                                                    {categoryAllocations.map((allocation) => {
                                                      const person = people.find((p) => p.id === allocation.personId)
                                                      return person ? (
                                                        <motion.div
                                                          key={allocation.id}
                                                          className="flex justify-between items-center p-1.5 rounded-md border shadow-sm bg-white dark:bg-gray-700 mb-1 border-gray-200 dark:border-gray-600"
                                                          whileHover={{ scale: 1.02, backgroundColor: "#f9fafb" }}
                                                          transition={{ duration: 0.2 }}
                                                        >
                                                          <div className="flex items-center gap-1">
                                                            {allocation.isLead && (
                                                              <TooltipProvider>
                                                                <Tooltip>
                                                                  <TooltipTrigger asChild>
                                                                    <Star className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                                                                  </TooltipTrigger>
                                                                  <TooltipContent>
                                                                    <p>Lead</p>
                                                                  </TooltipContent>
                                                                </Tooltip>
                                                              </TooltipProvider>
                                                            )}
                                                            <div>
                                                              <div className="font-medium text-gray-900 dark:text-white">
                                                                {person.name}
                                                              </div>
                                                              {person.role && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">{person.role}</div>
                                                              )}
                                                            </div>
                                                          </div>
                                                          <motion.div
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                          >
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              onClick={() => onDeleteAllocation(allocation.id)}
                                                              className="h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                            >
                                                              <X className="h-4 w-4" />
                                                              <span className="sr-only">Remove</span>
                                                            </Button>
                                                          </motion.div>
                                                        </motion.div>
                                                      ) : null
                                                    })}
                                                  </ul>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </motion.div>
                                      )
                                    })}
                                    {groups.length === 0 && (
                                      <div className="col-span-3 text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">No groups defined yet.</p>
                                        <Button onClick={onAddGroup} className="bg-black hover:bg-gray-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:neon-glow">
                                          <PlusCircle className="mr-2 h-4 w-4" />
                                          Add First Group
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
