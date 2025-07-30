"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  EngagementTrajectoryProps,
  UserEngagementData,
  CohortData,
} from "../types/engagement.types";
import { EngagementTrajectoryService } from "../services/engagement-trajectory-service";

interface UserPoint {
  email: string;
  org: string;
  g_days: number;
  l_days: number;
  g_events?: string[];
  l_events?: string[];
}

interface Props extends EngagementTrajectoryProps {
  userPoints: Array<UserPoint>;
}

export function EngagementTrajectoryChart({
  userPoints,
  timeframe = "last_6_months",
  selectedUsers = [],
  selectedOrganisations = [],
  showTrendArrows = true,
  showCohortAnalysis = false,
  height = 400,
}: Props) {
  const [viewMode, setViewMode] = useState<
    "organisation" | "cohort" | "aggregate"
  >("aggregate");
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [visibleUsers, setVisibleUsers] = useState<string[]>([]);
  const [showLandIQ, setShowLandIQ] = useState(true);
  const [highlightTrend, setHighlightTrend] = useState<
    "increasing" | "decreasing" | "all"
  >("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");

  // Process engagement data
  const engagementData = useMemo(() => {
    return EngagementTrajectoryService.processUserEngagementData(userPoints);
  }, [userPoints]);

  // Generate cohort data
  const cohortData = useMemo(() => {
    return EngagementTrajectoryService.generateCohortData(engagementData);
  }, [engagementData]);

  // Get unique organisations
  const uniqueOrganisations = useMemo(() => {
    const orgs = new Set(engagementData.map((user) => user.organisation));
    return Array.from(orgs).sort();
  }, [engagementData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = engagementData;

    // For organisation view, use internal selectedOrg
    if (viewMode === "organisation" && selectedOrg !== "all") {
      filtered = filtered.filter((user) => user.organisation === selectedOrg);
    } else if (selectedOrganisations.length > 0) {
      filtered = filtered.filter((user) =>
        selectedOrganisations.includes(user.organisation)
      );
    }

    if (selectedUsers.length > 0) {
      filtered = filtered.filter((user) => selectedUsers.includes(user.email));
    }

    if (highlightTrend !== "all") {
      filtered = filtered.filter(
        (user) => user.overall_trend === highlightTrend
      );
    }

    return filtered;
  }, [
    engagementData,
    selectedOrganisations,
    selectedUsers,
    highlightTrend,
    viewMode,
    selectedOrg,
  ]);

  // Prepare chart data based on view mode
  const chartData = useMemo(() => {
    if (viewMode === "cohort") {
      // Aggregate by cohort
      const cohortAggregated = cohortData
        .filter(
          (cohort) =>
            selectedCohorts.length === 0 ||
            selectedCohorts.includes(cohort.cohort_month)
        )
        .map((cohort) => {
          const monthlyData = new Map();

          cohort.users.forEach((user) => {
            user.activity_points.forEach((point) => {
              const monthKey = format(parseISO(point.date), "MMM yyyy");
              if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                  month: monthKey,
                  date: point.date,
                  giraffe_usage: 0,
                  landiq_usage: 0,
                  user_count: 0,
                });
              }

              const existing = monthlyData.get(monthKey);
              existing.giraffe_usage += point.giraffe_usage;
              existing.landiq_usage += point.landiq_usage;
              existing.user_count = cohort.user_count;
            });
          });

          return {
            cohort: cohort.cohort_month,
            data: Array.from(monthlyData.values()).sort((a, b) =>
              a.date.localeCompare(b.date)
            ),
          };
        });

      return cohortAggregated;
    } else if (viewMode === "organisation") {
      // Calculate min, median, max statistics for organisation view
      const orgUsers = filteredData.filter(
        (user) => visibleUsers.length === 0 || visibleUsers.includes(user.email)
      );

      const statsMap = new Map<string, any>();

      // Collect all values per month
      const monthlyValues = new Map<string, number[]>();

      orgUsers.forEach((user) => {
        user.activity_points.forEach((point) => {
          const monthKey = format(parseISO(point.date), "MMM yyyy");
          if (!monthlyValues.has(monthKey)) {
            monthlyValues.set(monthKey, []);
          }
          monthlyValues.get(monthKey)?.push(point.landiq_usage);

          // Store date for sorting
          if (!statsMap.has(monthKey)) {
            statsMap.set(monthKey, {
              month: monthKey,
              date: point.date,
            });
          }
        });
      });

      // Calculate statistics for each month
      const statsArray = Array.from(statsMap.entries()).map(
        ([monthKey, data]) => {
          const values = monthlyValues.get(monthKey) || [];
          values.sort((a, b) => a - b);

          const min = values.length > 0 ? values[0] : 0;
          const max = values.length > 0 ? values[values.length - 1] : 0;
          const average =
            values.length > 0
              ? values.reduce((sum, val) => sum + val, 0) / values.length
              : 0;

          return {
            ...data,
            min: Math.round(min),
            average: Math.round(average),
            max: Math.round(max),
            userCount: values.length,
          };
        }
      );

      // Sort by date
      statsArray.sort((a, b) => a.date.localeCompare(b.date));

      return statsArray;
    } else {
      // Aggregate all filtered data
      const aggregated = new Map();

      filteredData.forEach((user) => {
        user.activity_points.forEach((point) => {
          const monthKey = format(parseISO(point.date), "MMM yyyy");
          if (!aggregated.has(monthKey)) {
            aggregated.set(monthKey, {
              month: monthKey,
              date: point.date,
              giraffe_usage: 0,
              landiq_usage: 0,
              total_usage: 0,
              user_count: 0,
            });
          }

          const existing = aggregated.get(monthKey);
          existing.giraffe_usage += point.giraffe_usage;
          existing.landiq_usage += point.landiq_usage;
          existing.total_usage += point.total_usage;
        });
      });

      // Return raw totals (no per-user averaging)
      return Array.from(aggregated.values())
        .map((point) => ({
          ...point,
          // Already totals across users – keep as-is
          giraffe_usage: point.giraffe_usage,
          landiq_usage: point.landiq_usage,
          total_usage: point.total_usage,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [viewMode, filteredData, cohortData, selectedCohorts, visibleUsers]);

  // Get trend indicators
  const trendStats = useMemo(() => {
    const increasing = filteredData.filter(
      (user) => user.overall_trend === "increasing"
    ).length;
    const decreasing = filteredData.filter(
      (user) => user.overall_trend === "decreasing"
    ).length;
    const stable = filteredData.filter(
      (user) => user.overall_trend === "stable"
    ).length;

    return { increasing, decreasing, stable, total: filteredData.length };
  }, [filteredData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "#10b981";
      case "decreasing":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const renderChart = () => {
    if (viewMode === "organisation") {
      const orgData = chartData as Array<{
        month: string;
        date: string;
        min: number;
        average: number;
        max: number;
        userCount: number;
      }>;

      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={orgData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "min"
                  ? "Minimum"
                  : name === "average"
                  ? "Average"
                  : name === "max"
                  ? "Maximum"
                  : name,
              ]}
              labelFormatter={(label) => `Month: ${label}`}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
                      <p className="font-semibold">{label}</p>
                      <p className="text-sm text-gray-600">
                        Users: {data.userCount}
                      </p>
                      <p className="text-sm">Min: {data.min}</p>
                      <p className="text-sm">Average: {data.average}</p>
                      <p className="text-sm">Max: {data.max}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />

            {/* Min line */}
            <Line
              type="monotone"
              dataKey="min"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Minimum"
              strokeDasharray="5 5"
            />

            {/* Average line */}
            <Line
              type="monotone"
              dataKey="average"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Average"
            />

            {/* Max line */}
            <Line
              type="monotone"
              dataKey="max"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Maximum"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (viewMode === "cohort") {
      const cohortChartData = chartData as Array<{
        cohort: string;
        data: Array<{
          month: string;
          date: string;
          giraffe_usage: number;
          landiq_usage: number;
          user_count: number;
        }>;
      }>;

      // Flatten data for chart display
      const flattenedData = new Map<string, any>();

      cohortChartData.forEach((cohort) => {
        cohort.data.forEach((point) => {
          const monthKey = point.month;
          if (!flattenedData.has(monthKey)) {
            flattenedData.set(monthKey, {
              month: monthKey,
              date: point.date,
            });
          }
          // Add cohort data as separate series
          flattenedData.get(monthKey)[`cohort_${cohort.cohort}`] =
            point.landiq_usage;
        });
      });

      const chartDataArray = Array.from(flattenedData.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartDataArray}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                value,
                name.startsWith("cohort_")
                  ? name.replace("cohort_", "Cohort: ")
                  : name,
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />

            {cohortChartData.map((cohort, index) => (
              <Line
                key={cohort.cohort}
                type="monotone"
                dataKey={`cohort_${cohort.cohort}`}
                stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={`Cohort: ${cohort.cohort}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      const aggregateData = chartData as Array<{
        month: string;
        giraffe_usage: number;
        landiq_usage: number;
        total_usage: number;
      }>;

      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={aggregateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "landiq_usage" ? "Land iQ Activity" : name,
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />

            {showLandIQ && (
              <Line
                type="monotone"
                dataKey="landiq_usage"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="Land iQ Activity"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Engagement Trajectory Analysis
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <Select
              value={viewMode}
              onValueChange={(value: any) => setViewMode(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggregate">Aggregate</SelectItem>
                <SelectItem value="organisation">Organisation</SelectItem>
                <SelectItem value="cohort">Cohort</SelectItem>
              </SelectContent>
            </Select>

            {/* Organisation Selector for Organisation View */}
            {viewMode === "organisation" && (
              <Select
                value={selectedOrg}
                onValueChange={(value) => setSelectedOrg(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organisations</SelectItem>
                  {uniqueOrganisations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Platform Visibility */}
            <div className="flex items-center gap-1">
              <Button
                variant={showLandIQ ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLandIQ(!showLandIQ)}
              >
                {showLandIQ ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Land iQ
              </Button>
            </div>
          </div>
        </div>

        {/* Trend Summary */}
        {showTrendArrows && (
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                Increasing: {trendStats.increasing}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                Decreasing: {trendStats.decreasing}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-gray-600" />
                Stable: {trendStats.stable}
              </Badge>
            </div>

            <Select
              value={highlightTrend}
              onValueChange={(value: any) => setHighlightTrend(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter trend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trends</SelectItem>
                <SelectItem value="increasing">Increasing</SelectItem>
                <SelectItem value="decreasing">Decreasing</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {renderChart()}

        {/* Cohort Analysis */}
        {showCohortAnalysis && viewMode === "cohort" && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Cohort Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cohortData.slice(0, 6).map((cohort) => (
                <Card key={cohort.cohort_month} className="p-3">
                  <div className="text-sm font-medium">
                    {cohort.cohort_month}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {cohort.user_count} users •{" "}
                    {Math.round(cohort.avg_engagement_score)}% avg engagement
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(cohort.retention_rate)}% retention rate
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
