"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { jiraService, SupportAnalyticsData } from "@/lib/jira-service";
import { pipedriveService } from "@/lib/pipedrive-service";

interface CombinedAnalyticsData {
  organisation: string;
  supportTickets: number;
  usageEvents: number;
  scaledUsageEvents?: number; // for chart display
  uniqueId?: string; // unique identifier for React keys
  sortedIndex?: number; // index after sorting
  userCount: number;
  supportHealth: "low" | "medium" | "high";
  resolutionRate: number;
  avgResolutionHours: number;
  topIssueTypes: string[];
  supportRatio: number; // tickets per user
  recentTickets: any[];
}

interface SupportAnalyticsChartProps {
  selectedEventFilter?: string;
}

export default function SupportAnalyticsChart({
  selectedEventFilter = "All Events",
}: SupportAnalyticsChartProps) {
  const [data, setData] = useState<CombinedAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("90");
  const [showChart, setShowChart] = useState(true);

  useEffect(() => {
    loadSupportAnalytics();
  }, [timeframe, selectedEventFilter]);

  const loadSupportAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🎫 Loading Jira support analytics...");

      // Fetch Pipedrive data first for organisation mapping
      console.log("📡 Fetching Pipedrive data for organisation mapping...");
      const [persons, organisations] = await Promise.all([
        pipedriveService.fetchPersons(),
        pipedriveService.fetchOrganisations(),
      ]);
      console.log(
        `👥 Pipedrive data: ${persons.length} persons, ${organisations.length} organisations`
      );

      // Fetch Jira support data with Pipedrive mapping
      const supportData = await jiraService.getSupportAnalytics(
        parseInt(timeframe),
        { persons, organisations }
      );
      console.log(`📊 Jira support data: ${supportData.length} organisations`);

      // Fetch Land iQ usage data with Pipedrive organisation mapping
      const usageData = await loadLandIQUsageData(parseInt(timeframe), {
        persons,
        organisations,
      });
      console.log(`📈 Land iQ usage data: ${usageData.size} organisations`);

      // Combine the data sources
      const combinedData = combineDataSources(supportData, usageData);

      // Sort the data and add scaled usage events for chart display
      const sortedData = combinedData
        .map((item, index) => ({
          ...item,
          // Ensure unique scaling and add small index offset to prevent collisions
          scaledUsageEvents:
            Math.max(
              0.1,
              Math.min(item.usageEvents / 10, item.supportTickets * 2)
            ) +
            index * 0.001, // Add tiny offset for uniqueness
          uniqueId: `org-${index}-${item.organisation.replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}`,
        }))
        .sort((a, b) => {
          // Always sort by support tickets (highest first)
          return b.supportTickets - a.supportTickets;
        })
        .map((item, sortedIndex) => ({
          ...item,
          // Re-assign index after sorting to maintain uniqueness
          sortedIndex,
        }));

      setData(sortedData);
      console.log(`✅ Combined data: ${sortedData.length} organisations`);

      // Debug: Log sample data to see what's being passed to the chart
      console.log("📊 Sample chart data:", {
        firstFew: sortedData.slice(0, 5).map((org) => ({
          name: org.organisation,
          supportTickets: org.supportTickets,
          usageEvents: org.usageEvents,
          scaledUsageEvents: org.scaledUsageEvents,
          supportRatio: org.supportRatio,
        })),
        totalOrgs: sortedData.length,
        hasNonZeroSupport: sortedData.filter((org) => org.supportTickets > 0)
          .length,
        hasNonZeroUsage: sortedData.filter((org) => org.usageEvents > 0).length,
        maxSupportTickets: Math.max(
          ...sortedData.map((org) => org.supportTickets)
        ),
        maxUsageEvents: Math.max(...sortedData.map((org) => org.usageEvents)),
        dataRange: {
          minSupport: Math.min(...sortedData.map((org) => org.supportTickets)),
          maxSupport: Math.max(...sortedData.map((org) => org.supportTickets)),
          minUsage: Math.min(...sortedData.map((org) => org.usageEvents)),
          maxUsage: Math.max(...sortedData.map((org) => org.usageEvents)),
        },
      });
    } catch (error) {
      console.error("❌ Error loading support analytics:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load support analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLandIQUsageData = async (
    days: number,
    pipedriveData?: { persons: any[]; organisations: any[] }
  ): Promise<Map<string, { events: number; users: Set<string> }>> => {
    try {
      const response = await fetch("/landiQSDKeventsDate.csv");
      const csvText = await response.text();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Create email-to-organisation mapping from Pipedrive data
      const emailToOrgMap = new Map<string, string>();

      if (pipedriveData) {
        // Build email to organisation mapping directly from persons data
        pipedriveData.persons.forEach((person: any) => {
          // Get email from primary_email field (this is the main email as a string)
          const emailValue = person.primary_email;

          // Get organisation name directly from org_name field
          const orgName = person.org_name;

          if (
            emailValue &&
            orgName &&
            typeof emailValue === "string" &&
            typeof orgName === "string"
          ) {
            emailToOrgMap.set(emailValue.toLowerCase(), orgName);
          }
        });

        console.log(
          `📧 Land iQ: Created email-to-org mapping: ${emailToOrgMap.size} entries`
        );
      }

      const orgMap = new Map<string, { events: number; users: Set<string> }>();
      const lines = csvText.split("\n");

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [, timestamp, , email] = line.split(",");
        if (!timestamp || !email) continue;

        // Parse date (assuming DD/MM/YYYY format)
        const [day, month, year] = timestamp.split("/");
        const eventDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );

        if (eventDate >= cutoffDate) {
          // Get organisation name from Pipedrive mapping
          let orgName = "Unknown Organisation";

          if (pipedriveData) {
            const mappedOrg = emailToOrgMap.get(email.toLowerCase());
            if (mappedOrg) {
              orgName = mappedOrg;
            }
          }

          // Fallback to domain extraction if no Pipedrive mapping
          if (orgName === "Unknown Organisation") {
            const domain = email.split("@")[1];
            if (domain) {
              orgName = domain
                .replace(/\.(com|org|net|gov|edu)$/, "")
                .replace(/\./g, " ");
              orgName = orgName.charAt(0).toUpperCase() + orgName.slice(1);
            }
          }

          if (!orgMap.has(orgName)) {
            orgMap.set(orgName, { events: 0, users: new Set() });
          }

          const orgData = orgMap.get(orgName)!;
          orgData.events++;
          orgData.users.add(email.toLowerCase());
        }
      }

      return orgMap;
    } catch (error) {
      console.error("Error loading Land iQ usage data:", error);
      return new Map();
    }
  };

  const combineDataSources = (
    supportData: SupportAnalyticsData[],
    usageData: Map<string, { events: number; users: Set<string> }>
  ): CombinedAnalyticsData[] => {
    const combinedMap = new Map<string, CombinedAnalyticsData>();

    // Add support data
    supportData.forEach((support) => {
      // Bundle all unmapped organisations as 'Unknown'
      const orgKey =
        support.organisation === "Unknown Organisation"
          ? "Unknown"
          : support.organisation;

      if (combinedMap.has(orgKey)) {
        // Merge with existing Unknown data
        const existing = combinedMap.get(orgKey)!;
        existing.supportTickets += support.totalTickets;
        existing.userCount += support.userEmails.length;
        existing.recentTickets.push(...support.recentTickets);
        // Recalculate support ratio
        existing.supportRatio =
          existing.userCount > 0
            ? existing.supportTickets / existing.userCount
            : existing.supportTickets;
      } else {
        combinedMap.set(orgKey, {
          organisation: orgKey,
          supportTickets: support.totalTickets,
          usageEvents: 0,
          userCount: support.userEmails.length,
          supportHealth: support.supportHealth,
          resolutionRate: support.resolutionRate,
          avgResolutionHours: support.avgResolutionTimeHours,
          topIssueTypes: support.topIssueTypes,
          supportRatio:
            support.userEmails.length > 0
              ? support.totalTickets / support.userEmails.length
              : support.totalTickets,
          recentTickets: support.recentTickets,
        });
      }
    });

    // Add usage data
    usageData.forEach((usage, orgName) => {
      // Bundle all unmapped organisations as 'Unknown'
      const orgKey = orgName === "Unknown Organisation" ? "Unknown" : orgName;

      if (combinedMap.has(orgKey)) {
        const existing = combinedMap.get(orgKey)!;
        existing.usageEvents += usage.events;
        existing.userCount = Math.max(existing.userCount, usage.users.size);
      } else {
        // Organisation has usage but no support tickets
        combinedMap.set(orgKey, {
          organisation: orgKey,
          supportTickets: 0,
          usageEvents: usage.events,
          userCount: usage.users.size,
          supportHealth: "low",
          resolutionRate: 0,
          avgResolutionHours: 0,
          topIssueTypes: [],
          supportRatio: 0,
          recentTickets: [],
        });
      }
    });

    return Array.from(combinedMap.values()).filter(
      (item) => item.supportTickets > 0 || item.usageEvents > 0
    );
  };

  const getSupportHealthColor = (health: "low" | "medium" | "high") => {
    switch (health) {
      case "low":
        return "#10B981"; // Green
      case "medium":
        return "#F59E0B"; // Orange
      case "high":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.organisation}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>
              Support Tickets:{" "}
              <span className="font-medium">{data.supportTickets || 0}</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
              Usage Events:{" "}
              <span className="font-medium">{data.usageEvents || 0}</span>
            </p>
            <p className="text-sm">
              Users: <span className="font-medium">{data.userCount || 0}</span>
            </p>
            <p className="text-sm">
              Support Ratio:{" "}
              <span className="font-medium">
                {(data.supportRatio || 0).toFixed(1)} tickets/user
              </span>
            </p>
            {(data.resolutionRate || 0) > 0 && (
              <p className="text-sm">
                Resolution Rate:{" "}
                <span className="font-medium">
                  {(data.resolutionRate || 0).toFixed(1)}%
                </span>
              </p>
            )}
            <p className="text-sm text-gray-500">
              Health:{" "}
              <span
                className={`font-medium ${
                  data.supportHealth === "high"
                    ? "text-red-600"
                    : data.supportHealth === "medium"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {data.supportHealth || "unknown"}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Support Load vs Product Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Support Analytics Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadSupportAnalytics} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Support Load vs Product Usage
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm max-w-xs">
                    Compares support ticket volume with product usage by
                    organisation. High support + low usage may indicate at-risk
                    customers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30d</SelectItem>
                <SelectItem value="60">60d</SelectItem>
                <SelectItem value="90">90d</SelectItem>
                <SelectItem value="180">180d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span>🟡 Support Tickets</span>
          <span>🔵 Usage Events</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            Low Risk
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-orange-600" />
            Medium Risk
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            High Risk
          </span>
        </div>
      </CardHeader>

      {showChart && (
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No support analytics data found for the selected timeframe.</p>
              <p className="text-sm mt-1">
                Try adjusting the time range or check your Jira connection.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">
                    Total Tickets
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {data.reduce((sum, org) => sum + org.supportTickets, 0)}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">
                    Total Usage
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {data
                      .reduce((sum, org) => sum + org.usageEvents, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">
                    Organisations
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {data.length}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">
                    High Risk
                  </div>
                  <div className="text-xl font-bold text-red-900">
                    {data.filter((org) => org.supportHealth === "high").length}
                  </div>
                </div>
              </div>

              {/* Chart section removed as requested */}

              {/* Detailed Table */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Organisation Details</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead>Organisation</TableHead>
                          <TableHead className="text-center">
                            Support Health
                          </TableHead>
                          <TableHead className="text-center">Tickets</TableHead>
                          <TableHead className="text-center">
                            Usage Events
                          </TableHead>
                          <TableHead className="text-center">Users</TableHead>
                          <TableHead className="text-center">
                            Support Ratio
                          </TableHead>
                          <TableHead className="text-center">
                            Resolution Rate
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((org, idx) => (
                          <TableRow
                            key={
                              org.uniqueId ||
                              `table-row-${idx}-${org.organisation.replace(
                                /[^a-zA-Z0-9]/g,
                                ""
                              )}`
                            }
                          >
                            <TableCell className="font-medium">
                              {org.organisation.length > 30
                                ? `${org.organisation.substring(0, 30)}...`
                                : org.organisation}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: getSupportHealthColor(
                                    org.supportHealth
                                  ),
                                  color: getSupportHealthColor(
                                    org.supportHealth
                                  ),
                                }}
                              >
                                {org.supportHealth.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {org.supportTickets}
                            </TableCell>
                            <TableCell className="text-center">
                              {org.usageEvents.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              {org.userCount}
                            </TableCell>
                            <TableCell className="text-center">
                              {org.supportRatio.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center">
                              {org.resolutionRate > 0
                                ? `${org.resolutionRate.toFixed(1)}%`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
