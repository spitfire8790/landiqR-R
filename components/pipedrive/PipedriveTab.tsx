"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Activity,
  Building2,
  BarChart3,
  Download,
  Search,
  Eye,
  Target,
  ChevronDown,
  ChevronRight,
  Filter,
  ListPlus,
  MapPin,
  Copy,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// (Scatter chart removed – no Recharts imports needed here)
import { pipedriveService } from "@/lib/pipedrive-service";
import { useToast } from "@/components/ui/use-toast";
import {
  categorizeJobTitleEnhanced,
  getCategoryColor,
  JOB_TITLE_CATEGORIES,
} from "@/lib/job-title-categories";
import TimeSeriesSection from "./TimeSeriesSection";

interface UserUsageData {
  name: string;
  email: string;
  organisation: string;
  totalEvents: number;
  eventBreakdown: {
    [eventType: string]: number;
  };
  lastActivity?: string;
  dateAdded?: string;
  daysInLandIQ?: number;
  customerType?: string; // Customer type from Pipedrive
  activitiesCount?: number; // Pipedrive activities count
  jobTitle?: string; // Job title from Pipedrive
  jobTitleCategory?: string; // Categorized job title
}

interface OrganisationSummary {
  name: string;
  userCount: number;
  totalEvents: number;
  topEvents: Array<{
    event: string;
    count: number;
  }>;
  users: UserUsageData[];
}

// Fallback data in case CSV loading fails
const FALLBACK_LANDIQ_DATA = `Name,Email,Event,Count
Jeff Brazel,jeff.brazel@mmplm.com.au,Run Site Search,483
Nicholas Knezevic,nknezevic1@wollongong.nsw.gov.au,Run Site Search,291
Andrew Sutherland,andrew.sutherland@sydneywater.com.au,Run Site Search,171`;

// Event mapping function to convert new CSV event names to display labels
const mapEventNameToDisplayLabel = (eventName: string): string => {
  const eventMappings: Record<string, string> = {
    site_search_run: "Run Site Search",
    geoinsight_explore_query: "GeoInsights Explore",
    geoinsight_compare_query: "GeoInsights Compare",
    downloadFromUrl: "Download From URL",
    shortlist_create: "Create Shortlist",
    export_create: "Create Export",
    instant_report_create: "Instant Report",
    scenario_plan_created: "Create Scenario Plan",
    apply_scoresets: "Apply Scoreset",
    shortlist_create_from_shortlist: "Create Shortlist From Shortlist",
    shortlist_create_error: "Shortlist Creation Error",
  };

  return eventMappings[eventName] || eventName;
};

export default function PipedriveTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalOrganisations: 0,
    totalEvents: 0,
    topEventType: "",
  });
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [selectedEventFilter, setSelectedEventFilter] =
    useState<string>("All Events");
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);

  // Track the most recent event date found in the Land iQ CSV
  const [latestEventDate, setLatestEventDate] = useState<Date | null>(null);

  // Collapsible chart state (expanded by default)
  const [chartCollapsed, setChartCollapsed] = useState(false);
  // (Scatter chart removed – state no longer needed)
  // NEW: Chart view mode toggle (customer type vs job title category)
  const [chartViewMode, setChartViewMode] = useState<
    "customer-type" | "job-title"
  >("customer-type");

  // Dynamic mapping from customer type ID (Pipedrive option id) to label
  const [customerTypeMappings, setCustomerTypeMappings] = useState<
    Record<string, string>
  >({});
  const customerTypeMapRef = useRef<Record<string, string>>({}); // immediate-access ref

  // Diagnostic state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  const { toast } = useToast();

  // Helper function to check if customer type should be excluded from analytics
  const shouldExcludeCustomerType = (
    customerType: string | undefined
  ): boolean => {
    if (!customerType) return false;
    const excludedTypes = ["Giraffe/WSP", "Land iQ Project Team"];
    return excludedTypes.includes(customerType);
  };

  // Helper function to check if organization should be excluded from analytics
  const shouldExcludeOrganization = (
    organizationName: string | undefined
  ): boolean => {
    if (!organizationName) return false;
    return organizationName.toLowerCase().includes("wsp");
  };

  // Helper function to check if specific email addresses should be excluded from analytics
  const shouldExcludeEmail = (email: string | undefined): boolean => {
    if (!email) return false;
    const excludedEmails = [
      "justin.mcfeeter@dpie.nsw.gov.au",
      "naishadh.dave@dpie.nsw.gov.au",
    ];
    return excludedEmails.includes(email.toLowerCase());
  };

  // Helper function to map customer type ID to human-readable label
  const mapCustomerType = (customerTypeId?: string | number): string => {
    if (customerTypeId === undefined || customerTypeId === null) {
      return "Unknown Customer Type";
    }

    const idStr = String(customerTypeId);

    // Prefer dynamically fetched mappings (ref gives latest sync access)
    if (customerTypeMapRef.current[idStr]) {
      return customerTypeMapRef.current[idStr];
    }

    if (customerTypeMappings[idStr]) {
      return customerTypeMappings[idStr];
    }

    // Fallback to static legacy mapping for early IDs 0-9
    const legacyMappings: Record<string, string> = {
      "0": "2 Week Trial Licence",
      "1": "Access Revoked",
      "2": "Admin",
      "3": "Centrally Funded Licence",
      "4": "Contact Register",
      "5": "Extended Trial Licence",
      "6": "Giraffe/WSP",
      "7": "Land iQ Project Team",
      "8": "Paid Subscription",
      "9": "Potential User",
    };

    return legacyMappings[idStr] || "Unknown Customer Type";
  };

  // Collapse the raw customer-type label into one of the four display categories
  const getDisplayCategory = (label: string | undefined): string | null => {
    if (!label) return null;
    if (
      label === "2 Week Trial Licence" ||
      label === "Extended Trial Licence"
    ) {
      return "Trial";
    }
    if (
      label === "Centrally Funded Licence" ||
      label === "Paid Subscription" ||
      label === "Access Revoked"
    ) {
      return label; // keep as-is
    }
    return null; // ignore everything else
  };

  // Helper function to get color for customer type
  const getCustomerTypeColor = (customerType: string): string => {
    const colorMap: Record<string, string> = {
      Trial: "#f59e0b", // light orange
      "Centrally Funded Licence": "#1e3a8a", // navy blue
      "Paid Subscription": "#16a34a", // green
      "Access Revoked": "#dc2626", // red
    };
    return colorMap[customerType] || "#6b7280";
  };

  const getJobTitleCategoryColor = (categoryKey: string): string => {
    // Use the color from job title categories, fallback to gray for 'Other'
    return getCategoryColor(categoryKey);
  };

  const getCurrentChartColor = (key: string): string => {
    if (chartViewMode === "job-title") {
      return getJobTitleCategoryColor(key);
    } else {
      return getCustomerTypeColor(key);
    }
  };

  const getChartData = () => {
    return organisations
      .map((org) => {
        // Group users by customer type and calculate events for each
        const customerTypeGroups = new Map<string, number>();
        let totalEventCount = 0;

        org.users.forEach((user) => {
          // Skip users with excluded customer types (internal team members)
          if (shouldExcludeCustomerType(user.customerType)) {
            return;
          }

          // Skip users from excluded organizations (WSP)
          if (shouldExcludeOrganization(user.organisation)) {
            return;
          }

          // Skip specific excluded email addresses
          if (shouldExcludeEmail(user.email)) {
            return;
          }

          const displayCat = getDisplayCategory(user.customerType);
          if (!displayCat) return; // skip irrelevant categories
          const customerType = displayCat;
          let eventCount = 0;

          if (selectedEventFilter === "All Events") {
            eventCount = user.totalEvents;
          } else {
            eventCount = user.eventBreakdown[selectedEventFilter] || 0;
          }

          customerTypeGroups.set(
            customerType,
            (customerTypeGroups.get(customerType) || 0) + eventCount
          );
          totalEventCount += eventCount;
        });

        // Create segments array for stacked bar
        const segments = Array.from(customerTypeGroups.entries())
          .filter(([_, count]) => count > 0)
          .map(([customerType, count]) => ({
            customerType,
            count,
            percentage:
              totalEventCount > 0 ? (count / totalEventCount) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          name:
            org.name.length > 20 ? org.name.substring(0, 20) + "..." : org.name,
          fullName: org.name,
          value: totalEventCount,
          userCount: org.userCount,
          segments,
        };
      })
      .filter((item) => item.value > 0) // Only show orgs with events for the selected filter
      .sort((a, b) => b.value - a.value); // Show ALL organizations, sorted by event count
  };

  const getJobTitleChartData = () => {
    // Group all users by job title category across all organizations
    type GroupStats = { events: number; users: Set<string> };
    const jobTitleGroups = new Map<string, GroupStats>();
    let totalEventCount = 0;

    organisations.forEach((org) => {
      org.users.forEach((user) => {
        const category = user.jobTitleCategory || "Other";
        let eventCount = 0;

        if (selectedEventFilter === "All Events") {
          eventCount = user.totalEvents;
        } else {
          eventCount = user.eventBreakdown[selectedEventFilter] || 0;
        }

        if (!jobTitleGroups.has(category)) {
          jobTitleGroups.set(category, { events: 0, users: new Set() });
        }

        const group = jobTitleGroups.get(category)!;
        group.events += eventCount;
        group.users.add(user.email); // unique users per category

        totalEventCount += eventCount;
      });
    });

    // Create chart data for job title categories
    return Array.from(jobTitleGroups.entries())
      .filter(([_, stats]) => stats.events > 0)
      .map(([category, stats]) => ({
        name:
          category.length > 25 ? category.substring(0, 25) + "..." : category,
        fullName: category,
        value: stats.events,
        userCount: stats.users.size,
        segments: [
          {
            customerType: category,
            count: stats.events,
            percentage:
              totalEventCount > 0 ? (stats.events / totalEventCount) * 100 : 0,
          },
        ],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getScatterData = () => {
    const grouped: Record<
      string,
      { x: number; y: number; size: number; name: string }[]
    > = {};
    organisations.forEach((org) => {
      org.users.forEach((user) => {
        if (
          user.activitiesCount &&
          user.activitiesCount > 0 &&
          user.totalEvents > 0
        ) {
          const category = getDisplayCategory(user.customerType);
          if (!category) return;
          const eventsPerActivity = user.totalEvents / user.activitiesCount;
          const point = {
            x: user.activitiesCount,
            y: user.totalEvents,
            size: eventsPerActivity,
            name: user.name,
          };
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(point);
        }
      });
    });
    return grouped;
  };

  const toggleOrgExpansion = (orgName: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgName)) {
      newExpanded.delete(orgName);
    } else {
      newExpanded.add(orgName);
    }
    setExpandedOrgs(newExpanded);
  };

  const toggleAllOrgs = () => {
    if (expandedOrgs.size === organisations.length) {
      setExpandedOrgs(new Set());
    } else {
      setExpandedOrgs(new Set(organisations.map((org) => org.name)));
    }
  };

  // Extract real customer type mappings from Pipedrive
  const extractCustomerTypeMappings = async () => {
    try {
      console.log(
        "🔍 Extracting real customer type ID mappings from Pipedrive..."
      );
      const fieldDefinitions = await pipedriveService.getAllCustomFields();

      const customFieldKey =
        pipedriveService.getCustomFieldMappings().persons.customerType;

      const customerTypeField = fieldDefinitions.personFields.find(
        (field) => field.key === customFieldKey
      );

      if (customerTypeField && customerTypeField.options) {
        console.log("📋 Customer Type Field Definition:", customerTypeField);
        console.log("🗂️ Real ID Mappings:");

        const mappings: Record<string, string> = {};
        customerTypeField.options.forEach((option: any) => {
          mappings[String(option.id)] = option.label;
          console.log(`  "${option.id}": "${option.label}",`);
        });

        console.log("\n📝 Copy this TypeScript mapping:");
        console.log("const mappings = {");
        Object.entries(mappings).forEach(([id, label]) => {
          console.log(`  "${id}": "${label}",`);
        });
        console.log("};");

        setCustomerTypeMappings(mappings);
        customerTypeMapRef.current = mappings; // Update ref immediately
        return mappings;
      } else {
        console.warn("❌ Customer type field not found in person fields");
      }
    } catch (error) {
      console.error("❌ Failed to extract customer type mappings:", error);
    }
  };

  const logActivityTypes = async () => {
    try {
      console.log("🔍 Fetching all Pipedrive activities to analyse types...");
      const activities = await pipedriveService.fetchActivities(1000);

      // Get unique activity types
      const activityTypes = new Map<string, number>();
      activities.forEach((activity) => {
        const type = activity.type || "Unknown";
        activityTypes.set(type, (activityTypes.get(type) || 0) + 1);
      });

      // Sort by frequency
      const sortedTypes = Array.from(activityTypes.entries()).sort(
        (a, b) => b[1] - a[1]
      );

      console.log("📊 Pipedrive Activity Types Found:");
      console.table(sortedTypes);

      console.log("📈 Summary:");
      console.log(`Total activities: ${activities.length}`);
      console.log(`Unique activity types: ${activityTypes.size}`);

      return sortedTypes;
    } catch (error) {
      console.error("❌ Error fetching activity types:", error);
    }
  };

  const logPipedriveDataAvailable = async () => {
    try {
      console.log("🔍 Checking what Pipedrive data is available...");

      // Check persons
      const persons = await pipedriveService.fetchPersons(100);
      console.log(`👥 Persons found: ${persons.length}`);
      if (persons.length > 0) {
        console.log("Sample person data:", persons[0]);
        console.log(
          "Person activities_count sample:",
          persons.slice(0, 3).map((p) => ({
            name: p.name,
            activities_count: p.activities_count,
            email: p.email || p.primary_email,
          }))
        );
      }

      // Check organizations
      const orgs = await pipedriveService.fetchOrganisations(100);
      console.log(`🏢 Organizations found: ${orgs.length}`);
      if (orgs.length > 0) {
        console.log("Sample organization:", orgs[0]);
      }

      // Check deals
      const deals = await pipedriveService.fetchDeals(100);
      console.log(`💼 Deals found: ${deals.length}`);
      if (deals.length > 0) {
        console.log("Sample deal:", deals[0]);
      }

      // Check activities again but with more detail
      const activities = await pipedriveService.fetchActivities(100);
      console.log(`📅 Activities found: ${activities.length}`);

      console.log("🎯 This explains the scatter plot data availability!");
    } catch (error) {
      console.error("❌ Error checking Pipedrive data:", error);
    }
  };

  const logJobTitles = async () => {
    try {
      console.log("🔍 Fetching all Pipedrive persons to analyse job titles...");
      const persons = await pipedriveService.fetchPersons(5000); // Get more records

      // Get unique job titles
      const jobTitles = new Map<string, number>();
      const noJobTitle = { count: 0, examples: [] as string[] };

      persons.forEach((person) => {
        const jobTitle = person.job_title;
        if (jobTitle && jobTitle.trim() !== "") {
          const title = jobTitle.trim();
          jobTitles.set(title, (jobTitles.get(title) || 0) + 1);
        } else {
          noJobTitle.count++;
          if (noJobTitle.examples.length < 5) {
            noJobTitle.examples.push(person.name || "Unknown Name");
          }
        }
      });

      // Sort by frequency
      const sortedTitles = Array.from(jobTitles.entries()).sort(
        (a, b) => b[1] - a[1]
      );

      console.log("💼 Pipedrive Job Titles Found:");
      console.table(sortedTitles);

      console.log("📈 Summary:");
      console.log(`Total persons: ${persons.length}`);
      console.log(`Unique job titles: ${jobTitles.size}`);
      console.log(`Persons without job title: ${noJobTitle.count}`);
      if (noJobTitle.examples.length > 0) {
        console.log(`Examples without job title:`, noJobTitle.examples);
      }

      // Show top 10 most common titles
      console.log("🔥 Top 10 Most Common Job Titles:");
      sortedTitles.slice(0, 10).forEach(([title, count], index) => {
        console.log(`${index + 1}. ${title} (${count} people)`);
      });

      return {
        allTitles: sortedTitles,
        totalPersons: persons.length,
        uniqueTitles: jobTitles.size,
        withoutTitle: noJobTitle.count,
      };
    } catch (error) {
      console.error("❌ Error fetching job titles:", error);
      return null;
    }
  };

  // Test connection on component mount, then load data
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsInitialLoad(true);
      setLoadingProgress(0);
      setLoadingMessage("Checking Pipedrive connection...");

      const isConnected = await testPipedriveConnection();

      if (isConnected) {
        setLoadingProgress(20);
        setLoadingMessage("Extracting customer type mappings...");
        // Extract the real mappings first
        await extractCustomerTypeMappings();
        setLoadingProgress(40);
      }

      setLoadingMessage("Loading dashboard data...");
      await loadDashboardData(isConnected);
      setIsInitialLoad(false);
    };
    initializeDashboard();
  }, []);

  // Reload data when trial accounts filter changes
  useEffect(() => {
    if (lastRefresh) {
      // Only reload if we've loaded data before
      loadDashboardData();
    }
  }, []);

  const testPipedriveConnection = async (): Promise<boolean> => {
    console.log("🔍 Testing Pipedrive connection...");
    setConnectionStatus("checking");
    try {
      const isConnected = await pipedriveService.testConnection();
      console.log(
        `✅ Pipedrive connection result: ${
          isConnected ? "CONNECTED" : "DISCONNECTED"
        }`
      );
      setConnectionStatus(isConnected ? "connected" : "disconnected");

      if (!isConnected) {
        console.warn("❌ Pipedrive connection failed");
        toast({
          title: "Pipedrive Connection Issue",
          description:
            "Unable to connect to Pipedrive. Please check your API configuration.",
          variant: "destructive",
        });
      }
      return isConnected;
    } catch (error) {
      console.error("❌ Pipedrive connection test failed:", error);
      setConnectionStatus("disconnected");
      return false;
    }
  };

  // Utility: extract the most recent dd/mm/yyyy (or d/m/yyyy) date from the CSV text
  const extractLatestDate = (csvText: string): Date | null => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (lines.length < 2) return null; // no data rows

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const tsIdx = headers.indexOf("timestamp");
    if (tsIdx === -1) return null; // timestamp column not present

    let max: Date | null = null;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length <= tsIdx) continue;
      const ts = parts[tsIdx].trim();
      if (!ts) continue;

      const dmy = ts.split("/");
      if (dmy.length !== 3) continue;
      const [dayStr, monthStr, yearStr] = dmy;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1; // zero-based month
      const year = parseInt(yearStr, 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;

      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime()) && (max === null || dateObj > max)) {
        max = dateObj;
      }
    }
    return max;
  };

  const loadLandIQData = async () => {
    try {
      // First attempt to fetch the current CSV without a date prefix
      let response = await fetch("/landiQSDKeventsDate.csv");

      // If that fails (e.g. older deployments), fall back to the dated filename
      if (!response.ok) {
        response = await fetch("/20250725_landiQSDKeventsDate.csv");
      }

      if (!response.ok) {
        throw new Error("Failed to load CSV data");
      }
      const csvText = await response.text();

      const latest = extractLatestDate(csvText);
      if (latest) {
        setLatestEventDate(latest);
      }

      return parseLandIQData(csvText);
    } catch (error) {
      console.error("Failed to load Land iQ data:", error);
      // Fallback to hardcoded sample data
      const latest = extractLatestDate(FALLBACK_LANDIQ_DATA);
      if (latest) {
        setLatestEventDate(latest);
      }
      return parseLandIQData(FALLBACK_LANDIQ_DATA);
    }
  };

  const parseLandIQData = (csvText: string) => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");
    const headers = lines[0].split(",").map((h) => h.trim());
    console.log("CSV Headers:", headers);
    console.log("Total CSV lines (after filtering empty):", lines.length);

    // Check if this is the new format (ID, timestamp, Event Name, User Email)
    const isNewFormat =
      headers.includes("ID") &&
      headers.includes("timestamp") &&
      headers.includes("Event Name") &&
      headers.includes("User Email");

    if (isNewFormat) {
      return parseNewFormatLandIQData(csvText);
    } else {
      // Legacy format parsing
      return parseLegacyFormatLandIQData(csvText);
    }
  };

  const parseNewFormatLandIQData = (csvText: string) => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    console.log(
      "Parsing new CSV format (ID, timestamp, Event Name, User Email)"
    );
    console.log("Total CSV lines (after filtering empty):", lines.length);

    // Count events by user and event type
    const eventCounts = new Map<string, Map<string, number>>();
    const userNames = new Map<string, string>(); // email -> name mapping

    let validRows = 0;
    let skippedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        skippedRows++;
        continue;
      }

      const values = line.split(",").map((v) => v.trim());

      // Check if we have all required fields: ID, timestamp, Event Name, User Email
      if (
        values.length >= 4 &&
        values[0] &&
        values[0] !== "" && // ID
        values[1] &&
        values[1] !== "" && // timestamp
        values[2] &&
        values[2] !== "" && // Event Name
        values[3] &&
        values[3] !== "" // User Email
      ) {
        const id = values[0];
        const timestamp = values[1];
        const eventName = values[2];
        const userEmail = values[3];

        // Extract name from email (part before @)
        const emailName = userEmail.split("@")[0];
        const displayName =
          emailName.charAt(0).toUpperCase() +
          emailName.slice(1).replace(/[._]/g, " ");

        // Store name mapping
        userNames.set(userEmail, displayName);

        // Count events per user
        if (!eventCounts.has(userEmail)) {
          eventCounts.set(userEmail, new Map());
        }

        const userEventCounts = eventCounts.get(userEmail)!;
        const mappedEventName = mapEventNameToDisplayLabel(eventName);
        const currentCount = userEventCounts.get(mappedEventName) || 0;
        userEventCounts.set(mappedEventName, currentCount + 1);

        validRows++;
      } else {
        skippedRows++;
        if (skippedRows <= 5) {
          // Only log first few skipped rows to avoid spam
          console.log(`Skipped row ${i}: [${values.join(", ")}]`);
        }
      }
    }

    // Convert to expected format
    const data: Array<{
      name: string;
      email: string;
      event: string;
      count: number;
    }> = [];

    eventCounts.forEach((eventMap, email) => {
      const name = userNames.get(email) || email.split("@")[0];
      eventMap.forEach((count, event) => {
        if (count > 0) {
          data.push({
            name,
            email,
            event,
            count,
          });
        }
      });
    });

    console.log(`Parsed ${validRows} valid rows, skipped ${skippedRows} rows`);
    console.log(`Generated ${data.length} user-event combinations`);
    console.log(`Sample user-event combinations:`, data.slice(0, 5));
    console.log(
      `Sample event counts map:`,
      Array.from(eventCounts.entries()).slice(0, 3)
    );
    return data;
  };

  const parseLegacyFormatLandIQData = (csvText: string) => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");
    const headers = lines[0].split(",");
    console.log("CSV Headers:", headers);
    console.log("Total CSV lines (after filtering empty):", lines.length);

    const data: Array<{
      name: string;
      email: string;
      event: string;
      count: number;
    }> = [];

    let validRows = 0;
    let skippedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        skippedRows++;
        continue;
      }

      const values = line.split(",");

      // Check if we have all required fields and they're not empty
      if (
        values.length >= 4 &&
        values[0] &&
        values[0].trim() !== "" &&
        values[1] &&
        values[1].trim() !== "" &&
        values[2] &&
        values[2].trim() !== "" &&
        values[3] &&
        values[3].trim() !== ""
      ) {
        const name = values[0].trim();
        const email = values[1].trim();
        const event = values[2].trim();
        const count = parseInt(values[3].trim()) || 0;

        if (count > 0) {
          // Only include rows with positive counts
          data.push({
            name,
            email,
            event,
            count,
          });
          validRows++;
        } else {
          skippedRows++;
        }
      } else {
        skippedRows++;
        console.log(`Skipped row ${i}: [${values.join(", ")}]`);
      }
    }

    console.log(`Parsed ${validRows} valid rows, skipped ${skippedRows} rows`);
    return data;
  };

  const loadDashboardData = async (overrideConnection?: boolean) => {
    setIsLoading(true);
    try {
      // Update progress for initial load
      if (isInitialLoad) {
        setLoadingProgress(50);
        setLoadingMessage("Loading Land iQ usage data...");
      }

      // Load Land iQ usage data from CSV
      const landiqData = await loadLandIQData();
      console.log(`Loaded ${landiqData.length} Land iQ event records from CSV`);

      // Update progress
      if (isInitialLoad) {
        setLoadingProgress(60);
        setLoadingMessage("Fetching Pipedrive data...");
      }

      // If Pipedrive is connected, get organisation data
      let pipedriveData: any = {};
      const effectiveConnectionStatus =
        overrideConnection !== undefined
          ? overrideConnection
            ? "connected"
            : "disconnected"
          : connectionStatus;

      console.log(
        `🔄 Loading dashboard data with connection status: ${effectiveConnectionStatus} (override: ${overrideConnection})`
      );

      if (effectiveConnectionStatus === "connected") {
        console.log("📡 Fetching Pipedrive data...");
        try {
          const [persons, organisations] = await Promise.all([
            pipedriveService.fetchPersons(),
            pipedriveService.fetchOrganisations(),
          ]);

          console.log(`📊 Pipedrive persons: ${persons.length} total`);
          console.log("👤 Pipedrive persons sample:", persons.slice(0, 2));
          console.log(
            `🏢 Pipedrive organisations: ${organisations.length} total`
          );
          console.log(
            "🏛️ Pipedrive organisations sample:",
            organisations.slice(0, 2)
          );

          pipedriveData = { persons, organisations };
          console.log("✅ Pipedrive data loaded successfully");
        } catch (error) {
          console.warn("❌ Failed to fetch Pipedrive data:", error);
          pipedriveData = { persons: [], organisations: [] };
        }
      } else {
        console.log(
          `⚠️ Skipping Pipedrive data fetch - connection status: ${effectiveConnectionStatus}`
        );
      }

      // Update progress
      if (isInitialLoad) {
        setLoadingProgress(80);
        setLoadingMessage("Processing and analysing data...");
      }

      // Process and combine data
      const userMap = new Map<string, UserUsageData>();
      const orgMap = new Map<string, OrganisationSummary>();

      // Process Land iQ data
      console.log("📊 Land iQ Data Summary:");
      console.log(`  Total records: ${landiqData.length}`);
      console.log(
        "  Sample of first 5 Land iQ records:",
        landiqData.slice(0, 5)
      );

      // Log unique emails for debugging
      const uniqueEmails = [...new Set(landiqData.map((item) => item.email))];
      console.log(`  Unique emails count: ${uniqueEmails.length}`);
      console.log("  Sample emails:", uniqueEmails.slice(0, 10));

      // Filter out trial accounts if the toggle is off
      const filteredLandiqData = landiqData.filter(
        (item) => !item.name.includes("TrialAccount")
      );

      console.log(
        `Filtered data: ${filteredLandiqData.length} records (from ${landiqData.length} total, showing trial accounts: false)`
      );

      filteredLandiqData.forEach((item) => {
        const email = item.email.toLowerCase();

        if (!userMap.has(email)) {
          // Try to find organisation from Pipedrive data
          let organisation = "Unknown Organisation";
          let pipedriveSource = "none";
          let dateAdded = undefined;
          let daysInLandIQ = undefined;
          let customerType = undefined;
          let activitiesCount = undefined;
          let jobTitle = undefined;
          let jobTitleCategory = undefined;

          if (pipedriveData.persons && pipedriveData.organisations) {
            const person = pipedriveData.persons.find(
              (p: any) =>
                p.primary_email &&
                typeof p.primary_email === "string" &&
                p.primary_email.toLowerCase() === email
            );

            if (person) {
              if (person.org_name) {
                organisation = person.org_name;
                pipedriveSource = "pipedrive-success";
              } else {
                pipedriveSource = "person-no-org";
              }

              // Extract add_time and calculate days in Land iQ
              if (person.add_time) {
                dateAdded = person.add_time;
                const addDate = new Date(person.add_time);
                const currentDate = new Date();
                const timeDiff = currentDate.getTime() - addDate.getTime();
                daysInLandIQ = Math.floor(timeDiff / (1000 * 3600 * 24));
              }

              // Extract activities count from Pipedrive
              if (person.activities_count !== undefined) {
                activitiesCount = person.activities_count;
              }

              // Extract customer type from custom field
              const customerTypeId =
                person["7faba81d32573b4aa224d4ffb56bb053587a1953"];
              if (customerTypeId) {
                customerType = mapCustomerType(String(customerTypeId));
              }

              // Skip users with excluded customer types (internal team members)
              if (shouldExcludeCustomerType(customerType)) {
                return; // Skip this user entirely
              }

              // Skip users from excluded organizations (WSP)
              if (shouldExcludeOrganization(organisation)) {
                return; // Skip this user entirely
              }

              // Skip specific excluded email addresses
              if (shouldExcludeEmail(email)) {
                return; // Skip this user entirely
              }

              // Extract and categorize job title
              if (person.job_title && person.job_title.trim()) {
                jobTitle = person.job_title.trim();
                jobTitleCategory = categorizeJobTitleEnhanced(jobTitle);
              }
            } else {
              pipedriveSource = "person-not-found";
            }
          } else {
            pipedriveSource = "no-pipedrive-data";
          }

          userMap.set(email, {
            name: item.name,
            email: item.email,
            organisation,
            totalEvents: 0,
            eventBreakdown: {},
            dateAdded,
            daysInLandIQ,
            customerType,
            activitiesCount,
            jobTitle,
            jobTitleCategory,
          });
        }

        const user = userMap.get(email)!;
        user.totalEvents += item.count;
        user.eventBreakdown[item.event] =
          (user.eventBreakdown[item.event] || 0) + item.count;
      });

      // Group by organisation
      userMap.forEach((user) => {
        if (!orgMap.has(user.organisation)) {
          orgMap.set(user.organisation, {
            name: user.organisation,
            userCount: 0,
            totalEvents: 0,
            topEvents: [],
            users: [],
          });
        }

        const org = orgMap.get(user.organisation)!;
        org.userCount++;
        org.totalEvents += user.totalEvents;
        org.users.push(user);
      });

      // Calculate top events for each organisation
      orgMap.forEach((org) => {
        const eventCounts = new Map<string, number>();
        org.users.forEach((user) => {
          Object.entries(user.eventBreakdown).forEach(([event, count]) => {
            eventCounts.set(event, (eventCounts.get(event) || 0) + count);
          });
        });

        org.topEvents = Array.from(eventCounts.entries())
          .map(([event, count]) => ({ event, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        // Sort users by total events
        org.users.sort((a, b) => b.totalEvents - a.totalEvents);
      });

      const organisationsArray = Array.from(orgMap.values())
        .filter((org) => !shouldExcludeOrganization(org.name))
        .sort((a, b) => b.totalEvents - a.totalEvents);

      setOrganisations(organisationsArray);

      // Calculate total stats
      const totalUsers = userMap.size;
      const totalOrganisations = orgMap.size;
      const totalEvents = Array.from(userMap.values()).reduce(
        (sum, user) => sum + user.totalEvents,
        0
      );

      console.log("Unique users found:", Array.from(userMap.keys()));
      console.log("Organisations found:", Array.from(orgMap.keys()));

      // Update progress
      if (isInitialLoad) {
        setLoadingProgress(90);
        setLoadingMessage("Finalizing dashboard...");
      }

      // Find top event type
      const allEventCounts = new Map<string, number>();
      userMap.forEach((user) => {
        Object.entries(user.eventBreakdown).forEach(([event, count]) => {
          allEventCounts.set(event, (allEventCounts.get(event) || 0) + count);
        });
      });
      const topEventType =
        Array.from(allEventCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || "None";

      setTotalStats({
        totalUsers,
        totalOrganisations,
        totalEvents,
        topEventType,
      });

      // Extract all unique event types for the filter dropdown
      const eventTypes = Array.from(allEventCounts.keys()).sort();
      setAvailableEventTypes(["All Events", ...eventTypes]);

      console.log(
        `Dashboard loaded: ${totalUsers} users, ${totalOrganisations} orgs, ${totalEvents} events`
      );
      setLastRefresh(new Date());

      // Complete the loading
      if (isInitialLoad) {
        setLoadingProgress(100);
        setLoadingMessage("Dashboard ready!");
        // Small delay to show 100% before hiding
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: "Data Load Failed",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
      setIsInitialLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      // Clear cache to force fresh data
      pipedriveService.clearCache();
      const isConnected = await testPipedriveConnection();
      await loadDashboardData(isConnected);

      toast({
        title: "Data Refreshed",
        description: "Dashboard data has been successfully refreshed.",
      });
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = async () => {
    setShowDiagnostics(true);
    try {
      console.log("Running Pipedrive diagnostics...");

      // Run health check
      const healthCheck = await pipedriveService.healthCheck();
      console.log("Health check results:", healthCheck);

      // Run connection test
      const connectionTest = await pipedriveService.testConnection();
      console.log("Connection test result:", connectionTest);

      const results = {
        healthCheck,
        connectionTest,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      setDiagnosticResults(results);

      toast({
        title: "Diagnostics Complete",
        description: "Check the diagnostic panel below for details.",
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      setDiagnosticResults({
        error: error instanceof Error ? error.message : "Diagnostic failed",
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Diagnostic Failed",
        description:
          "Unable to run diagnostics. Check browser console for details.",
        variant: "destructive",
      });
    }
  };

  // Connection status indicator
  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pipedrive Offline
          </Badge>
        );
      case "checking":
        return (
          <Badge variant="secondary">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "Run Site Search":
        return <Search className="w-4 h-4" />;
      case "Download From URL":
        return <Download className="w-4 h-4" />;
      case "Create Export":
        return <BarChart3 className="w-4 h-4" />;
      case "GeoInsights Explore":
        return <Eye className="w-4 h-4" />;
      case "GeoInsights Compare":
        return <Eye className="w-4 h-4" />;
      case "Instant Report":
        return <Activity className="w-4 h-4" />;
      case "Apply Scoreset":
        return <Target className="w-4 h-4" />;
      case "Create Shortlist":
        return <ListPlus className="w-4 h-4" />;
      case "Create Scenario Plan":
        return <MapPin className="w-4 h-4" />;
      case "Create Shortlist From Shortlist":
        return <Copy className="w-4 h-4" />;
      case "Shortlist Creation Error":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatDateAdded = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  if (isInitialLoad) {
    return (
      <div className="h-full w-full p-4 bg-gray-50 overflow-auto flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="p-8">
            <div className="space-y-6">
              {/* Animated Logo/Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Loading Land iQ Dashboard
                </h2>
                <p className="text-gray-600 text-sm">{loadingMessage}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={loadingProgress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{loadingProgress}%</span>
                </div>
              </div>

              {/* Loading Steps */}
              <div className="space-y-3">
                <LoadingStep
                  completed={loadingProgress > 0}
                  active={loadingProgress >= 0 && loadingProgress < 20}
                  text="Checking Pipedrive connection"
                />
                <LoadingStep
                  completed={loadingProgress > 20}
                  active={loadingProgress >= 20 && loadingProgress < 40}
                  text="Extracting customer mappings"
                />
                <LoadingStep
                  completed={loadingProgress > 50}
                  active={loadingProgress >= 40 && loadingProgress < 60}
                  text="Loading usage data"
                />
                <LoadingStep
                  completed={loadingProgress > 60}
                  active={loadingProgress >= 60 && loadingProgress < 80}
                  text="Fetching organisation data"
                />
                <LoadingStep
                  completed={loadingProgress > 80}
                  active={loadingProgress >= 80 && loadingProgress < 100}
                  text="Analysing and processing"
                />
              </div>

              {/* Fun fact or tip */}
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Did you know?</p>
                <p className="text-xs">
                  This dashboard analyses over{" "}
                  {totalStats.totalEvents > 0
                    ? totalStats.totalEvents.toLocaleString()
                    : "20,000"}{" "}
                  user events to provide insights into Land iQ usage patterns
                  across organisations.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading && organisations.length === 0) {
    return (
      <div className="h-full w-full p-4 bg-gray-50 overflow-auto">
        <div className="mb-4">
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-3 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3">
              <CardContent className="p-0">
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-3">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Land iQ - Usage Dashboard
            </h1>
            <p className="text-gray-600 text-sm">
              User activity by organisation with Land iQ usage analytics
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {latestEventDate
                ? `Event data as at ${latestEventDate.toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}`
                : "Event data"}
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-wrap">
            {getConnectionStatusBadge()}

            <div className="flex items-center space-x-1">
              <Button
                onClick={() =>
                  setViewMode(viewMode === "summary" ? "detailed" : "summary")
                }
                variant="outline"
                size="sm"
              >
                {viewMode === "summary" ? "Show Details" : "Show Summary"}
              </Button>

              {organisations.length > 0 && (
                <Button onClick={toggleAllOrgs} variant="outline" size="sm">
                  {expandedOrgs.size === organisations.length
                    ? "Collapse All"
                    : "Expand All"}
                </Button>
              )}
            </div>

            {connectionStatus === "disconnected" && (
              <Button
                onClick={runDiagnostics}
                variant="outline"
                size="sm"
                className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Diagnose Issue
              </Button>
            )}

            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Last refresh info */}
        {lastRefresh && (
          <p className="text-xs text-gray-500">
            Last refreshed: {lastRefresh.toLocaleString("en-GB")}
          </p>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{totalStats.totalUsers}</p>
                <p className="text-xs text-gray-600">Total Users</p>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">
                  {totalStats.totalOrganisations}
                </p>
                <p className="text-xs text-gray-600">Organisations</p>
              </div>
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">
                  {totalStats.totalEvents.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">Total Events</p>
              </div>
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold truncate">
                  {totalStats.topEventType}
                </p>
                <p className="text-xs text-gray-600">Top Event Type</p>
              </div>
              {getEventIcon(totalStats.topEventType)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Panel */}
      {showDiagnostics && (
        <Card className="mb-4 p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-800">
              Pipedrive Connection Diagnostics
            </h3>
            <Button
              onClick={() => setShowDiagnostics(false)}
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-800"
            >
              ×
            </Button>
          </div>

          {diagnosticResults ? (
            <div className="space-y-4">
              {diagnosticResults.error ? (
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-red-800 font-medium">Diagnostic Error:</p>
                  <p className="text-red-700 text-sm">
                    {diagnosticResults.error}
                  </p>
                </div>
              ) : (
                <>
                  {/* Health Check Results */}
                  <div className="bg-white rounded border p-3">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Configuration Check:
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          API Key Configured:
                        </span>
                        <span
                          className={`ml-2 font-medium ${
                            diagnosticResults.healthCheck?.config?.hasApiKey
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {diagnosticResults.healthCheck?.config?.hasApiKey
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">API Key Length:</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {diagnosticResults.healthCheck?.config
                            ?.apiKeyLength || 0}{" "}
                          characters
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Domain:</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {diagnosticResults.healthCheck?.config?.domain}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Environment:</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {diagnosticResults.healthCheck?.config?.nodeEnv}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connection Test Results */}
                  <div className="bg-white rounded border p-3">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Connection Test:
                    </h4>
                    <div className="text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`ml-2 font-medium ${
                          diagnosticResults.connectionTest
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {diagnosticResults.connectionTest
                          ? "Connected"
                          : "Failed"}
                      </span>
                    </div>
                  </div>

                  {/* Troubleshooting Guide */}
                  {!diagnosticResults.healthCheck?.config?.hasApiKey && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        🔧 How to Fix:
                      </h4>
                      <div className="text-yellow-700 text-sm space-y-2">
                        <p>
                          <strong>1. Get your Pipedrive API Key:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Log into your Pipedrive account</li>
                          <li>Go to Settings → Personal → API</li>
                          <li>Copy your API token</li>
                        </ul>
                        <p>
                          <strong>2. Set Environment Variable:</strong>
                        </p>
                        <p className="font-mono bg-yellow-200 p-1 rounded">
                          PIPEDRIVE_API_KEY=your_api_token_here
                        </p>
                        <p>
                          <strong>3. For Vercel deployment:</strong>
                        </p>
                        <p className="font-mono bg-yellow-200 p-1 rounded">
                          vercel env add PIPEDRIVE_API_KEY
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Diagnostic run at:{" "}
                    {new Date(diagnosticResults.timestamp).toLocaleString()}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
              <p className="text-orange-700">Running diagnostics...</p>
            </div>
          )}
        </Card>
      )}

      {/* Chart Section */}
      <Card className="mb-4 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Title + collapse toggle */}
          <div
            className="flex items-center space-x-1 cursor-pointer select-none"
            onClick={() => setChartCollapsed(!chartCollapsed)}
          >
            {chartCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
            <h2 className="text-lg font-semibold">
              Events by{" "}
              {chartViewMode === "job-title"
                ? "Job Title Category"
                : "Organisation (by Customer Type)"}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {/* Chart View Mode Toggle */}
            <div className="flex items-center space-x-1 border border-gray-300 rounded p-1">
              <button
                onClick={() => setChartViewMode("customer-type")}
                className={`px-2 py-1 text-xs rounded ${
                  chartViewMode === "customer-type"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Group by customer type"
              >
                Customer Type
              </button>
              <button
                onClick={() => setChartViewMode("job-title")}
                className={`px-2 py-1 text-xs rounded ${
                  chartViewMode === "job-title"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Group by job title category"
              >
                Job Title
              </button>
            </div>

            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              title="Filter events by type"
            >
              {availableEventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!chartCollapsed && (
          <>
            {/* Dynamic Legend */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {chartViewMode === "job-title"
                  ? "Job Title Categories:"
                  : "Customer Types:"}
              </h3>
              <div className="flex flex-wrap gap-3 text-xs">
                {chartViewMode === "job-title"
                  ? // Job Title Categories Legend
                    Object.entries(JOB_TITLE_CATEGORIES).map(
                      ([categoryKey, category]) => (
                        <div
                          key={categoryKey}
                          className="flex items-center space-x-1"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-gray-700">{category.name}</span>
                        </div>
                      )
                    )
                  : // Customer Types Legend
                    Object.entries({
                      Trial: "#f59e0b",
                      "Centrally Funded Licence": "#1e3a8a",
                      "Paid Subscription": "#16a34a",
                      "Access Revoked": "#dc2626",
                    }).map(([customerType, color]) => (
                      <div
                        key={customerType}
                        className="flex items-center space-x-1"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-gray-700">{customerType}</span>
                      </div>
                    ))}
              </div>
            </div>

            {/* Segmented Bar Chart */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(chartViewMode === "job-title"
                ? getJobTitleChartData()
                : getChartData()
              ).map((item, index) => {
                const currentData =
                  chartViewMode === "job-title"
                    ? getJobTitleChartData()
                    : getChartData();
                const maxValue = Math.max(...currentData.map((d) => d.value));
                const barWidth =
                  maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                return (
                  <div key={item.fullName} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-48 text-xs truncate text-right"
                        title={item.fullName}
                      >
                        {item.fullName}
                      </div>
                      <div className="flex-1 relative">
                        <div className="w-full bg-gray-200 rounded-full h-6 relative flex overflow-hidden">
                          {item.segments.map((segment, segmentIndex) => {
                            const segmentWidth =
                              (segment.count / item.value) * barWidth;
                            return (
                              <div
                                key={segment.customerType}
                                className="h-6 flex items-center justify-center transition-all duration-300"
                                style={{
                                  width: `${segmentWidth}%`,
                                  backgroundColor: getCurrentChartColor(
                                    segment.customerType
                                  ),
                                  borderRadius:
                                    segmentIndex === 0
                                      ? "9999px 0 0 9999px"
                                      : segmentIndex ===
                                        item.segments.length - 1
                                      ? "0 9999px 9999px 0"
                                      : "0",
                                }}
                                title={`${
                                  segment.customerType
                                }: ${segment.count.toLocaleString()} events (${segment.percentage.toFixed(
                                  1
                                )}%)`}
                              >
                                {segmentWidth > 8 && (
                                  <span
                                    className={`${
                                      (chartViewMode === "customer-type" &&
                                        segment.customerType === "Trial") ||
                                      (chartViewMode === "job-title" &&
                                        getCurrentChartColor(
                                          segment.customerType
                                        ) === "#F59E0B")
                                        ? "text-black"
                                        : "text-white"
                                    } text-xs font-medium px-1 truncate`}
                                  >
                                    {segment.count.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {barWidth < 100 && (
                            <div
                              className="h-6 bg-gray-200"
                              style={{ width: `${100 - barWidth}%` }}
                            />
                          )}
                        </div>
                        <div className="absolute right-2 top-0 h-6 flex items-center">
                          <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-1 rounded">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-xs text-gray-600 text-center">
                        {item.userCount} users
                      </div>
                    </div>

                    {/* Per-organisation legend removed – details available in tooltip */}
                  </div>
                );
              })}
              {(chartViewMode === "job-title"
                ? getJobTitleChartData()
                : getChartData()
              ).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No data available for "{selectedEventFilter}"
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Time-series analytics */}
      <TimeSeriesSection eventFilter={selectedEventFilter} />

      {/* Organisations */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {organisations.map((org, index) => {
          const isExpanded = expandedOrgs.has(org.name);
          const showDetails = viewMode === "detailed" || isExpanded;

          return (
            <Card key={org.name} className="p-2">
              {/* Organisation Header - Always Visible */}
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => toggleOrgExpansion(org.name)}
              >
                <div className="flex items-center space-x-2 flex-1">
                  {showDetails ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{org.name}</h3>
                    {!showDetails && (
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <span>{org.userCount} users</span>
                        <span>{org.totalEvents.toLocaleString()} events</span>
                        <span>Top: {org.topEvents[0]?.event || "None"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {org.userCount} user{org.userCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {org.totalEvents.toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Expandable Content */}
              {showDetails && (
                <div className="px-6 pb-2 space-y-3">
                  {/* Top Events */}
                  <div>
                    <h4 className="font-medium mb-1 text-xs text-gray-700">
                      Top Activities
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {org.topEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={event.event}
                          className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1"
                        >
                          {getEventIcon(event.event)}
                          <span className="text-xs">{event.event}</span>
                          <Badge
                            variant="secondary"
                            className="ml-1 text-xs px-1"
                          >
                            {event.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Users Summary */}
                  <div>
                    <h4 className="font-medium mb-1 text-xs text-gray-700">
                      Users{" "}
                      {org.users.length > 5 &&
                        `(showing top 5 of ${org.users.length})`}
                    </h4>
                    <div className="space-y-1">
                      {org.users.slice(0, 5).map((user) => (
                        <div
                          key={user.email}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-gray-600 truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                              {user.dateAdded && (
                                <span>
                                  Added: {formatDateAdded(user.dateAdded)}
                                </span>
                              )}
                              {user.daysInLandIQ !== undefined && (
                                <span>{user.daysInLandIQ} days in Land iQ</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="font-medium">
                              {user.totalEvents}
                            </span>
                            <div className="flex gap-1">
                              {Object.entries(user.eventBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 1)
                                .map(([event, count]) => (
                                  <div
                                    key={event}
                                    className="flex items-center space-x-1 bg-white rounded px-1"
                                  >
                                    {getEventIcon(event)}
                                    <span>{count}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {org.users.length > 5 && (
                        <p className="text-xs text-gray-600 text-center py-1">
                          ... and {org.users.length - 5} more users
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LoadingStep({
  completed,
  active,
  text,
}: {
  completed: boolean;
  active: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center space-x-3">
      <div
        className={`
        w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
        ${completed ? "bg-green-500" : active ? "bg-blue-500" : "bg-gray-300"}
      `}
      >
        {completed ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : active ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </div>
      <span
        className={`
        text-sm transition-all duration-300
        ${
          completed
            ? "text-green-700 font-medium"
            : active
            ? "text-blue-700 font-medium"
            : "text-gray-500"
        }
      `}
      >
        {text}
      </span>
    </div>
  );
}
