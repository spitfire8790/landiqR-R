"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrganizationLogo } from "@/lib/utils";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeaveDialog } from "@/components/leave-dialog";
import { fetchLeave } from "@/lib/data-service";
import type {
  Person,
  Group,
  Task,
  TaskAllocation,
  Category,
  Leave,
} from "@/lib/types";

const leaveColor = "bg-blue-500";

interface CalendarViewProps {
  people: Person[];
  groups: Group[];
  tasks?: Task[];
  taskAllocations?: TaskAllocation[];
  categories?: Category[];
  currentUserId?: string;
  currentUserEmail?: string;
  isAdmin?: boolean;
}

interface RiskItem {
  categoryId: string;
  categoryName: string;
  riskLevel: "single" | "double";
  affectedTasks: {
    taskId: string;
    taskName: string;
    personId: string;
    personName: string;
    leaveStart: string;
    leaveEnd: string;
  }[];
}

export default function CalendarView({
  people,
  groups,
  tasks = [],
  taskAllocations = [],
  categories = [],
  currentUserId,
  currentUserEmail,
  isAdmin = false,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveData, setLeaveData] = useState<Leave[]>([]);
  const [isLoadingLeave, setIsLoadingLeave] = useState(true);

  // Load leave data
  const loadLeaveData = async () => {
    setIsLoadingLeave(true);
    try {
      const data = await fetchLeave();
      setLeaveData(data);
    } catch (error) {
      console.error("Error loading leave data:", error);
    } finally {
      setIsLoadingLeave(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, []);

  // Find current user's person record by email
  const currentUserPerson = currentUserEmail
    ? people.find((p) => p.email === currentUserEmail)
    : null;

  // Handle new leave creation
  const handleLeaveCreated = async (newLeave: Leave) => {
    // Add to local state immediately for instant UI update
    setLeaveData((prev) => [...prev, newLeave]);

    // Also refresh from database to ensure consistency
    await loadLeaveData();
  };

  // Calculate risks for the next month
  const riskAnalysis = useMemo(() => {
    const today = new Date();
    const oneMonthFromNow = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );

    // Get all leave periods in the next month
    const upcomingLeave = leaveData.filter((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return leaveStart <= oneMonthFromNow && leaveEnd >= today;
    });

    const risks: RiskItem[] = [];
    const categoryRisks = new Map<string, RiskItem>();

    upcomingLeave.forEach((leave) => {
      const person = people.find((p) => p.id === leave.personId);
      if (!person) return;

      // Find all tasks this person is allocated to
      const personTaskAllocations = taskAllocations.filter(
        (ta) => ta.personId === person.id
      );

      personTaskAllocations.forEach((allocation) => {
        const task = tasks.find((t) => t.id === allocation.taskId);
        if (!task) return;

        // Check if this person is the only one allocated to this task
        const taskAllocationsForTask = taskAllocations.filter(
          (ta) => ta.taskId === task.id
        );
        const isOnlyPerson = taskAllocationsForTask.length === 1;

        if (isOnlyPerson) {
          const category = categories.find((c) => c.id === task.categoryId);
          if (!category) return;

          const categoryId = category.id;
          const categoryName = category.name;

          if (!categoryRisks.has(categoryId)) {
            categoryRisks.set(categoryId, {
              categoryId,
              categoryName,
              riskLevel: "single",
              affectedTasks: [],
            });
          }

          const existingRisk = categoryRisks.get(categoryId)!;
          existingRisk.affectedTasks.push({
            taskId: task.id,
            taskName: task.name,
            personId: person.id,
            personName: person.name,
            leaveStart: leave.startDate,
            leaveEnd: leave.endDate,
          });

          // Check if this creates a double risk (multiple single-person tasks affected)
          if (existingRisk.affectedTasks.length > 1) {
            existingRisk.riskLevel = "double";
          }
        }
      });
    });

    return Array.from(categoryRisks.values());
  }, [leaveData, people, tasks, taskAllocations, categories]);

  const handleRiskClick = (risk: RiskItem) => {
    setSelectedRisk(risk);
    setRiskModalOpen(true);
  };

  // Group people by organization
  const peopleByOrg = useMemo(() => {
    const grouped: { [key: string]: Person[] } = {};

    people.forEach((person) => {
      const orgName = person.organisation || "Unassigned";

      if (!grouped[orgName]) {
        grouped[orgName] = [];
      }
      grouped[orgName].push(person);
    });

    // Sort organizations alphabetically, and people within each org alphabetically
    const sortedGrouped: { [key: string]: Person[] } = {};
    Object.keys(grouped)
      .sort()
      .forEach((orgName) => {
        sortedGrouped[orgName] = grouped[orgName].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });

    return sortedGrouped;
  }, [people]);

  // Get calendar grid for current month (weekdays only)
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Find first Monday of the month or the Monday before if month doesn't start on Monday
    const startCalendar = new Date(firstDay);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Get to previous Monday
    startCalendar.setDate(startCalendar.getDate() - daysToSubtract);

    const days = [];
    const currentDay = new Date(startCalendar);

    // Generate all days for 6 weeks, then filter for weekdays
    for (let i = 0; i < 42; i++) {
      // 6 weeks * 7 days
      const dayOfWeek = currentDay.getDay();
      // Only include Monday (1) through Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Create date at noon local time to avoid timezone issues
        const date = new Date(
          currentDay.getFullYear(),
          currentDay.getMonth(),
          currentDay.getDate(),
          12,
          0,
          0
        );
        days.push(date);
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    // Format as YYYY-MM-DD in local time, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateInLeave = (date: Date, leave: Leave) => {
    const dateStr = formatDate(date);
    return dateStr >= leave.startDate && dateStr <= leave.endDate;
  };

  const getLeaveForPersonOnDate = (personId: string, date: Date) => {
    return leaveData.find(
      (leave) => leave.personId === personId && isDateInLeave(date, leave)
    );
  };

  const days = getCalendarDays();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <Button
          onClick={() => setLeaveDialogOpen(true)}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Leave
        </Button>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-20" /> {/* Spacer for balance */}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* People Sidebar */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Team Members
            </h3>

            <div className="space-y-4">
              {Object.entries(peopleByOrg).map(([orgName, orgPeople]) => (
                <div key={orgName}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                    {orgName}
                  </h4>
                  <div className="space-y-2">
                    {orgPeople.map((person) => {
                      // Check if person is currently on leave (today)
                      const today = new Date();
                      const isCurrentlyOnLeave = leaveData.some(
                        (leave) =>
                          leave.personId === person.id &&
                          isDateInLeave(today, leave)
                      );

                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {getOrganizationLogo(person.organisation) && (
                              <Image
                                src={getOrganizationLogo(person.organisation)}
                                alt={`${person.organisation} logo`}
                                width={20}
                                height={20}
                                className="flex-shrink-0"
                              />
                            )}
                            <span className="text-sm text-gray-900">
                              {person.name}
                            </span>
                          </div>
                          {isCurrentlyOnLeave && (
                            <Badge variant="secondary" className="text-xs">
                              On Leave
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
              <div className="flex items-center text-xs">
                <div className={`w-3 h-3 rounded mr-2 ${leaveColor}`}></div>
                <span>Leave</span>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                Risk Assessment
              </h4>
              <div className="text-xs text-gray-600">
                {riskAnalysis.length === 0 ? (
                  <p>
                    No critical staffing risks identified for the next month.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="mb-2">Critical risks for the next month:</p>
                    {riskAnalysis.map((risk) => (
                      <div
                        key={risk.categoryId}
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded border"
                        onClick={() => handleRiskClick(risk)}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              risk.riskLevel === "double"
                                ? "bg-red-600 shadow-lg"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <span
                            className={`text-xs font-medium ${
                              risk.riskLevel === "double"
                                ? "text-red-700"
                                : "text-red-600"
                            }`}
                          >
                            {risk.categoryName}
                          </span>
                          {risk.riskLevel === "double" && (
                            <span className="ml-1 text-xs text-red-700 font-bold">
                              ⚠⚠
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-4">
                          {risk.affectedTasks.length} task
                          {risk.affectedTasks.length > 1 ? "s" : ""} at risk
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Calendar Header */}
            <div className="grid grid-cols-5 border-b">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium bg-gray-800 text-white border-r border-gray-700 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-5">
              {days.map((day, dayIndex) => {
                const isCurrentMonth =
                  day.getMonth() === currentDate.getMonth();
                const isToday =
                  day.toDateString() === new Date().toDateString();
                const isPastDay =
                  day < new Date(new Date().setHours(0, 0, 0, 0));

                // Get all people with leave on this day
                const peopleOnLeave = people.filter((person) =>
                  leaveData.some(
                    (leave) =>
                      leave.personId === person.id && isDateInLeave(day, leave)
                  )
                );

                return (
                  <div
                    key={dayIndex}
                    className={`min-h-32 p-2 relative ${
                      !isCurrentMonth
                        ? "bg-gray-50"
                        : isPastDay
                        ? "bg-gray-100"
                        : "bg-white"
                    } ${
                      isToday
                        ? "border-2 border-red-500 bg-red-50"
                        : "border-r border-b last:border-r-0"
                    }`}
                  >
                    <div
                      className={`text-sm mb-2 ${
                        !isCurrentMonth
                          ? "text-gray-400"
                          : isPastDay
                          ? "text-gray-500"
                          : "text-gray-900"
                      } ${isToday ? "font-bold text-red-600" : ""}`}
                    >
                      {day.getDate()}
                    </div>

                    {/* Leave blocks */}
                    <div className="space-y-1">
                      {peopleOnLeave.map((person) => {
                        const leave = getLeaveForPersonOnDate(person.id, day);
                        if (!leave) return null;

                        return (
                          <div
                            key={`${person.id}-${formatDate(day)}`}
                            className={`text-xs px-2 py-1 rounded text-white truncate ${leaveColor} font-medium`}
                            title={`${person.name} - Leave${
                              leave.description ? `: ${leave.description}` : ""
                            }`}
                          >
                            {person.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Details Modal */}
      <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Risk Details: {selectedRisk?.categoryName}
              {selectedRisk?.riskLevel === "double" && (
                <span className="ml-2 text-red-700 font-bold">⚠⚠ CRITICAL</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                This category has {selectedRisk.affectedTasks.length} task
                {selectedRisk.affectedTasks.length > 1 ? "s" : ""} at risk due
                to key personnel being on leave.
              </div>

              <div className="space-y-3">
                {selectedRisk.affectedTasks.map((task, index) => (
                  <div
                    key={`${task.taskId}-${index}`}
                    className="border p-3 rounded-lg bg-red-50"
                  >
                    <div className="font-medium text-red-800 mb-2">
                      Task: {task.taskName}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Person:
                        </span>
                        <div className="text-gray-600">{task.personName}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Leave Start:
                        </span>
                        <div className="text-gray-600">
                          {new Date(task.leaveStart).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Leave End:
                        </span>
                        <div className="text-gray-600">
                          {new Date(task.leaveEnd).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                      ⚠️ This person is the only one assigned to this task
                    </div>
                  </div>
                ))}
              </div>

              {selectedRisk.riskLevel === "double" && (
                <div className="bg-red-100 border border-red-300 p-3 rounded-lg">
                  <div className="text-red-800 font-medium text-sm">
                    🚨 CRITICAL RISK: Multiple tasks in this category will have
                    no coverage during leave periods.
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <LeaveDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        people={people}
        currentUserId={currentUserPerson?.id}
        isAdmin={isAdmin}
        onLeaveCreated={handleLeaveCreated}
      />
    </div>
  );
}
