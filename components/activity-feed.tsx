"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Activity,
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  GitBranch,
  MessageCircle,
  Clock,
  RefreshCw,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchRecentActivities,
  type ActivityLog,
} from "@/lib/activity-tracker";

interface ActivityItem {
  id: string;
  type: "create" | "update" | "delete" | "assign" | "comment" | "workflow";
  action: string;
  entity: string;
  entityName: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    assignedTo?: string;
    commentText?: string;
  };
}

interface ActivityFeedProps {
  className?: string;
  showHeader?: boolean;
  maxItems?: number;
  people?: any[];
  groups?: any[];
  tasks?: any[];
  categories?: any[];
}

export default function ActivityFeed({
  className,
  showHeader = true,
  maxItems = 50,
  people = [],
  groups = [],
  tasks = [],
  categories = [],
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { userEmail } = useAuth();

  // Convert activity logs to ActivityItem format
  const convertActivityLogsToItems = (logs: ActivityLog[]): ActivityItem[] => {
    return logs.map((log) => ({
      id: log.id,
      type:
        log.action === "created"
          ? "create"
          : log.action === "updated"
          ? "update"
          : log.action === "deleted"
          ? "delete"
          : "create",
      action: log.action,
      entity: log.entity_type,
      entityName: log.entity_name,
      user: {
        name: log.user_name,
        email: log.user_email,
        avatar: "/placeholder-user.jpg",
      },
      timestamp: log.created_at,
      metadata: log.metadata,
    }));
  };

  // Show real data summary as fallback when no activities exist
  const generateFallbackSummary = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    if (groups.length > 0) {
      activities.push({
        id: "data-groups",
        type: "create",
        action: "system has",
        entity: "groups",
        entityName: `${groups.length} active responsibility groups`,
        user: {
          name: "System",
          email: "system@landiq.com",
          avatar: "/placeholder-user.jpg",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (tasks.length > 0) {
      activities.push({
        id: "data-tasks",
        type: "create",
        action: "system has",
        entity: "tasks",
        entityName: `${tasks.length} total tasks`,
        user: {
          name: "System",
          email: "system@landiq.com",
          avatar: "/placeholder-user.jpg",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (people.length > 0) {
      activities.push({
        id: "data-people",
        type: "create",
        action: "system has",
        entity: "people",
        entityName: `${people.length} registered users`,
        user: {
          name: "System",
          email: "system@landiq.com",
          avatar: "/placeholder-user.jpg",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (categories.length > 0) {
      activities.push({
        id: "data-categories",
        type: "create",
        action: "system has",
        entity: "categories",
        entityName: `${categories.length} categories configured`,
        user: {
          name: "System",
          email: "system@landiq.com",
          avatar: "/placeholder-user.jpg",
        },
        timestamp: new Date().toISOString(),
      });
    }

    return activities;
  };

  useEffect(() => {
    // Load real activity logs from database
    const loadActivities = async () => {
      setLoading(true);
      try {
        const activityLogs = await fetchRecentActivities(maxItems);

        if (activityLogs.length > 0) {
          // Use real activity logs
          const realActivities = convertActivityLogsToItems(activityLogs);
          setActivities(realActivities);
        } else {
          // Fallback to data summary if no activities exist yet
          const fallbackSummary = generateFallbackSummary();
          setActivities(fallbackSummary);
        }
      } catch (error) {
        console.error("Error loading activities:", error);
        // Show fallback summary on error
        const fallbackSummary = generateFallbackSummary();
        setActivities(fallbackSummary);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [maxItems, people, groups, tasks, categories]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const activityLogs = await fetchRecentActivities(maxItems);

      if (activityLogs.length > 0) {
        // Use real activity logs
        const realActivities = convertActivityLogsToItems(activityLogs);
        setActivities(realActivities);
      } else {
        // Fallback to data summary if no activities exist yet
        const fallbackSummary = generateFallbackSummary();
        setActivities(fallbackSummary);
      }
    } catch (error) {
      console.error("Error refreshing activities:", error);
      // Show fallback summary on error
      const fallbackSummary = generateFallbackSummary();
      setActivities(fallbackSummary);
    } finally {
      setRefreshing(false);
    }
  };

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "create":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "update":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "assign":
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-orange-600" />;
      case "workflow":
        return <GitBranch className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "assign":
        return "bg-purple-100 text-purple-800";
      case "comment":
        return "bg-orange-100 text-orange-800";
      case "workflow":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return time.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((activity) => activity.type === filter);

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {filter === "all" ? "All" : filter}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter("all")}>
                    All Activities
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("create")}>
                    Created Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("update")}>
                    Updates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("assign")}>
                    Assignments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("comment")}>
                    Comments
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={cn("h-4 w-4", refreshing && "animate-spin")}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-0" : ""}>
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No activities found</p>
            <p className="text-sm text-gray-400">
              {filter === "all"
                ? "Activity will appear here as users interact with the system"
                : `No ${filter} activities found`}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(activity.user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.type)}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          getActivityColor(activity.type)
                        )}
                      >
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      <span className="text-gray-600">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.entity}</span>{" "}
                      <span className="font-semibold">
                        "{activity.entityName}"
                      </span>
                    </p>

                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-600">
                        {activity.metadata.assignedTo && (
                          <p>
                            Assigned to:{" "}
                            <span className="font-medium">
                              {activity.metadata.assignedTo}
                            </span>
                          </p>
                        )}
                        {activity.metadata.oldValue &&
                          activity.metadata.newValue && (
                            <p>
                              Changed from "{activity.metadata.oldValue}" to "
                              {activity.metadata.newValue}"
                            </p>
                          )}
                        {activity.metadata.commentText && (
                          <p className="italic">
                            "{activity.metadata.commentText}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
