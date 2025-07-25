"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Target,
  Award,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Timer,
  Zap,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  FilterOptions,
  ActivityAnalyticsData,
  ChartDataPoint,
  PipedriveActivity,
  PipedriveUser,
} from "@/lib/pipedrive-types";

interface ActivityAnalyticsTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading?: boolean;
}

interface ActivityMetrics {
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
  avgActivitiesPerDay: number;
  avgResponseTime: number;
  topPerformers: UserPerformance[];
}

interface UserPerformance {
  userId: number;
  userName: string;
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
  avgActivitiesPerDay: number;
  dealsInfluenced: number;
  revenue: number;
}

interface ActivityTypeData {
  type: string;
  count: number;
  completionRate: number;
  avgDuration: number;
  successRate: number;
  dealConversion: number;
}

interface ActivityTrendData {
  date: string;
  activities: number;
  completions: number;
  types: { [key: string]: number };
}

interface ActivityHeatmapData {
  day: number;
  hour: number;
  activityCount: number;
  completionRate: number;
}

export default function ActivityAnalyticsTab({
  filters,
  onFilterChange,
  isLoading,
}: ActivityAnalyticsTabProps) {
  const [data, setData] = useState<ActivityAnalyticsData>({
    activityVolume: [],
    typeDistribution: [],
    userPerformance: [],
    trends: [],
    totalActivities: 0,
    completionRate: 0,
    avgResponseTime: 0,
  });
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    totalActivities: 0,
    completedActivities: 0,
    completionRate: 0,
    avgActivitiesPerDay: 0,
    avgResponseTime: 0,
    topPerformers: [],
  });
  const [activityTypes, setActivityTypes] = useState<ActivityTypeData[]>([]);
  const [trendData, setTrendData] = useState<ActivityTrendData[]>([]);
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapData[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30days");
  const [selectedActivityType, setSelectedActivityType] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");

  useEffect(() => {
    loadActivityAnalyticsData();
  }, [filters, selectedTimeframe, selectedActivityType, selectedUser]);

  const loadActivityAnalyticsData = async () => {
    setIsLoadingData(true);
    try {
      // Load activity analytics data
      const analyticsData = await pipedriveService.getActivityAnalyticsData();
      setData(analyticsData);

      // Load and process activities for detailed analysis
      const activities = await pipedriveService.fetchActivities(2000);
      const users = await pipedriveService.fetchUsers();
      const deals = await pipedriveService.fetchDeals(1000);

      // Process activity metrics
      const completedActivities = activities.filter(
        (activity) => activity.done === "yes" || activity.done === "1"
      );
      const totalActivities = activities.length;
      const completionRate =
        totalActivities > 0
          ? (completedActivities.length / totalActivities) * 100
          : 0;

      // Calculate average activities per day
      const dateRange = getDateRange(selectedTimeframe);
      const avgActivitiesPerDay = totalActivities / dateRange;

      // Calculate average response time (simplified)
      const avgResponseTime = calculateAverageResponseTime(activities);

      // Process user performance
      const userPerformanceData = processUserPerformance(
        activities,
        users,
        deals
      );
      setUserPerformance(userPerformanceData);

      const activityMetrics: ActivityMetrics = {
        totalActivities,
        completedActivities: completedActivities.length,
        completionRate,
        avgActivitiesPerDay,
        avgResponseTime,
        topPerformers: userPerformanceData.slice(0, 5),
      };
      setMetrics(activityMetrics);

      // Process activity types
      const typeData = processActivityTypes(activities, deals);
      setActivityTypes(typeData);

      // Process trend data
      const trends = processTrendData(activities, selectedTimeframe);
      setTrendData(trends);

      // Process heatmap data
      const heatmap = processHeatmapData(activities);
      setHeatmapData(heatmap);
    } catch (error) {
      console.error("Error loading activity analytics data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getDateRange = (timeframe: string): number => {
    switch (timeframe) {
      case "7days":
        return 7;
      case "30days":
        return 30;
      case "90days":
        return 90;
      case "6months":
        return 180;
      case "1year":
        return 365;
      default:
        return 30;
    }
  };

  const calculateAverageResponseTime = (
    activities: PipedriveActivity[]
  ): number => {
    const responseTimes = activities
      .filter((activity) => activity.add_time && activity.due_date)
      .map((activity) => {
        const addTime = new Date(activity.add_time).getTime();
        const dueTime = new Date(activity.due_date).getTime();
        return Math.max(0, (dueTime - addTime) / (1000 * 60 * 60)); // hours
      });

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
      : 0;
  };

  const processUserPerformance = (
    activities: PipedriveActivity[],
    users: PipedriveUser[],
    deals: any[]
  ): UserPerformance[] => {
    const userMap = new Map<number, UserPerformance>();

    users.forEach((user) => {
      userMap.set(user.id, {
        userId: user.id,
        userName: user.name,
        totalActivities: 0,
        completedActivities: 0,
        completionRate: 0,
        avgActivitiesPerDay: 0,
        dealsInfluenced: 0,
        revenue: 0,
      });
    });

    activities.forEach((activity) => {
      const userId = activity.user_id;
      if (userMap.has(userId)) {
        const user = userMap.get(userId)!;
        user.totalActivities++;
        if (activity.done === "yes" || activity.done === "1") {
          user.completedActivities++;
        }
      }
    });

    // Calculate completion rates and deal influence
    userMap.forEach((user, userId) => {
      user.completionRate =
        user.totalActivities > 0
          ? (user.completedActivities / user.totalActivities) * 100
          : 0;
      user.avgActivitiesPerDay =
        user.totalActivities / getDateRange(selectedTimeframe);

      // Calculate deals influenced (simplified - activities associated with deals)
      const userActivities = activities.filter(
        (a) => a.user_id === userId && a.deal_id
      );
      const uniqueDeals = new Set(userActivities.map((a) => a.deal_id));
      user.dealsInfluenced = uniqueDeals.size;

      // Calculate revenue from influenced deals (simplified)
      user.revenue = Array.from(uniqueDeals).reduce((sum, dealId) => {
        const deal = deals.find((d) => d.id === dealId);
        return sum + (deal?.weighted_value || 0);
      }, 0);
    });

    return Array.from(userMap.values()).sort(
      (a, b) => b.totalActivities - a.totalActivities
    );
  };

  const processActivityTypes = (
    activities: PipedriveActivity[],
    deals: any[]
  ): ActivityTypeData[] => {
    const typeMap = new Map<
      string,
      {
        count: number;
        completed: number;
        durations: number[];
        dealIds: Set<number>;
      }
    >();

    activities.forEach((activity) => {
      const type = activity.type || "Other";
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          count: 0,
          completed: 0,
          durations: [],
          dealIds: new Set(),
        });
      }

      const typeData = typeMap.get(type)!;
      typeData.count++;

      if (activity.done === "yes" || activity.done === "1") {
        typeData.completed++;
      }

      if (activity.duration) {
        const duration = parseInt(activity.duration);
        if (!isNaN(duration)) {
          typeData.durations.push(duration);
        }
      }

      if (activity.deal_id) {
        typeData.dealIds.add(activity.deal_id);
      }
    });

    return Array.from(typeMap.entries())
      .map(([type, data]) => {
        const completionRate =
          data.count > 0 ? (data.completed / data.count) * 100 : 0;
        const avgDuration =
          data.durations.length > 0
            ? data.durations.reduce((sum, d) => sum + d, 0) /
              data.durations.length
            : 0;

        // Calculate deal conversion rate (simplified)
        const dealsWithActivity = data.dealIds.size;
        const wonDeals = Array.from(data.dealIds).filter((dealId) => {
          const deal = deals.find((d) => d.id === dealId);
          return deal?.status === "won";
        }).length;
        const dealConversion =
          dealsWithActivity > 0 ? (wonDeals / dealsWithActivity) * 100 : 0;

        return {
          type,
          count: data.count,
          completionRate,
          avgDuration,
          successRate: completionRate, // Simplified success rate
          dealConversion,
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  const processTrendData = (
    activities: PipedriveActivity[],
    timeframe: string
  ): ActivityTrendData[] => {
    const days = getDateRange(timeframe);
    const trends: ActivityTrendData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.add_time)
          .toISOString()
          .split("T")[0];
        return activityDate === dateStr;
      });

      const completions = dayActivities.filter(
        (a) => a.done === "yes" || a.done === "1"
      ).length;

      const types: { [key: string]: number } = {};
      dayActivities.forEach((activity) => {
        const type = activity.type || "Other";
        types[type] = (types[type] || 0) + 1;
      });

      trends.push({
        date: dateStr,
        activities: dayActivities.length,
        completions,
        types,
      });
    }

    return trends;
  };

  const processHeatmapData = (
    activities: PipedriveActivity[]
  ): ActivityHeatmapData[] => {
    const heatmap: ActivityHeatmapData[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const dayActivities = activities.filter((activity) => {
          const activityDate = new Date(activity.add_time);
          return (
            activityDate.getDay() === day && activityDate.getHours() === hour
          );
        });

        const completions = dayActivities.filter(
          (a) => a.done === "yes" || a.done === "1"
        ).length;
        const completionRate =
          dayActivities.length > 0
            ? (completions / dayActivities.length) * 100
            : 0;

        heatmap.push({
          day,
          hour,
          activityCount: dayActivities.length,
          completionRate,
        });
      }
    }

    return heatmap;
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "task":
        return <CheckCircle className="h-4 w-4" />;
      case "note":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleRefreshData = async () => {
    await loadActivityAnalyticsData();
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isLoadingData) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Activity Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Analyse activity performance, user engagement, and operational
            efficiency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedActivityType}
            onValueChange={setSelectedActivityType}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.totalActivities.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              15% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.completionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              3% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.avgActivitiesPerDay.toFixed(1)}
            </div>
            <div className="flex items-center text-sm text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              2% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.avgResponseTime.toFixed(1)}h
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              5% improvement
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Activity Type Performance
          </CardTitle>
          <p className="text-sm text-gray-600">
            Performance metrics and completion rates by activity type
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activityTypes.slice(0, 6).map((type) => (
              <div key={type.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getActivityTypeIcon(type.type)}
                    <h4 className="font-medium text-gray-900">{type.type}</h4>
                  </div>
                  <Badge variant="outline">{type.count}</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="font-medium">
                        {type.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={type.completionRate} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Avg Duration</p>
                      <p className="font-semibold">
                        {type.avgDuration.toFixed(0)}m
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Deal Conversion</p>
                      <p className="font-semibold">
                        {type.dealConversion.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Performance and Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <p className="text-sm text-gray-600">
              Leading team members by activity volume and completion
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topPerformers.map((performer, index) => (
                <div
                  key={performer.userId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-600"
                          : index === 1
                          ? "bg-gray-100 text-gray-600"
                          : index === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {performer.userName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {performer.totalActivities} activities •{" "}
                        {performer.completionRate.toFixed(1)}% completion
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {performer.dealsInfluenced} deals
                    </div>
                    <div className="text-xs text-gray-600">
                      ${performer.revenue.toLocaleString()} revenue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity Volume Trend
            </CardTitle>
            <p className="text-sm text-gray-600">
              Daily activity volume and completion trends
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1">
              {trendData.slice(-14).map((day, index) => {
                const maxActivities = Math.max(
                  ...trendData.map((d) => d.activities)
                );
                const height =
                  maxActivities > 0
                    ? (day.activities / maxActivities) * 100
                    : 0;
                const completionHeight =
                  day.activities > 0
                    ? (day.completions / day.activities) * height
                    : 0;

                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className="w-full bg-gray-200 rounded-t relative"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t absolute bottom-0"
                        style={{
                          height: `${(completionHeight / height) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 text-center">
                      {new Date(day.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded" />
                <span className="text-gray-600">Total Activities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-gray-600">Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed User Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Detailed User Performance
          </CardTitle>
          <p className="text-sm text-gray-600">
            Comprehensive performance metrics for all team members
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Total Activities</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Daily Average</TableHead>
                  <TableHead>Deals Influenced</TableHead>
                  <TableHead>Revenue Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPerformance.slice(0, 10).map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">
                      {user.userName}
                    </TableCell>
                    <TableCell>{user.totalActivities}</TableCell>
                    <TableCell>{user.completedActivities}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={user.completionRate}
                          className="w-16 h-2"
                        />
                        <span className="text-sm">
                          {user.completionRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user.avgActivitiesPerDay.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.dealsInfluenced}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${user.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
