"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  Bar,
} from "recharts";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  categorizeJobTitleEnhanced,
  getCategoryColor,
  JOB_TITLE_CATEGORIES,
} from "@/lib/job-title-categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { fetchGiraffeUsageData } from "@/lib/giraffe-usage-service";
import SupportAnalyticsChart from "@/components/analytics/charts/SupportAnalyticsChart";
import OrganisationRecencyBoxplot from "@/components/analytics/charts/OrganisationRecencyBoxplot";
import {
  fetchAnalyticsEvents,
  processAnalyticsEventsByDay,
  DailyAnalyticsEvents,
} from "@/lib/analytics-events-service";

interface DailyCount {
  date: string; // yyyy-mm-dd
  count: number;
}

interface CombinedTimelinePoint {
  date: string;
  events: number;
  activities: number;
}

// Primary path to the Land iQ events CSV (without date prefix). If the file isn't
// found (older deployments), the code that fetches it can still fall back.
const CSV_URL = "/landiQSDKeventsDate.csv";

interface TimeSeriesSectionProps {
  eventFilter: string; // e.g. "All Events" or specific display label
}

export default function TimeSeriesSection({
  eventFilter,
}: TimeSeriesSectionProps) {
  /* UI collapse controls */
  const [trendCollapsed, setTrendCollapsed] = useState(false);
  const [typeCollapsed, setTypeCollapsed] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false); // now job title timeline
  const [orgEventsCollapsed, setOrgEventsCollapsed] = useState(false); // new org events chart

  /* Data */
  const [dailyEvents, setDailyEvents] = useState<DailyCount[]>([]);
  const [eventTypeSeries, setEventTypeSeries] = useState<any[]>([]);
  const [jobTitleSeries, setJobTitleSeries] = useState<any[]>([]);
  const [jobTitleKeys, setJobTitleKeys] = useState<string[]>([]);
  const [combinedTimeline, setCombinedTimeline] = useState<
    CombinedTimelinePoint[]
  >([]);

  // New state for job title category filter
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>("all");
  const [allJobTitleSeries, setAllJobTitleSeries] = useState<any[]>([]);
  const [allJobTitleKeys, setAllJobTitleKeys] = useState<string[]>([]);

  // New state for organization events
  const [organizationData, setOrganizationData] = useState<
    Map<string, Map<string, number>>
  >(new Map());
  const [availableOrganizations, setAvailableOrganizations] = useState<
    string[]
  >([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>(
    []
  );
  const [organizationEventSeries, setOrganizationEventSeries] = useState<any[]>(
    []
  );
  const [showAverage, setShowAverage] = useState(true);
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);
  const [giraffeActive, setGiraffeActive] = useState<Record<string, number>>(
    {}
  );
  const [analyticsEvents, setAnalyticsEvents] = useState<
    DailyAnalyticsEvents[]
  >([]);
  const [showChart, setShowChart] = useState(true);

  // Helper: safely extract the primary email string from a Pipedrive person record
  const extractPrimaryEmail = (person: any): string => {
    if (!person) return "";

    // First try direct string fields (matching PipedriveTab approach)
    if (typeof person.email === "string" && person.email) {
      return person.email;
    }
    if (typeof person.primary_email === "string" && person.primary_email) {
      return person.primary_email;
    }

    // Then try complex structures
    let emailField: any = person.email ?? person.primary_email ?? "";

    // Handle array response (common structure from Pipedrive API)
    if (Array.isArray(emailField)) {
      const first = emailField[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        return (first.value || first.email || "") as string;
      }
      return "";
    }

    // Handle object response (edge-case)
    if (typeof emailField === "object" && emailField !== null) {
      return (emailField.value || emailField.email || "") as string;
    }

    // Primitive string fallback
    return typeof emailField === "string" ? emailField : "";
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter]);

  const loadData = async () => {
    // Load Land iQ CSV
    try {
      let csvResp = await fetch(CSV_URL);
      if (!csvResp.ok) {
        // Fallback to older dated filename used by previous deployments
        csvResp = await fetch("/20250725_landiQSDKeventsDate.csv");
      }

      const csvText = await csvResp.text();

      // Fetch Pipedrive persons for job titles mapping
      let persons: any[] = [];
      let organizations: any[] = [];
      try {
        persons = await pipedriveService.fetchPersons();
        organizations = await pipedriveService.fetchOrganisations();
      } catch (e) {
        console.warn("Failed to fetch persons/organizations for job titles", e);
      }

      const emailToCategory = new Map<string, string>();
      const emailToJobTitle = new Map<string, string>();
      const emailToOrganization = new Map<string, string>();
      let unmatchedEmails = new Set<string>();

      // Debug: Log first few persons to see email structure
      console.log("Sample Pipedrive persons:", persons.slice(0, 3));

      // Create organization ID to name mapping
      const orgIdToName = new Map<number, string>();
      organizations.forEach((org) => {
        if (org.id && org.name) {
          orgIdToName.set(org.id, org.name);
        }
      });

      persons.forEach((p) => {
        const email = extractPrimaryEmail(p).toLowerCase().trim();
        const jobTitle = p.job_title || "";
        const category = categorizeJobTitleEnhanced(jobTitle);

        if (email) {
          emailToCategory.set(email, category);
          emailToJobTitle.set(email, jobTitle);

          // Map email to organization
          if (p.org_id && orgIdToName.has(p.org_id)) {
            emailToOrganization.set(email, orgIdToName.get(p.org_id)!);
          } else if (p.org_name) {
            emailToOrganization.set(email, p.org_name);
          }
        }
      });

      console.log(`Loaded ${persons.length} persons from Pipedrive`);
      console.log(`Email to category mappings: ${emailToCategory.size}`);
      console.log(
        `Email to organization mappings: ${emailToOrganization.size}`
      );

      processCsv(
        csvText,
        emailToCategory,
        emailToJobTitle,
        emailToOrganization,
        unmatchedEmails
      );

      // Log unmatched emails for debugging
      if (unmatchedEmails.size > 0) {
        console.log(`Found ${unmatchedEmails.size} unmatched emails in CSV`);
        console.log(
          "Sample unmatched emails:",
          Array.from(unmatchedEmails).slice(0, 10)
        );
      }
    } catch (err) {
      console.error("Failed to load CSV for time-series charts", err);
    }

    /* NEW: fetch Giraffe usage CSV for overlay */
    try {
      const giraffeData = await fetchGiraffeUsageData();
      setGiraffeActive(giraffeData.activeCounts);
    } catch (err) {
      console.warn("Could not load Giraffe usage data for overlay", err);
    }

    /* NEW: fetch Land iQ Plus analytics events */
    try {
      console.log("📊 Fetching Land iQ Plus analytics events...");
      const analyticsEventsData = await fetchAnalyticsEvents(90); // Last 90 days
      const dailyAnalyticsEvents =
        processAnalyticsEventsByDay(analyticsEventsData);
      setAnalyticsEvents(dailyAnalyticsEvents);
      console.log(
        `✅ Loaded ${analyticsEventsData.length} analytics events across ${dailyAnalyticsEvents.length} days`
      );
    } catch (err) {
      console.warn("Could not load analytics events data", err);
    }

    // Fetch Pipedrive activities (client-side safe)
    try {
      const activities = await pipedriveService.fetchActivities();
      processActivities(activities);
    } catch (err) {
      console.error("Failed to fetch activities for time-series charts", err);
    }
  };

  /* ---------------- CSV PARSING ---------------- */
  const processCsv = (
    csvText: string,
    emailCategoryMap: Map<string, string>,
    emailToJobTitle: Map<string, string>,
    emailToOrganization: Map<string, string>,
    unmatchedEmails: Set<string>
  ) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;

    const dailyCountsOverall = new Map<string, number>(); // counts of all events
    const dailyCountsFiltered = new Map<string, number>(); // counts of selected event (if filter active)
    const eventTypeDateCounts = new Map<string, Map<string, number>>();
    const jobTitleDateCounts = new Map<string, Map<string, number>>();
    const organizationDateCounts = new Map<string, Map<string, number>>(); // New: org -> date -> count

    // Track category distribution for debugging
    const categoryDistribution = new Map<string, number>();
    const organizationSet = new Set<string>(); // Track unique organizations

    for (let i = 1; i < lines.length; i++) {
      const [
        id,
        timestamp,
        rawEventName /* may have more fields */,
        userEmail,
      ] = lines[i].split(",");
      if (!timestamp || !rawEventName) continue;

      const eventName = mapEventNameToDisplayLabel(rawEventName.trim());

      // Apply event filter if not "All Events"
      if (
        eventFilter &&
        eventFilter !== "All Events" &&
        eventName !== eventFilter
      ) {
        continue;
      }

      // Convert d/m/yyyy -> yyyy-mm-dd
      const [d, m, y] = timestamp.trim().split("/");
      if (!(d && m && y)) continue;

      const dateKey = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

      // Skip weekends to keep charts tidy
      if (isWeekend(dateKey)) {
        // still need eventType counts for other charts? we can ignore weekend entirely.
        continue;
      }

      // update overall counts (regardless of filter)
      dailyCountsOverall.set(
        dateKey,
        (dailyCountsOverall.get(dateKey) || 0) + 1
      );

      // update filtered counts if applicable
      if (
        eventFilter &&
        eventFilter !== "All Events" &&
        eventName === eventFilter
      ) {
        dailyCountsFiltered.set(
          dateKey,
          (dailyCountsFiltered.get(dateKey) || 0) + 1
        );
      }

      if (!eventTypeDateCounts.has(eventName)) {
        eventTypeDateCounts.set(eventName, new Map());
      }
      const typeMap = eventTypeDateCounts.get(eventName)!;
      typeMap.set(dateKey, (typeMap.get(dateKey) || 0) + 1);

      // job title aggregation (overall, regardless of filter on chart 2 requirement but respects eventFilter)
      const emailLower = (userEmail || "").toLowerCase().trim();
      const category = emailCategoryMap.get(emailLower) || "Other";

      // Track unmatched emails
      if (
        category === "Other" &&
        emailLower &&
        !emailCategoryMap.has(emailLower)
      ) {
        unmatchedEmails.add(emailLower);
      }

      // Update category distribution for debugging
      categoryDistribution.set(
        category,
        (categoryDistribution.get(category) || 0) + 1
      );

      if (!jobTitleDateCounts.has(category))
        jobTitleDateCounts.set(category, new Map());
      const jtMap = jobTitleDateCounts.get(category)!;
      jtMap.set(dateKey, (jtMap.get(dateKey) || 0) + 1);

      // Organization aggregation
      const organization =
        emailToOrganization.get(emailLower) || "Unknown Organization";
      organizationSet.add(organization);

      if (!organizationDateCounts.has(organization)) {
        organizationDateCounts.set(organization, new Map());
      }
      const orgMap = organizationDateCounts.get(organization)!;
      orgMap.set(dateKey, (orgMap.get(dateKey) || 0) + 1);
    }

    // Log category distribution for debugging
    console.log("Job Title Category Distribution:");
    Array.from(categoryDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} events`);
      });

    const sortedDates = Array.from(
      eventFilter && eventFilter !== "All Events"
        ? new Set([...dailyCountsOverall.keys(), ...dailyCountsFiltered.keys()])
        : dailyCountsOverall.keys()
    ).sort();

    // Daily events trend (chart 1)
    const sourceMap =
      eventFilter && eventFilter !== "All Events"
        ? dailyCountsFiltered
        : dailyCountsOverall;

    setDailyEvents(
      sortedDates.map((date) => ({ date, count: sourceMap.get(date) || 0 }))
    );

    // Event-type breakdown (chart 2)
    // Determine top 5 event types by total count (always overall)
    const topTypes: string[] = Array.from(eventTypeDateCounts.entries())
      .sort((a, b) => totalOfMap(b[1]) - totalOfMap(a[1]))
      .slice(0, 5)
      .map(([type]) => type);

    const stackedData = sortedDates.map((date) => {
      const obj: any = { date };
      topTypes.forEach((type) => {
        obj[type] = eventTypeDateCounts.get(type)?.get(date) || 0;
      });
      return obj;
    });

    setEventTypeSeries(stackedData);

    // Build job title stacked data
    // 1. Sort categories by total count (desc)
    const sortedJT = Array.from(jobTitleDateCounts.entries()).sort(
      (a, b) => totalOfMap(b[1]) - totalOfMap(a[1])
    );

    // 2. Take top 5 NON-"Other" categories to keep chart informative
    const primaryJT = sortedJT
      .filter(([cat]) => cat !== "Other")
      .slice(0, 5)
      .map(([cat]) => cat);

    // 3. Always include "Other" (if present) as the last stack so it doesn't hide others
    const hasOther = jobTitleDateCounts.has("Other");
    const topJT = hasOther ? [...primaryJT, "Other"] : primaryJT;

    const jtStacked = sortedDates.map((date) => {
      const o: any = { date };
      topJT.forEach((cat) => {
        o[cat] = jobTitleDateCounts.get(cat)?.get(date) || 0;
      });
      return o;
    });

    // Store all data for filtering
    setAllJobTitleSeries(jtStacked);
    setAllJobTitleKeys(topJT);

    // Apply filter if needed
    applyJobCategoryFilter(jtStacked, topJT, selectedJobCategory);

    // Process organization data
    setOrganizationData(organizationDateCounts);

    // Get sorted list of organizations by total events
    const sortedOrgs = Array.from(organizationDateCounts.entries())
      .sort((a, b) => totalOfMap(b[1]) - totalOfMap(a[1]))
      .map(([org]) => org);

    setAvailableOrganizations(sortedOrgs);

    // Select top 5 organizations by default
    const defaultSelectedOrgs = sortedOrgs.slice(0, 5);
    setSelectedOrganizations(defaultSelectedOrgs);

    // Build initial organization series
    updateOrganizationSeries(
      organizationDateCounts,
      defaultSelectedOrgs,
      sortedDates,
      true
    );

    // We will merge with activities once activities arrive
    setCombinedTimeline((prev) =>
      mergeTimeline(prev, sortedDates, dailyCountsOverall, null)
    );
  };

  /* ---------------- FILTERING ---------------- */
  const applyJobCategoryFilter = (
    data: any[],
    keys: string[],
    filter: string
  ) => {
    if (filter === "all") {
      setJobTitleSeries(data);
      setJobTitleKeys(keys);
    } else {
      // Filter to show only the selected category
      const filteredKeys = keys.filter((key) => key === filter);
      const filteredData = data.map((point) => {
        const filtered: any = { date: point.date };
        filteredKeys.forEach((key) => {
          filtered[key] = point[key] || 0;
        });
        return filtered;
      });
      setJobTitleSeries(filteredData);
      setJobTitleKeys(filteredKeys);
    }
  };

  // Effect to reapply filter when selection changes
  useEffect(() => {
    if (allJobTitleSeries.length > 0) {
      applyJobCategoryFilter(
        allJobTitleSeries,
        allJobTitleKeys,
        selectedJobCategory
      );
    }
  }, [selectedJobCategory, allJobTitleSeries, allJobTitleKeys]);

  // Effect to update organization chart when selection changes
  useEffect(() => {
    if (organizationData.size > 0) {
      const sortedDates = Array.from(
        new Set(
          Array.from(organizationData.values()).flatMap((map) =>
            Array.from(map.keys())
          )
        )
      ).sort();

      updateOrganizationSeries(
        organizationData,
        selectedOrganizations,
        sortedDates,
        showAverage
      );
    }
  }, [selectedOrganizations, showAverage, organizationData]);

  /* ---------------- ORGANIZATION SERIES UPDATE ---------------- */
  const updateOrganizationSeries = (
    orgData: Map<string, Map<string, number>>,
    selectedOrgs: string[],
    dates: string[],
    includeAverage: boolean
  ) => {
    const seriesData = dates.map((date) => {
      const point: any = { date };

      // Calculate values for selected organizations
      selectedOrgs.forEach((org) => {
        const value = orgData.get(org)?.get(date) || 0;
        point[org] = value;
      });

      // Calculate average across ALL organizations (unfiltered)
      if (includeAverage) {
        let totalAcrossAllOrgs = 0;
        let countOfOrgsWithData = 0;

        // Iterate through ALL organizations in the data
        orgData.forEach((dateMap, orgName) => {
          const value = dateMap.get(date) || 0;
          if (value > 0) {
            totalAcrossAllOrgs += value;
            countOfOrgsWithData++;
          }
        });

        // Average = total events / number of organizations that had events on this date
        point["Average"] =
          countOfOrgsWithData > 0
            ? totalAcrossAllOrgs / countOfOrgsWithData
            : 0;
      }

      return point;
    });

    setOrganizationEventSeries(seriesData);
  };

  /* ---------------- ACTIVITIES ---------------- */
  const processActivities = (activities: any[]) => {
    const dailyAct = new Map<string, number>();
    const typeDateCounts = new Map<string, Map<string, number>>();

    activities.forEach((act) => {
      const date = act.add_time.split(" ")[0]; // yyyy-mm-dd

      if (isWeekend(date)) return; // Ignore weekend activities

      dailyAct.set(date, (dailyAct.get(date) || 0) + 1);

      const type = act.type || "Other";
      if (!typeDateCounts.has(type)) typeDateCounts.set(type, new Map());
      const map = typeDateCounts.get(type)!;
      map.set(date, (map.get(date) || 0) + 1);
    });

    // Combined timeline (chart 3)
    const combined = mergeTimeline(
      null,
      Array.from(dailyAct.keys()),
      null,
      dailyAct
    );
    setCombinedTimeline((prev) =>
      mergeTimeline(prev, Array.from(dailyAct.keys()), null, dailyAct)
    );
  };

  /* ---------------- UTIL ---------------- */
  const totalOfMap = (m: Map<any, number>) =>
    Array.from(m.values()).reduce((s, v) => s + v, 0);

  const mergeTimeline = (
    existing: CombinedTimelinePoint[] | null,
    dates: string[],
    eventMap: Map<string, number> | null,
    actMap: Map<string, number> | null
  ) => {
    const byDate: Record<string, CombinedTimelinePoint> = {};
    existing?.forEach((p) => (byDate[p.date] = { ...p }));

    dates.forEach((d) => {
      if (!byDate[d]) byDate[d] = { date: d, events: 0, activities: 0 };
      if (eventMap) byDate[d].events = eventMap.get(d) || 0;
      if (actMap) byDate[d].activities = actMap.get(d) || 0;
    });

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Helper: check if ISO date string (yyyy-mm-dd) is weekend
  const isWeekend = (isoDate: string): boolean => {
    const day = new Date(isoDate).getDay(); // 0 = Sunday, 6 = Saturday (local tz)
    return day === 0 || day === 6;
  };

  const mapEventNameToDisplayLabel = (raw: string) => {
    const mapping: Record<string, string> = {
      site_search_run: "Run Site Search",
      geoinsight_explore_query: "GeoInsights Explore",
      geoinsight_compare_query: "GeoInsights Compare",
      downloadFromUrl: "Download From URL",
      shortlist_create: "Create Shortlist",
      export_create: "Create Export",
      instant_report_create: "Instant Report",
      scenario_plan_created: "Create Scenario Plan",
      apply_scoresets: "Apply Scoresets",
      shortlist_create_from_shortlist: "Shortlist From Shortlist",
      shortlist_create_error: "Shortlist Error",
    };
    return mapping[raw] || raw;
  };

  // Format ISO date (yyyy-mm-dd) -> "7 June 2025"
  const formatDateLabel = (isoDate: string): string => {
    const date = new Date(isoDate + "T00:00:00"); // avoid timezone offset issues
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Custom tooltip content component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {formatDateLabel(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  /* ---------------- RENDER ---------------- */
  // Build combined trend dataset (Land iQ events + Giraffe active users + Analytics events)
  const combinedTrend = React.useMemo(() => {
    const mapEvents = new Map(dailyEvents.map((d) => [d.date, d.count]));
    const mapAnalyticsEvents = new Map(
      analyticsEvents.map((d) => [d.date, d.count])
    );
    const dates = Array.from(
      new Set([
        ...dailyEvents.map((d) => d.date),
        ...analyticsEvents.map((d) => d.date),
        ...Object.keys(giraffeActive),
      ])
    ).sort();

    let lastActive = 0;
    return dates.map((date) => {
      if (giraffeActive[date] !== undefined) {
        lastActive = giraffeActive[date];
      }
      return {
        date,
        events: mapEvents.get(date) || 0,
        analyticsEvents: mapAnalyticsEvents.get(date) || 0,
        active: lastActive,
      };
    });
  }, [dailyEvents, analyticsEvents, giraffeActive]);

  return (
    <>
      {/* 1. Land iQ Usage Trend */}
      <Card className="mb-4 p-4">
        <div
          className="flex items-center space-x-1 cursor-pointer select-none mb-4"
          onClick={() => setTrendCollapsed(!trendCollapsed)}
        >
          {trendCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold">
            Land iQ - Project Management Events per Day
          </h2>
        </div>
        {!trendCollapsed && (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedTrend}
                margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <RechartsTooltip content={<CustomTooltip />} />
                <RechartsLegend
                  formatter={(value: string) =>
                    value === "Giraffe Active Users" ? (
                      <span title="Number of users whose Last-Seen date in this snapshot is later than in the previous snapshot (i.e. newly active since last capture).">
                        {value}
                      </span>
                    ) : (
                      value
                    )
                  }
                />
                <Line
                  type="monotone"
                  dataKey="events"
                  stroke="#1d4ed8"
                  name="Land iQ Events"
                />
                <Line
                  type="monotone"
                  dataKey="analyticsEvents"
                  stroke="#16a34a"
                  name="Land iQ Plus Events"
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="#f97316"
                  name="Giraffe Active Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 2. Event-type Breakdown */}
      <Card className="mb-4 p-4">
        <div
          className="flex items-center space-x-1 cursor-pointer select-none mb-4"
          onClick={() => setTypeCollapsed(!typeCollapsed)}
        >
          {typeCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold">Top Event Types over Time</h2>
        </div>
        {!typeCollapsed && (
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={eventTypeSeries}
                margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <RechartsTooltip content={<CustomTooltip />} />
                <RechartsLegend />
                {eventTypeSeries.length > 0 &&
                  Object.keys(eventTypeSeries[0])
                    .filter((k) => k !== "date")
                    .map((key, idx) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        stroke={
                          [
                            "#1d4ed8",
                            "#16a34a",
                            "#f59e0b",
                            "#dc2626",
                            "#7c3aed",
                          ][idx % 5]
                        }
                        fill={
                          [
                            "#1d4ed833",
                            "#16a34a33",
                            "#f59e0b33",
                            "#dc262633",
                            "#7c3aed33",
                          ][idx % 5]
                        }
                        name={key}
                      />
                    ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 3. Events by Job Title over Time */}
      <Card className="mb-4 p-4">
        <div
          className="flex items-center space-x-1 cursor-pointer select-none mb-4"
          onClick={() => setTimelineCollapsed(!timelineCollapsed)}
        >
          {timelineCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold">
            Events by Job Title over Time
          </h2>
        </div>
        {!timelineCollapsed && (
          <>
            {/* Filter dropdown */}
            <div className="mb-4">
              <Select
                value={selectedJobCategory}
                onValueChange={setSelectedJobCategory}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a job category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(JOB_TITLE_CATEGORIES).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={jobTitleSeries}
                  margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <RechartsLegend />
                  {jobTitleKeys.map((key, idx) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={
                        getCategoryColor(key) ||
                        [
                          "#2563eb",
                          "#16a34a",
                          "#f59e0b",
                          "#dc2626",
                          "#7c3aed",
                          "#0ea5e9",
                        ][idx % 6]
                      }
                      fill={`${
                        getCategoryColor(key) ||
                        [
                          "#2563eb",
                          "#16a34a",
                          "#f59e0b",
                          "#dc2626",
                          "#7c3aed",
                          "#0ea5e9",
                        ][idx % 6]
                      }33`}
                      name={key}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* 4. Land iQ Events by Organisation */}
      <Card className="mb-4 p-4">
        <div
          className="flex items-center space-x-1 cursor-pointer select-none mb-4"
          onClick={() => setOrgEventsCollapsed(!orgEventsCollapsed)}
        >
          {orgEventsCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold">
            Land iQ Events by Organisation
          </h2>
        </div>
        {!orgEventsCollapsed && (
          <>
            {/* Multi-select and controls */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <Popover
                  open={multiSelectOpen}
                  onOpenChange={setMultiSelectOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between max-w-md"
                    >
                      <span className="truncate">
                        {selectedOrganizations.length === 0
                          ? "Select organisations"
                          : `${selectedOrganizations.length} organisation${
                              selectedOrganizations.length !== 1 ? "s" : ""
                            } selected`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full max-w-md p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search organisations..." />
                      <CommandEmpty>No organisation found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {availableOrganizations.map((org) => (
                          <CommandItem
                            key={org}
                            onSelect={() => {
                              setSelectedOrganizations((prev) =>
                                prev.includes(org)
                                  ? prev.filter((o) => o !== org)
                                  : [...prev, org]
                              );
                            }}
                          >
                            <Checkbox
                              checked={selectedOrganizations.includes(org)}
                              className="mr-2"
                            />
                            <span className="truncate">{org}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedOrganizations(availableOrganizations.slice(0, 5))
                  }
                >
                  Top 5
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrganizations([])}
                >
                  Clear
                </Button>

                <label className="flex items-center gap-2 ml-auto">
                  <Checkbox
                    checked={showAverage}
                    onCheckedChange={(checked) => setShowAverage(!!checked)}
                  />
                  <span className="text-sm">Show Average</span>
                </label>
              </div>

              {/* Selected organizations badges */}
              {selectedOrganizations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedOrganizations.map((org) => (
                    <Badge key={org} variant="secondary" className="pr-1">
                      <span className="truncate max-w-[200px]">{org}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() =>
                          setSelectedOrganizations((prev) =>
                            prev.filter((o) => o !== org)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={organizationEventSeries}
                  margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <RechartsLegend />
                  {selectedOrganizations.map((org, idx) => (
                    <Line
                      key={org}
                      type="monotone"
                      dataKey={org}
                      stroke={
                        [
                          "#3B82F6",
                          "#10B981",
                          "#F59E0B",
                          "#EF4444",
                          "#8B5CF6",
                          "#EC4899",
                          "#06B6D4",
                          "#84CC16",
                        ][idx % 8]
                      }
                      strokeWidth={2}
                      dot={false}
                      name={org}
                    />
                  ))}
                  {showAverage && selectedOrganizations.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="Average"
                      stroke="#6B7280"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Average"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
      <SupportAnalyticsChart selectedEventFilter={eventFilter} />
      <OrganisationRecencyBoxplot />
    </>
  );
}
