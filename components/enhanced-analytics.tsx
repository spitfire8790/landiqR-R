"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  TrendingUp,
  Users,
  Target,
  PieChart,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
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
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { Person, Allocation, Task, Group, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface EnhancedAnalyticsProps {
  people: Person[];
  allocations: Allocation[];
  tasks: Task[];
  groups: Group[];
  categories: Category[];
}

type DateRange = "7d" | "30d" | "90d" | "6m" | "1y";
type ChartType = "overview" | "groups" | "people" | "tasks" | "trends";

export default function EnhancedAnalytics({
  people,
  allocations,
  tasks,
  groups,
  categories,
}: EnhancedAnalyticsProps) {
  const [activeChart, setActiveChart] = useState<ChartType>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // Get unique organizations
  const organizations = useMemo(() => {
    const orgs = new Set(people.map((p) => p.organisation));
    return Array.from(orgs);
  }, [people]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filteredPeople = people;
    let filteredAllocations = allocations;

    if (selectedOrg !== "all") {
      filteredPeople = people.filter((p) => p.organisation === selectedOrg);
      const peopleIds = new Set(filteredPeople.map((p) => p.id));
      filteredAllocations = allocations.filter((a) =>
        peopleIds.has(a.personId)
      );
    }

    if (selectedGroup !== "all") {
      const groupCategories = categories.filter(
        (c) => c.groupId === selectedGroup
      );
      const categoryIds = new Set(groupCategories.map((c) => c.id));
      filteredAllocations = filteredAllocations.filter((a) =>
        categoryIds.has(a.categoryId)
      );
    }

    return { people: filteredPeople, allocations: filteredAllocations };
  }, [people, allocations, categories, selectedGroup, selectedOrg]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalPeople = filteredData.people.length;
    const totalAllocations = filteredData.allocations.length;
    const leadsCount = filteredData.allocations.filter((a) => a.isLead).length;
    const categoriesWithAllocations = new Set(
      filteredData.allocations.map((a) => a.categoryId)
    ).size;

    // Calculate allocation by organization
    const orgAllocations = organizations.map((org) => {
      const orgPeople = filteredData.people.filter(
        (p) => p.organisation === org
      );
      const orgPeopleIds = new Set(orgPeople.map((p) => p.id));
      const count = filteredData.allocations.filter((a) =>
        orgPeopleIds.has(a.personId)
      ).length;
      return { org, count };
    });

    // Calculate allocation by group
    const groupAllocations = groups.map((group) => {
      const groupCategories = categories.filter((c) => c.groupId === group.id);
      const categoryIds = new Set(groupCategories.map((c) => c.id));
      const count = filteredData.allocations.filter((a) =>
        categoryIds.has(a.categoryId)
      ).length;
      return { group: group.name, count };
    });

    return {
      totalPeople,
      totalAllocations,
      leadsCount,
      categoriesWithAllocations,
      orgAllocations,
      groupAllocations,
    };
  }, [filteredData, organizations, groups, categories]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 12 },
        },
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
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#6B7280", font: { size: 12 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280", font: { size: 12 }, maxRotation: 45 },
      },
    },
  };

  // Organization chart data
  const orgChartData = {
    labels: metrics.orgAllocations.map((item) => item.org),
    datasets: [
      {
        label: "Allocations",
        data: metrics.orgAllocations.map((item) => item.count),
        backgroundColor: [
          "#3B82F6", // Blue
          "#EF4444", // Red
          "#F59E0B", // Orange
          "#10B981", // Green
          "#8B5CF6", // Purple
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  // Group chart data
  const groupChartData = {
    labels: metrics.groupAllocations.map((item) => item.group),
    datasets: [
      {
        label: "Allocations by Group",
        data: metrics.groupAllocations.map((item) => item.count),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Refresh data
  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="p-6 space-y-6 h-full">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enhanced Analytics
          </h1>
          <p className="text-gray-600">
            Interactive insights and drill-down capabilities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dateRange}
            onValueChange={(value: DateRange) => setDateRange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total People
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalPeople}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+12%</span>
              <span className="text-gray-600 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Allocations
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalAllocations}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+8%</span>
              <span className="text-gray-600 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.leadsCount}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+5%</span>
              <span className="text-gray-600 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Categories
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.categoriesWithAllocations}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <PieChart className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+15%</span>
              <span className="text-gray-600 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Charts */}
      <Tabs
        value={activeChart}
        onValueChange={(value) => setActiveChart(value as ChartType)}
      >
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Allocations by Organization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Doughnut data={orgChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Allocations by Group
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={groupChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Group Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <Bar data={groupChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people">
          <Card>
            <CardHeader>
              <CardTitle>People Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <Doughnut data={orgChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-12">
                Task analytics will be available once task data is integrated.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-12">
                Trend data will be available with historical tracking.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
