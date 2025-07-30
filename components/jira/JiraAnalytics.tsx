"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { jiraService, JiraIssue } from "@/lib/jira-service";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Area,
} from "recharts";
import {
  Users,
  Mail,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Building,
  Calendar,
  Activity,
  Target,
  Smile,
  Frown,
  Meh,
  DollarSign,
  BarChart3,
  TrendingDown,
  UserCheck,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  format,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";

interface LandIQEvent {
  userName: string;
  userEmail: string;
  eventName: string;
  timestamp: Date;
  properties?: any;
}

interface UnifiedUserProfile {
  email: string;
  name: string;
  organisation?: string;
  jobTitle?: string;
  // Jira data
  firstContactDate?: Date;
  lastContactDate?: Date;
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime?: number;
  satisfaction?: number;
  requestTypes: string[];
  // Pipedrive data
  pipedriveContact?: any;
  pipedriveDeals?: any[];
  pipedriveStage?: string;
  totalDealValue?: number;
  licenseCount?: number;
  isPaying?: boolean;
  // Land iQ usage data
  firstSeenDate?: Date;
  lastActiveDate?: Date;
  totalEvents?: number;
  uniqueFeatures?: Set<string>;
  avgEventsPerDay?: number;
  daysActive?: number;
  // Derived metrics
  supportToSalesConversion?: boolean;
  churnRisk?: "low" | "medium" | "high";
  engagementScore?: number;
  lifetimeValue?: number;
}

interface CrossPlatformAnalytics {
  unifiedProfiles: Map<string, UnifiedUserProfile>;
  jiraIssues: JiraIssue[];
  pipedriveData: {
    persons: any[];
    organizations: any[];
    deals: any[];
  };
  landIQEvents: LandIQEvent[];
  organisationStats: Map<
    string,
    {
      name: string;
      totalTickets: number;
      uniqueUsers: number;
      totalDealValue: number;
      avgEngagement: number;
      topFeatures: string[];
    }
  >;
  timelineData: {
    date: string;
    newTickets: number;
    resolvedTickets: number;
    activeUsers: number;
    newDeals: number;
    landIQEvents: number;
  }[];
  insights: {
    totalUsers: number;
    payingUsers: number;
    conversionRate: number;
    avgTicketsPerUser: number;
    avgRevenuePerUser: number;
    churnRiskUsers: number;
    topSupportOrgs: string[];
    featureUsageData?: Array<{
      feature: string;
      paying: number;
      nonPaying: number;
    }>;
  };
}

export default function JiraAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] =
    useState<CrossPlatformAnalytics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [error, setError] = useState<string | null>(null);
  const [dataLoadProgress, setDataLoadProgress] = useState({
    jira: false,
    pipedrive: false,
    landiq: false,
  });

  useEffect(() => {
    fetchAndProcessData();
  }, [selectedTimeRange]);

  // Parse Land iQ CSV data
  const parseLandIQEvents = async (): Promise<LandIQEvent[]> => {
    try {
      const response = await fetch("/landiQSDKeventsDate.csv");
      const csvText = await response.text();

      const lines = csvText.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      const events: LandIQEvent[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const event: any = {};

        headers.forEach((header, index) => {
          event[header] = values[index]?.trim();
        });

        // Map CSV fields to our interface
        if (event.userEmail && event.eventName) {
          events.push({
            userName: event.userName || "Unknown",
            userEmail: event.userEmail.toLowerCase(),
            eventName: event.eventName,
            timestamp: new Date(event.timestamp || event.createdAt),
            properties: event,
          });
        }
      }

      return events;
    } catch (error) {
      console.error("Error parsing Land iQ events:", error);
      return [];
    }
  };

  const fetchAndProcessData = async () => {
    setLoading(true);
    setError(null);
    setDataLoadProgress({ jira: false, pipedrive: false, landiq: false });

    try {
      // Parallel data fetching
      const [jiraData, pipedriveData, landIQData] = await Promise.all([
        // Fetch Jira issues
        (async () => {
          const jql = `project = LL1HD AND created >= -${selectedTimeRange} ORDER BY created DESC`;
          const response = await jiraService.searchIssues(jql, {
            maxResults: 200,
            fields: ["*all"],
          });
          setDataLoadProgress((prev) => ({ ...prev, jira: true }));
          return response;
        })(),

        // Simulate Pipedrive data for now
        (async () => {
          try {
            // For now, return empty data since Pipedrive service doesn't have these methods
            setDataLoadProgress((prev) => ({ ...prev, pipedrive: true }));
            return {
              persons: [],
              organizations: [],
              deals: [],
            };
          } catch (error) {
            console.error("Pipedrive fetch error:", error);
            return { persons: [], organizations: [], deals: [] };
          }
        })(),

        // Fetch Land iQ events
        (async () => {
          const events = await parseLandIQEvents();
          setDataLoadProgress((prev) => ({ ...prev, landiq: true }));
          return events;
        })(),
      ]);

      if (!jiraData.success || !jiraData.data.issues) {
        throw new Error("Failed to fetch Jira data");
      }

      const issues = jiraData.data.issues;

      // Create unified user profiles
      const unifiedProfiles = new Map<string, UnifiedUserProfile>();
      const organisationStats = new Map<string, any>();

      // Process Jira data
      issues.forEach((issue) => {
        const reporterEmail =
          issue.fields.reporter?.emailAddress?.toLowerCase();
        if (reporterEmail) {
          if (!unifiedProfiles.has(reporterEmail)) {
            unifiedProfiles.set(reporterEmail, {
              email: reporterEmail,
              name: issue.fields.reporter.displayName,
              organisation: issue.fields.customfield_10063 || "Unknown",
              jobTitle: issue.fields.customfield_10061,
              totalTickets: 0,
              resolvedTickets: 0,
              requestTypes: [],
              firstContactDate: new Date(issue.fields.created),
              lastContactDate: new Date(issue.fields.created),
            });
          }

          const profile = unifiedProfiles.get(reporterEmail)!;
          profile.totalTickets++;

          if (issue.fields.resolution) {
            profile.resolvedTickets++;
          }

          // Update dates
          const issueDate = new Date(issue.fields.created);
          if (
            !profile.firstContactDate ||
            issueDate < profile.firstContactDate
          ) {
            profile.firstContactDate = issueDate;
          }
          if (!profile.lastContactDate || issueDate > profile.lastContactDate) {
            profile.lastContactDate = issueDate;
          }

          // Add request type
          const requestType = issue.fields.customfield_10010?.requestType?.name;
          if (requestType && !profile.requestTypes.includes(requestType)) {
            profile.requestTypes.push(requestType);
          }

          // Add satisfaction
          if (issue.fields.customfield_10033?.rating) {
            profile.satisfaction = issue.fields.customfield_10033.rating;
          }
        }

        // Organisation stats will be updated after all data is processed
      });

      // Process Pipedrive data
      if (pipedriveData.persons.length > 0) {
        // Create email to person lookup
        const emailToPerson = new Map<string, any>();
        pipedriveData.persons.forEach((person) => {
          if (person.email && person.email.length > 0) {
            const primaryEmail = person.email[0].value.toLowerCase();
            emailToPerson.set(primaryEmail, person);

            // Update or create profile
            if (!unifiedProfiles.has(primaryEmail)) {
              unifiedProfiles.set(primaryEmail, {
                email: primaryEmail,
                name: person.name,
                organisation: person.org_name,
                totalTickets: 0,
                resolvedTickets: 0,
                requestTypes: [],
              });
            }

            const profile = unifiedProfiles.get(primaryEmail)!;
            profile.pipedriveContact = person;
            profile.organisation = person.org_name || profile.organisation;
          }
        });

        // Process deals
        pipedriveData.deals.forEach((deal) => {
          if (deal.person_id && deal.person_id.email) {
            const email = deal.person_id.email[0].value.toLowerCase();
            const profile = unifiedProfiles.get(email);

            if (profile) {
              if (!profile.pipedriveDeals) {
                profile.pipedriveDeals = [];
              }
              profile.pipedriveDeals.push(deal);

              // Update deal metrics
              profile.totalDealValue =
                (profile.totalDealValue || 0) + (deal.value || 0);
              profile.pipedriveStage =
                deal.stage_id?.name || profile.pipedriveStage;
              profile.isPaying = deal.status === "won" || profile.isPaying;

              // Extract license count from custom fields
              if (deal.a950076a1d0d2f2fe9ed27f42a8c13bf7c5dedc4) {
                profile.licenseCount =
                  parseInt(deal.a950076a1d0d2f2fe9ed27f42a8c13bf7c5dedc4) || 0;
              }
            }
          }
        });
      }

      // Process Land iQ events
      if (landIQData.length > 0) {
        const emailToEvents = new Map<string, LandIQEvent[]>();

        landIQData.forEach((event) => {
          const email = event.userEmail.toLowerCase();
          if (!emailToEvents.has(email)) {
            emailToEvents.set(email, []);
          }
          emailToEvents.get(email)!.push(event);
        });

        // Update profiles with usage data
        emailToEvents.forEach((events, email) => {
          if (!unifiedProfiles.has(email)) {
            unifiedProfiles.set(email, {
              email: email,
              name: events[0].userName || "Unknown",
              totalTickets: 0,
              resolvedTickets: 0,
              requestTypes: [],
            });
          }

          const profile = unifiedProfiles.get(email)!;
          profile.totalEvents = events.length;
          profile.uniqueFeatures = new Set(events.map((e) => e.eventName));

          // Calculate date ranges
          const eventDates = events
            .map((e) => e.timestamp)
            .sort((a, b) => a.getTime() - b.getTime());
          profile.firstSeenDate = eventDates[0];
          profile.lastActiveDate = eventDates[eventDates.length - 1];

          // Calculate engagement metrics
          if (profile.firstSeenDate && profile.lastActiveDate) {
            const daysDiff =
              differenceInDays(profile.lastActiveDate, profile.firstSeenDate) +
              1;
            profile.daysActive = daysDiff;
            profile.avgEventsPerDay = profile.totalEvents / daysDiff;
          }
        });
      }

      // Calculate derived metrics and churn risk
      unifiedProfiles.forEach((profile) => {
        // Engagement score (0-100)
        let score = 0;
        if (profile.totalEvents)
          score += Math.min(30, profile.totalEvents / 10);
        if (profile.uniqueFeatures)
          score += Math.min(20, profile.uniqueFeatures.size * 2);
        if (profile.avgEventsPerDay)
          score += Math.min(20, profile.avgEventsPerDay * 5);
        if (profile.isPaying) score += 20;
        if (profile.satisfaction && profile.satisfaction >= 4) score += 10;
        profile.engagementScore = Math.round(score);

        // Churn risk
        const daysSinceLastActive = profile.lastActiveDate
          ? differenceInDays(new Date(), profile.lastActiveDate)
          : 999;

        if (profile.isPaying && daysSinceLastActive > 30) {
          profile.churnRisk = "high";
        } else if (
          daysSinceLastActive > 14 ||
          (profile.satisfaction && profile.satisfaction < 3)
        ) {
          profile.churnRisk = "medium";
        } else {
          profile.churnRisk = "low";
        }

        // Support to sales conversion
        profile.supportToSalesConversion = !!(
          profile.totalTickets > 0 && profile.isPaying
        );

        // Lifetime value
        profile.lifetimeValue = profile.totalDealValue || 0;
      });

      // Update organisation stats with all data
      unifiedProfiles.forEach((profile) => {
        const org = profile.organisation || "Unknown";
        if (!organisationStats.has(org)) {
          organisationStats.set(org, {
            name: org,
            totalTickets: 0,
            uniqueUsers: 0,
            totalDealValue: 0,
            avgEngagement: 0,
            topFeatures: [],
            users: [],
          });
        }

        const orgStat = organisationStats.get(org)!;
        orgStat.users.push(profile);
      });

      // Calculate org metrics
      organisationStats.forEach((orgStat) => {
        orgStat.uniqueUsers = orgStat.users.length;
        orgStat.totalTickets = orgStat.users.reduce(
          (sum: number, u: UnifiedUserProfile) => sum + u.totalTickets,
          0
        );
        orgStat.totalDealValue = orgStat.users.reduce(
          (sum: number, u: UnifiedUserProfile) => sum + (u.totalDealValue || 0),
          0
        );
        orgStat.avgEngagement =
          orgStat.users.reduce(
            (sum: number, u: UnifiedUserProfile) =>
              sum + (u.engagementScore || 0),
            0
          ) / orgStat.users.length;

        // Get top features
        const featureCounts = new Map<string, number>();
        orgStat.users.forEach((u: UnifiedUserProfile) => {
          if (u.uniqueFeatures) {
            u.uniqueFeatures.forEach((f) => {
              featureCounts.set(f, (featureCounts.get(f) || 0) + 1);
            });
          }
        });
        orgStat.topFeatures = Array.from(featureCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([feature]) => feature);

        delete orgStat.users; // Clean up temporary data
      });

      // Enhanced timeline data with all platforms
      const timelineMap = new Map<string, any>();
      const startDate = subDays(new Date(), parseInt(selectedTimeRange));

      // Initialize timeline for each day
      for (
        let d = new Date(startDate);
        d <= new Date();
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = format(d, "yyyy-MM-dd");
        timelineMap.set(dateStr, {
          date: dateStr,
          newTickets: 0,
          resolvedTickets: 0,
          activeUsers: new Set(),
          newDeals: 0,
          landIQEvents: 0,
        });
      }

      // Add Jira data
      issues.forEach((issue) => {
        const date = format(parseISO(issue.fields.created), "yyyy-MM-dd");
        if (timelineMap.has(date)) {
          const dayData = timelineMap.get(date)!;
          dayData.newTickets++;
          if (issue.fields.reporter?.emailAddress) {
            dayData.activeUsers.add(
              issue.fields.reporter.emailAddress.toLowerCase()
            );
          }
        }

        if (issue.fields.resolutiondate) {
          const resolvedDate = format(
            parseISO(issue.fields.resolutiondate),
            "yyyy-MM-dd"
          );
          if (timelineMap.has(resolvedDate)) {
            timelineMap.get(resolvedDate)!.resolvedTickets++;
          }
        }
      });

      // Add Pipedrive deals
      pipedriveData.deals.forEach((deal) => {
        if (deal.add_time) {
          const date = format(parseISO(deal.add_time), "yyyy-MM-dd");
          if (timelineMap.has(date)) {
            timelineMap.get(date)!.newDeals++;
          }
        }
      });

      // Add Land iQ events
      landIQData.forEach((event) => {
        const date = format(event.timestamp, "yyyy-MM-dd");
        if (timelineMap.has(date)) {
          const dayData = timelineMap.get(date)!;
          dayData.landIQEvents++;
          dayData.activeUsers.add(event.userEmail);
        }
      });

      // Convert timeline data
      const timelineData = Array.from(timelineMap.values())
        .map((day) => ({
          ...day,
          activeUsers: day.activeUsers.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate feature usage by paying status
      const featureUsageByStatus = new Map<
        string,
        { paying: number; nonPaying: number }
      >();

      // Initialise common features
      const commonFeatures = new Set<string>();
      unifiedProfiles.forEach((profile) => {
        if (profile.uniqueFeatures) {
          profile.uniqueFeatures.forEach((feature) =>
            commonFeatures.add(feature)
          );
        }
      });

      // Count usage by paying status
      commonFeatures.forEach((feature) => {
        featureUsageByStatus.set(feature, { paying: 0, nonPaying: 0 });
      });

      const payingUserCount = Array.from(unifiedProfiles.values()).filter(
        (p) => p.isPaying
      ).length;
      const nonPayingUserCount = unifiedProfiles.size - payingUserCount;

      unifiedProfiles.forEach((profile) => {
        if (profile.uniqueFeatures) {
          profile.uniqueFeatures.forEach((feature) => {
            const usage = featureUsageByStatus.get(feature);
            if (usage) {
              if (profile.isPaying) {
                usage.paying++;
              } else {
                usage.nonPaying++;
              }
            }
          });
        }
      });

      // Get top 5 features and calculate percentages
      const topFeatures = Array.from(featureUsageByStatus.entries())
        .sort(
          (a, b) =>
            b[1].paying + b[1].nonPaying - (a[1].paying + a[1].nonPaying)
        )
        .slice(0, 5)
        .map(([feature, usage]) => ({
          feature: feature
            .split("_")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" "),
          paying: Math.round(
            (usage.paying / Math.max(1, payingUserCount)) * 100
          ),
          nonPaying: Math.round(
            (usage.nonPaying / Math.max(1, nonPayingUserCount)) * 100
          ),
        }));

      // Calculate insights
      const insights = {
        totalUsers: unifiedProfiles.size,
        payingUsers: payingUserCount,
        conversionRate: 0,
        avgTicketsPerUser: issues.length / (unifiedProfiles.size || 1),
        avgRevenuePerUser: 0,
        churnRiskUsers: Array.from(unifiedProfiles.values()).filter(
          (p) => p.churnRisk === "high"
        ).length,
        topSupportOrgs: [],
        featureUsageData:
          topFeatures.length > 0
            ? topFeatures
            : [
                // Fallback if no Land iQ data
                { feature: "Support Tickets", paying: 100, nonPaying: 100 },
                { feature: "Email Contact", paying: 100, nonPaying: 80 },
                { feature: "Organisation Data", paying: 90, nonPaying: 60 },
                { feature: "Deal Pipeline", paying: 80, nonPaying: 20 },
                { feature: "License Management", paying: 70, nonPaying: 10 },
              ],
      };

      insights.conversionRate =
        (insights.payingUsers / insights.totalUsers) * 100;

      const totalRevenue = Array.from(unifiedProfiles.values()).reduce(
        (sum, p) => sum + (p.totalDealValue || 0),
        0
      );
      insights.avgRevenuePerUser = totalRevenue / (insights.payingUsers || 1);

      // Find top orgs by support activity
      insights.topSupportOrgs = Array.from(organisationStats.values())
        .filter((org) => org.totalTickets > 0)
        .sort((a, b) => b.totalTickets - a.totalTickets)
        .slice(0, 5)
        .map((org) => org.name);

      setAnalyticsData({
        unifiedProfiles,
        jiraIssues: issues,
        pipedriveData,
        landIQEvents: landIQData,
        organisationStats,
        timelineData,
        insights,
      });
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-muted-foreground mb-2">
              Loading cross-platform analytics...
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={
                    dataLoadProgress.jira ? "text-green-500" : "text-gray-400"
                  }
                >
                  {dataLoadProgress.jira ? "✓" : "○"} Jira
                </span>
                <span
                  className={
                    dataLoadProgress.pipedrive
                      ? "text-green-500"
                      : "text-gray-400"
                  }
                >
                  {dataLoadProgress.pipedrive ? "✓" : "○"} Pipedrive
                </span>
                <span
                  className={
                    dataLoadProgress.landiq ? "text-green-500" : "text-gray-400"
                  }
                >
                  {dataLoadProgress.landiq ? "✓" : "○"} Land iQ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "No data available"}</AlertDescription>
      </Alert>
    );
  }

  const {
    unifiedProfiles,
    jiraIssues,
    pipedriveData,
    landIQEvents,
    organisationStats,
    timelineData,
    insights,
  } = analyticsData;

  // Calculate summary stats
  const totalTickets = jiraIssues.length;
  const resolvedTickets = jiraIssues.filter((i) => i.fields.resolution).length;
  const avgResolutionTime =
    jiraIssues
      .filter((i) => i.fields.resolutiondate)
      .reduce((acc, issue) => {
        const created = new Date(issue.fields.created);
        const resolved = new Date(issue.fields.resolutiondate!);
        return acc + differenceInDays(resolved, created);
      }, 0) / (resolvedTickets || 1);

  // Request type distribution
  const requestTypeData = jiraIssues.reduce((acc, issue) => {
    const type = issue.fields.customfield_10010?.requestType?.name || "Other";
    const existing = acc.find((item) => item.name === type);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Organisation leaderboard by support activity
  const orgLeaderboard = Array.from(organisationStats.values())
    .sort((a, b) => b.totalTickets - a.totalTickets)
    .slice(0, 10);

  // User engagement matrix with full profiles
  const userEngagementData = Array.from(unifiedProfiles.values())
    .filter((profile) => profile.totalTickets > 0 || profile.totalEvents > 0)
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 50)
    .map((profile) => ({
      ...profile,
      name: profile.name,
      email: profile.email,
    }));

  // User activity funnel
  const funnelData = [
    {
      stage: "Total Users",
      value: insights.totalUsers,
    },
    {
      stage: "Active in Product",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalEvents > 0
      ).length,
    },
    {
      stage: "Support Users",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets > 0
      ).length,
    },
    {
      stage: "Both Support & Product",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets > 0 && p.totalEvents > 0
      ).length,
    },
  ];

  // Support engagement patterns
  const supportEngagementData = [
    {
      name: "Only Support",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets > 0 && p.totalEvents === 0
      ).length,
      fill: "#0088FE",
    },
    {
      name: "Only Product",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets === 0 && p.totalEvents > 0
      ).length,
      fill: "#00C49F",
    },
    {
      name: "Both Platforms",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets > 0 && p.totalEvents > 0
      ).length,
      fill: "#FFBB28",
    },
    {
      name: "Inactive",
      value: Array.from(unifiedProfiles.values()).filter(
        (p) => p.totalTickets === 0 && p.totalEvents === 0
      ).length,
      fill: "#cccccc",
    },
  ];

  // Ticket frequency analysis
  const ticketFrequencyData = Array.from(unifiedProfiles.values())
    .filter((p) => p.totalTickets > 0)
    .reduce((acc, profile) => {
      const ticketRange =
        profile.totalTickets === 1
          ? "1 ticket"
          : profile.totalTickets <= 3
          ? "2-3 tickets"
          : profile.totalTickets <= 5
          ? "4-5 tickets"
          : profile.totalTickets <= 10
          ? "6-10 tickets"
          : "10+ tickets";

      const existing = acc.find((item) => item.range === ticketRange);
      if (existing) {
        existing.users++;
        existing.avgEvents += profile.totalEvents || 0;
      } else {
        acc.push({
          range: ticketRange,
          users: 1,
          avgEvents: profile.totalEvents || 0,
        });
      }
      return acc;
    }, [] as { range: string; users: number; avgEvents: number }[])
    .map((item) => ({
      ...item,
      avgEvents: Math.round(item.avgEvents / item.users),
    }))
    .sort((a, b) => {
      const order = [
        "1 ticket",
        "2-3 tickets",
        "4-5 tickets",
        "6-10 tickets",
        "10+ tickets",
      ];
      return order.indexOf(a.range) - order.indexOf(b.range);
    });

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Cross-Platform Analytics</h2>
        <div className="flex items-center gap-4">
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAndProcessData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards - Support Analytics Focus */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Users</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                Array.from(unifiedProfiles.values()).filter(
                  (p) => p.totalTickets > 0
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (Array.from(unifiedProfiles.values()).filter(
                  (p) => p.totalTickets > 0
                ).length /
                  insights.totalUsers) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                Array.from(unifiedProfiles.values()).filter(
                  (p) => p.totalEvents > 0
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Land iQ usage tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {insights.avgTicketsPerUser.toFixed(1)} avg per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((resolvedTickets / totalTickets) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {avgResolutionTime.toFixed(1)} days avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Types</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestTypeData.length}</div>
            <p className="text-xs text-muted-foreground">Categories tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs - Enhanced */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="users">User Analysis</TabsTrigger>
          <TabsTrigger value="organisations">Organisations</TabsTrigger>
          <TabsTrigger value="topics">Ticket Topics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Support Analytics Focus */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* User Activity Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>User Activity Funnel</CardTitle>
                <CardDescription>
                  How users engage across support and product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {funnelData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Support Engagement Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>User Engagement Patterns</CardTitle>
                <CardDescription>
                  Distribution of users by platform usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={supportEngagementData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {supportEngagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Frequency Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Frequency vs Product Usage</CardTitle>
              <CardDescription>
                How support ticket volume correlates with product engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="users"
                    fill="#8884d8"
                    name="Number of Users"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="avgEvents"
                    fill="#82ca9d"
                    name="Avg Product Events"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Multi-platform Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Activity</CardTitle>
              <CardDescription>
                Combined activity across Jira, Pipedrive, and Land iQ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "MMM dd")}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    labelFormatter={(date) =>
                      format(new Date(date), "MMM dd, yyyy")
                    }
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="landIQEvents"
                    fill="#8884d8"
                    stroke="#8884d8"
                    fillOpacity={0.6}
                    name="Land iQ Events"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="newTickets"
                    stroke="#ff7300"
                    name="Support Tickets"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="newDeals"
                    stroke="#82ca9d"
                    name="New Deals"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="activeUsers"
                    fill="#ffc658"
                    name="Active Users"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Ticket Timeline</CardTitle>
              <CardDescription>
                Daily ticket creation and resolution trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "MMM dd")}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) =>
                      format(new Date(date), "MMM dd, yyyy")
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newTickets"
                    stroke="#8884d8"
                    name="New Tickets"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolvedTickets"
                    stroke="#82ca9d"
                    name="Resolved"
                  />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="#ffc658"
                    name="Active Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Profiles Tab - Enhanced */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unified User Profiles</CardTitle>
              <CardDescription>
                Complete user journey across support, sales, and product usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px]">
                <div className="space-y-4">
                  {userEngagementData.map((user, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-4">
                        {/* User Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{user.name}</h4>
                              {user.churnRisk === "high" && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  High Churn Risk
                                </Badge>
                              )}
                              {user.isPaying && (
                                <Badge variant="default" className="text-xs">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Paying
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {user.organisation || "Unknown"}{" "}
                              {user.jobTitle && `• ${user.jobTitle}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {user.engagementScore || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Engagement Score
                            </p>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                          {/* Support Metrics */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Support
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Tickets:</span>
                                <span className="font-medium">
                                  {user.totalTickets}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Resolved:</span>
                                <span className="font-medium">
                                  {user.resolvedTickets}
                                </span>
                              </div>
                              {user.satisfaction > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Satisfaction:</span>
                                  <span className="flex items-center gap-1">
                                    {user.satisfaction >= 4 ? (
                                      <Smile className="h-3 w-3 text-green-500" />
                                    ) : user.satisfaction >= 3 ? (
                                      <Meh className="h-3 w-3 text-yellow-500" />
                                    ) : (
                                      <Frown className="h-3 w-3 text-red-500" />
                                    )}
                                    {user.satisfaction}/5
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Sales Metrics */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Sales
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Deals:</span>
                                <span className="font-medium">
                                  {user.pipedriveDeals?.length || 0}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Value:</span>
                                <span className="font-medium">
                                  ${(user.totalDealValue || 0).toLocaleString()}
                                </span>
                              </div>
                              {user.licenseCount && (
                                <div className="flex justify-between text-sm">
                                  <span>Licenses:</span>
                                  <span className="font-medium">
                                    {user.licenseCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Usage Metrics */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Product Usage
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Events:</span>
                                <span className="font-medium">
                                  {user.totalEvents || 0}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Features:</span>
                                <span className="font-medium">
                                  {user.uniqueFeatures?.size || 0}
                                </span>
                              </div>
                              {user.avgEventsPerDay && (
                                <div className="flex justify-between text-sm">
                                  <span>Daily Avg:</span>
                                  <span className="font-medium">
                                    {user.avgEventsPerDay.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Timeline */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Timeline
                            </p>
                            <div className="space-y-1 text-sm">
                              {user.firstSeenDate && (
                                <div>
                                  <span className="text-muted-foreground">
                                    First seen:
                                  </span>
                                  <p className="font-medium">
                                    {format(user.firstSeenDate, "MMM d, yyyy")}
                                  </p>
                                </div>
                              )}
                              {user.lastActiveDate && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Last active:
                                  </span>
                                  <p className="font-medium">
                                    {format(user.lastActiveDate, "MMM d, yyyy")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {(user.requestTypes.length > 0 ||
                          user.uniqueFeatures?.size > 0) && (
                          <div className="flex flex-wrap gap-2 pt-3 border-t">
                            {user.requestTypes.map((type, i) => (
                              <Badge
                                key={`req-${i}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                <HelpCircle className="h-3 w-3 mr-1" />
                                {type}
                              </Badge>
                            ))}
                            {user.uniqueFeatures &&
                              Array.from(user.uniqueFeatures)
                                .slice(0, 5)
                                .map((feature, i) => (
                                  <Badge
                                    key={`feat-${i}`}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    <Activity className="h-3 w-3 mr-1" />
                                    {feature}
                                  </Badge>
                                ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisations Tab - Enhanced */}
        <TabsContent value="organisations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Analytics</CardTitle>
              <CardDescription>
                Combined view of support, sales, and usage by organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {orgLeaderboard.map((org, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {org.name}
                            </h4>
                            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {org.uniqueUsers} users
                              </span>
                              <span className="flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" />
                                {org.totalTickets} tickets
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />$
                                {org.totalDealValue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">
                              {Math.round(org.avgEngagement)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Avg Engagement
                            </p>
                          </div>
                        </div>

                        {/* Organisation Metrics */}
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Support Activity
                            </p>
                            <Progress
                              value={(org.totalTickets / 50) * 100}
                              className="h-2"
                            />
                            <p className="text-xs mt-1">
                              {org.totalTickets} tickets from {org.uniqueUsers}{" "}
                              users
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Revenue
                            </p>
                            <Progress
                              value={(org.totalDealValue / 100000) * 100}
                              className="h-2"
                            />
                            <p className="text-xs mt-1">
                              ${org.totalDealValue.toLocaleString()} total value
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Engagement
                            </p>
                            <Progress
                              value={org.avgEngagement}
                              className="h-2"
                            />
                            <p className="text-xs mt-1">
                              {Math.round(org.avgEngagement)}/100 score
                            </p>
                          </div>
                        </div>

                        {/* Top Features */}
                        {org.topFeatures && org.topFeatures.length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                              Top Features Used
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {org.topFeatures.map((feature, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Request Types Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Type Distribution</CardTitle>
              <CardDescription>
                Most common support request categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={requestTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {requestTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ticket Topics Tab - New */}
        <TabsContent value="topics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Request Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Support Request Types</CardTitle>
                <CardDescription>
                  Distribution of ticket categories and topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={requestTypeData.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {requestTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ticket Type vs Usage Correlation */}
            <Card>
              <CardHeader>
                <CardTitle>Request Type by User Activity</CardTitle>
                <CardDescription>
                  How different request types correlate with product usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={requestTypeData.slice(0, 6).map((type) => {
                      const usersWithType = Array.from(
                        unifiedProfiles.values()
                      ).filter((p) => p.requestTypes.includes(type.name));
                      const avgEvents =
                        usersWithType.reduce(
                          (sum, p) => sum + (p.totalEvents || 0),
                          0
                        ) / (usersWithType.length || 1);
                      return {
                        type: type.name,
                        tickets: type.value,
                        avgEvents: Math.round(avgEvents),
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="type"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#82ca9d"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="tickets"
                      fill="#8884d8"
                      name="Ticket Count"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="avgEvents"
                      fill="#82ca9d"
                      name="Avg Events"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Resolution Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Time by Request Type</CardTitle>
              <CardDescription>
                Average resolution time and satisfaction by ticket category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={requestTypeData.slice(0, 8).map((type) => {
                    const ticketsOfType = jiraIssues.filter(
                      (issue) =>
                        issue.fields.customfield_10010?.requestType?.name ===
                        type.name
                    );
                    const resolvedTickets = ticketsOfType.filter(
                      (t) => t.fields.resolution
                    );
                    const avgResTime =
                      resolvedTickets.reduce((sum, t) => {
                        if (t.fields.resolutiondate) {
                          return (
                            sum +
                            differenceInDays(
                              new Date(t.fields.resolutiondate),
                              new Date(t.fields.created)
                            )
                          );
                        }
                        return sum;
                      }, 0) / (resolvedTickets.length || 1);

                    return {
                      type: type.name,
                      count: type.value,
                      avgResolutionDays: avgResTime.toFixed(1),
                      resolutionRate: (
                        (resolvedTickets.length / ticketsOfType.length) *
                        100
                      ).toFixed(1),
                    };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="type"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="avgResolutionDays"
                    fill="#8884d8"
                    name="Avg Resolution (days)"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="resolutionRate"
                    fill="#82ca9d"
                    name="Resolution Rate %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab - New */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights & Recommendations</CardTitle>
                <CardDescription>
                  AI-powered insights from cross-platform data analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* High Support Volume Alert */}
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>High Support Volume Users</AlertTitle>
                    <AlertDescription>
                      {
                        Array.from(unifiedProfiles.values()).filter(
                          (p) => p.totalTickets > 5
                        ).length
                      }{" "}
                      users have submitted more than 5 tickets. These users may
                      be experiencing product difficulties and need additional
                      training or documentation.
                    </AlertDescription>
                  </Alert>

                  {/* Support Coverage Gap */}
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertTitle>Support Coverage Gap</AlertTitle>
                    <AlertDescription>
                      {
                        Array.from(unifiedProfiles.values()).filter(
                          (p) => p.totalEvents > 50 && p.totalTickets === 0
                        ).length
                      }{" "}
                      active users have never contacted support. Consider
                      proactive check-ins to ensure they're getting full value
                      from the product.
                    </AlertDescription>
                  </Alert>

                  {/* Support Efficiency */}
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Support Performance</AlertTitle>
                    <AlertDescription>
                      Average resolution time is {avgResolutionTime.toFixed(1)}{" "}
                      days with{" "}
                      {((resolvedTickets / totalTickets) * 100).toFixed(1)}%
                      resolution rate. Top request types:{" "}
                      {requestTypeData
                        .slice(0, 3)
                        .map((r) => r.name)
                        .join(", ")}
                      .
                    </AlertDescription>
                  </Alert>

                  {/* Usage Pattern Insight */}
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertTitle>Usage Correlation Insight</AlertTitle>
                    <AlertDescription>
                      Users with 2-3 support tickets show{" "}
                      {ticketFrequencyData.find(
                        (d) => d.range === "2-3 tickets"
                      )?.avgEvents || 0}{" "}
                      average product events, while users with 10+ tickets show{" "}
                      {ticketFrequencyData.find(
                        (d) => d.range === "10+ tickets"
                      )?.avgEvents || 0}{" "}
                      events. High ticket volume may indicate onboarding issues.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
                <CardDescription>
                  Prioritised action items based on data analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Assist High-Volume Support Users
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Provide personalised training to{" "}
                        {
                          Array.from(unifiedProfiles.values()).filter(
                            (p) => p.totalTickets > 5
                          ).length
                        }{" "}
                        users with 5+ tickets to reduce their support dependency
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Create Documentation for Top Issues
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Build self-service guides for:{" "}
                        {requestTypeData
                          .slice(0, 3)
                          .map((r) => r.name)
                          .join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Proactive User Check-ins</h4>
                      <p className="text-sm text-muted-foreground">
                        Reach out to{" "}
                        {
                          Array.from(unifiedProfiles.values()).filter(
                            (p) => p.totalEvents > 50 && p.totalTickets === 0
                          ).length
                        }{" "}
                        active users who've never used support
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Improve Onboarding Process
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Users with many tickets show lower product usage -
                        enhance onboarding to reduce early confusion
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
