"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  Circle,
  Eye,
  Edit3,
  MessageCircle,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "online" | "away" | "busy";
  lastSeen: string;
  currentActivity?: {
    type: "viewing" | "editing" | "commenting";
    entity: string;
    entityName: string;
    timestamp: string;
  };
}

interface CollaborationIndicatorsProps {
  className?: string;
  showActivityDetails?: boolean;
  maxVisible?: number;
  people?: any[]; // Real people data from Supabase
}

export default function CollaborationIndicators({
  className,
  showActivityDetails = true,
  maxVisible = 5,
  people = [],
}: CollaborationIndicatorsProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showAll, setShowAll] = useState(false);
  const { userEmail } = useAuth();

  // Convert real people data to simple user list (no status indicators)
  const convertPeopleToUsers = (peopleData: any[]): OnlineUser[] => {
    return peopleData.slice(0, 8).map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      avatar: "/placeholder-user.jpg",
      status: "online" as const, // Not displayed, just for type compatibility
      lastSeen: new Date().toISOString(),
      // No status indicators shown
    }));
  };

  useEffect(() => {
    // Use real people data if available
    if (people.length > 0) {
      setOnlineUsers(convertPeopleToUsers(people));
    }

    // Update user statuses every 30 seconds
    const interval = setInterval(() => {
      setOnlineUsers((prev) =>
        prev.map((user) => ({
          ...user,
          lastSeen:
            user.status === "online" ? new Date().toISOString() : user.lastSeen,
        }))
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [people]);

  const getStatusColor = (status: OnlineUser["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getActivityIcon = (type: OnlineUser["currentActivity"]["type"]) => {
    switch (type) {
      case "viewing":
        return <Eye className="h-3 w-3" />;
      case "editing":
        return <Edit3 className="h-3 w-3" />;
      case "commenting":
        return <MessageCircle className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getActivityColor = (type: OnlineUser["currentActivity"]["type"]) => {
    switch (type) {
      case "viewing":
        return "text-blue-600 bg-blue-100";
      case "editing":
        return "text-green-600 bg-green-100";
      case "commenting":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
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

  const visibleUsers = showAll ? onlineUsers : onlineUsers.slice(0, maxVisible);
  const hiddenCount = onlineUsers.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600 font-medium">
            {onlineUsers.length} registered users
          </span>
        </div>

        <div className="flex items-center -space-x-1">
          {visibleUsers.map((user, index) => (
            <Popover key={user.id}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      "h-8 w-8 border-2 border-white cursor-pointer transition-transform hover:scale-110 hover:z-10",
                      index > 0 && "relative"
                    )}
                  >
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* No status indicator shown */}
                </div>
              </PopoverTrigger>
              <PopoverContent side="bottom" className="w-92 p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        Registered User
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Team member in Land iQ - Project Management
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ))}

          {hiddenCount > 0 && !showAll && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-xs"
                  onClick={() => setShowAll(true)}
                >
                  +{hiddenCount}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show {hiddenCount} more</p>
              </TooltipContent>
            </Tooltip>
          )}

          {showAll && hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowAll(false)}
                >
                  Show less
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Collapse user list</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
