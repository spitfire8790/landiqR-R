"use client";

import { useState, useEffect, useMemo } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  UserCircle,
  Timer,
  ChartBar,
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import type {
  Person,
  Allocation,
  Task,
  Responsibility,
  TaskAllocation,
} from "@/lib/types";
import {
  fetchTasks,
  fetchResponsibilities,
  fetchTaskAllocations,
} from "@/lib/data-service";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface ResponsibilityChartProps {
  people: Person[];
  allocations: Allocation[];
}

export default function ResponsibilityChart({
  people,
  allocations,
}: ResponsibilityChartProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    []
  );
  const [taskAllocations, setTaskAllocations] = useState<TaskAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load additional data for comprehensive analytics
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        const [tasksData, taskAllocationsData] = await Promise.all([
          fetchTasks(),
          fetchTaskAllocations(),
        ]);

        setTasks(tasksData);
        setTaskAllocations(taskAllocationsData);

        // Fetch all responsibilities for all tasks
        const allResponsibilities: Responsibility[] = [];
        for (const task of tasksData) {
          const taskResponsibilities = await fetchResponsibilities(task.id);
          allResponsibilities.push(...taskResponsibilities);
        }
        setResponsibilities(allResponsibilities);
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  // Modern color palette
  const colors = {
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",
    gray: "#6B7280",
    gradients: {
      blue: ["#3B82F6", "#1D4ED8"],
      purple: ["#8B5CF6", "#7C3AED"],
      green: ["#10B981", "#059669"],
      orange: ["#F59E0B", "#D97706"],
      red: ["#EF4444", "#DC2626"],
      cyan: ["#06B6D4", "#0891B2"],
    },
  };

  // Organisation colors
  const getOrgColor = (org: string, alpha: number = 1) => {
    const orgColors = {
      PDNSW: `rgba(59, 130, 246, ${alpha})`, // Blue
      WSP: `rgba(239, 68, 68, ${alpha})`, // Red
      Giraffe: `rgba(245, 158, 11, ${alpha})`, // Orange
    };
    return (
      orgColors[org as keyof typeof orgColors] ||
      `rgba(107, 114, 128, ${alpha})`
    );
  };

  // Chart 1: Responsibility Allocation by Person
  const responsibilityAllocationData = useMemo(() => {
    const responsibilityCounts: Record<string, number> = {};

    allocations.forEach((allocation) => {
      responsibilityCounts[allocation.personId] =
        (responsibilityCounts[allocation.personId] || 0) + 1;
    });

    const sortedPeople = [...people]
      .filter((person) => responsibilityCounts[person.id] > 0)
      .sort(
        (a, b) =>
          (responsibilityCounts[b.id] || 0) - (responsibilityCounts[a.id] || 0)
      );

    return {
      labels: sortedPeople.map((person) => person.name),
      datasets: [
        {
          label: "Category Allocations",
          data: sortedPeople.map(
            (person) => responsibilityCounts[person.id] || 0
          ),
          backgroundColor: sortedPeople.map((person) =>
            getOrgColor(person.organisation, 0.8)
          ),
          borderColor: sortedPeople.map((person) =>
            getOrgColor(person.organisation, 1)
          ),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
  }, [people, allocations]);

  // Chart 2: Task Time Allocation by Person
  const taskTimeAllocationData = useMemo(() => {
    const timeByPerson: Record<string, number> = {};

    // Sum up hours from task allocations
    taskAllocations.forEach((allocation) => {
      const task = tasks.find((t) => t.id === allocation.taskId);
      if (task && task.hoursPerWeek) {
        timeByPerson[allocation.personId] =
          (timeByPerson[allocation.personId] || 0) + task.hoursPerWeek;
      }
    });

    const sortedPeople = [...people]
      .filter((person) => timeByPerson[person.id] > 0)
      .sort((a, b) => (timeByPerson[b.id] || 0) - (timeByPerson[a.id] || 0));

    return {
      labels: sortedPeople.map((person) => person.name),
      datasets: [
        {
          label: "Weekly Hours",
          data: sortedPeople.map((person) => timeByPerson[person.id] || 0),
          backgroundColor: sortedPeople.map((person) =>
            getOrgColor(person.organisation, 0.8)
          ),
          borderColor: sortedPeople.map((person) =>
            getOrgColor(person.organisation, 1)
          ),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [people, tasks, taskAllocations]);

  // Chart 3: Organisation Distribution
  const organisationData = useMemo(() => {
    const orgCounts: Record<string, number> = {};
    people.forEach((person) => {
      orgCounts[person.organisation] =
        (orgCounts[person.organisation] || 0) + 1;
    });

    const orgs = Object.keys(orgCounts);

    return {
      labels: orgs,
      datasets: [
        {
          data: orgs.map((org) => orgCounts[org]),
          backgroundColor: orgs.map((org) => getOrgColor(org, 0.8)),
          borderColor: orgs.map((org) => getOrgColor(org, 1)),
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [people]);

  // Chart 4: Workload Trend Analysis
  const workloadTrendData = useMemo(() => {
    const workloadByOrg: Record<string, number> = {};

    // Calculate workload by organization using task allocations and task hours
    taskAllocations.forEach((allocation) => {
      const person = people.find((p) => p.id === allocation.personId);
      const task = tasks.find((t) => t.id === allocation.taskId);
      if (person && task && task.hoursPerWeek) {
        workloadByOrg[person.organisation] =
          (workloadByOrg[person.organisation] || 0) + task.hoursPerWeek;
      }
    });

    const orgs = Object.keys(workloadByOrg).sort();

    return {
      labels: orgs,
      datasets: [
        {
          label: "Total Weekly Hours",
          data: orgs.map((org) => workloadByOrg[org] || 0),
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}20`,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colors.primary,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [people, tasks, taskAllocations]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalPeople = people.length;
    const totalAllocations = allocations.length;
    const totalTasks = tasks.length;
    const totalWeeklyHours = tasks.reduce(
      (sum, task) => sum + task.hoursPerWeek,
      0
    );
    const avgHoursPerPerson =
      totalPeople > 0 ? (totalWeeklyHours / totalPeople).toFixed(1) : "0";
    const tasksWithAssignments = tasks.filter((task) =>
      taskAllocations.some((allocation) => allocation.taskId === task.id)
    ).length;
    const assignmentRate =
      totalTasks > 0
        ? ((tasksWithAssignments / totalTasks) * 100).toFixed(1)
        : "0";

    return {
      totalPeople,
      totalAllocations,
      totalTasks,
      totalWeeklyHours,
      avgHoursPerPerson,
      assignmentRate,
    };
  }, [people, allocations, tasks, taskAllocations]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
          },
          maxRotation: 45,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    cutout: "60%",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-white">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive insights into team allocation and workload
              </p>
            </div>
            {/* Live Data badge removed */}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border border-black rounded-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 text-sm font-medium">
                      Total People
                    </p>
                    <p className="text-3xl font-bold">{stats.totalPeople}</p>
                  </div>
                  <UserCircle className="h-8 w-8 text-black" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-black rounded-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 text-sm font-medium">
                      Weekly Hours
                    </p>
                    <p className="text-3xl font-bold">
                      {stats.totalWeeklyHours}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-black" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-black rounded-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 text-sm font-medium">
                      Avg Hours/Person
                    </p>
                    <p className="text-3xl font-bold">
                      {stats.avgHoursPerPerson}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-black" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-black rounded-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 text-sm font-medium">
                      Assignment Rate
                    </p>
                    <p className="text-3xl font-bold">
                      {stats.assignmentRate}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-black" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Allocations Chart */}
            <Card className="bg-white border border-black rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <ChartBar className="h-5 w-5 mr-2 text-black" />
                  Category Allocations by Person
                </CardTitle>
                <CardDescription>
                  Number of category responsibilities assigned to each team
                  member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar
                    data={responsibilityAllocationData}
                    options={chartOptions as any}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Task Time Allocation Chart */}
            <Card className="bg-white border border-black rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <Timer className="h-5 w-5 mr-2 text-black" />
                  Task Time Allocation by Person
                </CardTitle>
                <CardDescription>
                  Weekly hours allocated to each person across all tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar
                    data={taskTimeAllocationData}
                    options={chartOptions as any}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organisation Distribution */}
            <Card className="bg-white border border-black rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <PieChartIcon className="h-5 w-5 mr-2 text-black" />
                  Team Distribution by Organisation
                </CardTitle>
                <CardDescription>
                  Breakdown of team members across organisations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut
                    data={organisationData}
                    options={doughnutOptions as any}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Workload by Organisation */}
            <Card className="bg-white border border-black rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <TrendingUpIcon className="h-5 w-5 mr-2 text-black" />
                  Workload by Organisation
                </CardTitle>
                <CardDescription>
                  Total weekly hours allocated by organisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: workloadTrendData.labels,
                      datasets: [
                        {
                          label: "Total Weekly Hours",
                          data: workloadTrendData.datasets[0].data,
                          backgroundColor: workloadTrendData.labels.map((org) =>
                            getOrgColor(org, 0.8)
                          ),
                          borderColor: workloadTrendData.labels.map((org) =>
                            getOrgColor(org, 1)
                          ),
                          borderWidth: 2,
                          borderRadius: 8,
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={
                      {
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          y: {
                            ...chartOptions.scales.y,
                            title: {
                              display: true,
                              text: "Weekly Hours",
                              color: "#6B7280",
                              font: {
                                size: 12,
                              },
                            },
                          },
                        },
                      } as any
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organisation Legend */}
          <Card className="bg-white border border-black rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Organisation Legend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Array.from(new Set(people.map((p) => p.organisation))).map(
                  (org) => (
                    <div key={org} className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: getOrgColor(org) }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {org}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {people.filter((p) => p.organisation === org).length}{" "}
                        members
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
