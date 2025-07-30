"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, Info } from "lucide-react";
import {
  fetchGiraffeUsageData,
  daysSinceLastSeen,
} from "@/lib/giraffe-usage-service";
import { pipedriveService } from "@/lib/pipedrive-service";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { EngagementTrajectoryChart } from "./EngagementTrajectoryChart";

interface OrgStats {
  org: string;
  g_med: number;
  l_med: number;
  users: number;
  giraffeUserDays: number[];
  landiqUserDays: number[];
}

const computeQuartiles = (
  arr: number[]
): [number, number, number, number, number] => {
  if (arr.length === 0) return [0, 0, 0, 0, 0];
  const sorted = [...arr].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
  return [sorted[0], q(0.25), q(0.5), q(0.75), sorted[sorted.length - 1]];
};

export default function OrganisationRecencyBoxplot() {
  const [data, setData] = useState<OrgStats[]>([]);
  const [filteredData, setFilteredData] = useState<OrgStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [availableCustomerTypes, setAvailableCustomerTypes] = useState<
    string[]
  >([]);
  const [excludedCustomerTypes, setExcludedCustomerTypes] = useState<
    Set<string>
  >(
    new Set([
      "Access Revoked",
      "Admin",
      "Contact Register",
      "Giraffe/WSP",
      "Land iQ Project Team",
      "Potential User",
    ])
  );
  const [rawData, setRawData] = useState<any>(null);
  const [availableOrganisations, setAvailableOrganisations] = useState<
    string[]
  >([]);
  const [selectedOrganisations, setSelectedOrganisations] = useState<
    Set<string>
  >(new Set());
  const [userPoints, setUserPoints] = useState<
    Array<{
      email: string;
      org: string;
      g_days: number;
      l_days: number;
      g_events: string[];
      l_events: string[];
    }>
  >([]);
  const [selectedStrategicCard, setSelectedStrategicCard] = useState<
    string | null
  >(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [giraffe, liqResp, persons, organisations] = await Promise.all([
          fetchGiraffeUsageData(),
          fetch("/landiQSDKeventsDate.csv"),
          pipedriveService.fetchPersons(),
          pipedriveService.fetchOrganisations(),
        ]);
        const liqCsv = await liqResp.text();
        const orgIdToName = new Map<number, string>();
        organisations.forEach((o: any) => {
          if (o.id && o.name) orgIdToName.set(o.id, o.name);
        });

        // Helper function to map customer type ID to human-readable label (same as PipedriveTab)
        const mapCustomerType = (customerTypeId?: string | number): string => {
          if (customerTypeId === undefined || customerTypeId === null) {
            return "Unknown Customer Type";
          }

          const idStr = String(customerTypeId);

          // Real Pipedrive customer type ID mappings (from console logs)
          const customerTypeMappings: Record<string, string> = {
            "48": "Centrally Funded Licence",
            "49": "2 Week Trial Licence",
            "50": "Access Revoked",
            "51": "Land iQ Project Team",
            "53": "Contact Register",
            "54": "Giraffe/WSP",
            "152": "Potential User",
            "156": "Trial Waitlist",
            "157": "Extended Trial Licence",
            "158": "Advocate",
            "160": "Admin",
            "214": "Expression of Interest",
            "252": "Paid Subscription",
          };

          return customerTypeMappings[idStr] || "Unknown Customer Type";
        };

        const emailToOrg = new Map<string, string>();
        const emailToCust = new Map<string, string>();
        const customerTypes = new Set<string>();

        persons.forEach((p: any) => {
          // Extract email (use primary_email like PipedriveTab)
          let email = "";
          if (p.primary_email && typeof p.primary_email === "string") {
            email = p.primary_email.toLowerCase();
          } else if (typeof p.email === "string") {
            email = p.email.toLowerCase();
          } else if (Array.isArray(p.email) && p.email.length) {
            email = (
              p.email[0]?.value ||
              p.email[0]?.email ||
              ""
            ).toLowerCase();
          }
          if (!email) return;

          const org =
            p.org_name || (p.org_id && orgIdToName.get(p.org_id)) || "Unknown";

          // Extract customer type from custom field (same as PipedriveTab)
          const customerTypeId = p["7faba81d32573b4aa224d4ffb56bb053587a1953"];
          let customerType = "";
          if (customerTypeId) {
            customerType = mapCustomerType(String(customerTypeId));
          }

          emailToOrg.set(email, org);
          emailToCust.set(email, customerType);

          if (customerType && customerType !== "Unknown Customer Type") {
            customerTypes.add(customerType);
          }
        });

        console.log("Found customer types:", Array.from(customerTypes)); // Debug log

        // Store raw data for filtering
        const rawDataObj = {
          giraffe: giraffe.users,
          liqCsv,
          emailToOrg,
          emailToCust,
        };
        setRawData(rawDataObj);

        // Calculate initial data with all users (keep for the first chart)
        const initialRows = calculateOrgStats(
          rawDataObj,
          "all",
          excludedCustomerTypes
        );
        setData(initialRows);
        setFilteredData(initialRows);

        // Calculate available organisations for the filter
        const orgs = new Set<string>();
        Object.values(giraffe.users).forEach((u: any) => {
          const org = emailToOrg.get(u.email) || "Unknown";
          if (org !== "Unknown") orgs.add(org);
        });
        setAvailableOrganisations(Array.from(orgs).sort());

        setAvailableCustomerTypes(Array.from(customerTypes).sort());
      } catch (err: any) {
        setError(err?.message || "Failed");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Recalculate data when filter changes
  useEffect(() => {
    if (!rawData) return;
    const filteredRows = calculateOrgStats(
      rawData,
      customerTypeFilter,
      excludedCustomerTypes
    );
    setFilteredData(filteredRows);

    // Calculate user points for scatter chart
    const points = calculateUserPoints(
      rawData,
      customerTypeFilter,
      excludedCustomerTypes,
      selectedOrganisations
    );
    setUserPoints(points);
  }, [
    rawData,
    customerTypeFilter,
    excludedCustomerTypes,
    selectedOrganisations,
  ]);

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (error) return <p className="text-destructive">{error}</p>;

  // Dynamic height so that each organisation gets enough vertical space (ca. 50px)
  const chartData = filteredData;
  const chartHeight = Math.max(400, chartData.length * 80);

  // Calculate quadrant counts
  const quadrantCounts = {
    bottomLeft: userPoints.filter((p) => p.l_days <= 60 && p.g_days <= 60)
      .length, // Recent both
    topLeft: userPoints.filter((p) => p.l_days <= 60 && p.g_days > 60).length, // Recent Land iQ only
    bottomRight: userPoints.filter((p) => p.l_days > 60 && p.g_days <= 60)
      .length, // Recent Giraffe only
    topRight: userPoints.filter((p) => p.l_days > 60 && p.g_days > 60).length, // No recent activity
  };

  // Calculate number of users with no Land iQ events (l_days = 240)
  // but only count users who have valid Giraffe activity (g_days < 240)
  const usersWithNoLandIQ = userPoints.filter(
    (p) => p.l_days === 240 && p.g_days < 240
  ).length;

  // Strategic Action Cards calculations
  const strategicStats = {
    churnRisk: userPoints.filter((p) => p.l_days > 120 && p.g_days > 120)
      .length,
    conversionOpportunity: userPoints.filter(
      (p) => p.g_days <= 30 && p.l_days === 240
    ).length,
    successStories: userPoints.filter((p) => p.l_days <= 30 && p.g_days <= 30)
      .length,
    reEngagement: userPoints.filter(
      (p) =>
        (p.l_days >= 30 && p.l_days <= 90) || (p.g_days >= 30 && p.g_days <= 90)
    ).length,
  };

  // Calculate organisation-level Land iQ adoption for expansion targets
  const orgAdoption = new Map<string, { total: number; landiqUsers: number }>();
  userPoints.forEach((p) => {
    if (!orgAdoption.has(p.org)) {
      orgAdoption.set(p.org, { total: 0, landiqUsers: 0 });
    }
    const orgData = orgAdoption.get(p.org)!;
    orgData.total++;
    if (p.l_days < 240) orgData.landiqUsers++;
  });

  const expansionTargetOrgs = Array.from(orgAdoption.entries()).filter(
    ([org, data]) => {
      const adoptionRate = data.landiqUsers / data.total;
      return adoptionRate < 0.2 && data.total >= 5; // <20% adoption, min 5 users
    }
  ).length;

  // Helper functions to get users for each strategic category
  const getStrategicUsers = (category: string) => {
    switch (category) {
      case "churnRisk":
        return userPoints.filter((p) => p.l_days > 120 && p.g_days > 120);
      case "conversionOpportunity":
        return userPoints.filter((p) => p.g_days <= 30 && p.l_days === 240);
      case "successStories":
        return userPoints.filter((p) => p.l_days <= 30 && p.g_days <= 30);
      case "reEngagement":
        return userPoints.filter(
          (p) =>
            (p.l_days >= 30 && p.l_days <= 90) ||
            (p.g_days >= 30 && p.g_days <= 90)
        );
      case "expansionTargets":
        // Return users from organisations with <20% adoption
        const targetOrgs = Array.from(orgAdoption.entries())
          .filter(([org, data]) => {
            const adoptionRate = data.landiqUsers / data.total;
            return adoptionRate < 0.2 && data.total >= 5;
          })
          .map(([org]) => org);
        return userPoints.filter((p) => targetOrgs.includes(p.org));
      default:
        return [];
    }
  };

  const getCardTooltip = (category: string) => {
    switch (category) {
      case "churnRisk":
        return "Users who have been inactive for more than 120 days on either Giraffe or Land iQ. These users are at risk of churning and need immediate attention.";
      case "conversionOpportunity":
        return "Users who are active on Giraffe (≤30 days) but have never used Land iQ. Prime candidates for Land iQ onboarding and conversion campaigns.";
      case "successStories":
        return "Users who are active on both platforms (≤30 days). These are your most engaged users - identify best practices and create case studies.";
      case "reEngagement":
        return "Users with moderate activity gaps (30-90 days) on either platform. Perfect targets for re-engagement campaigns and feature highlights.";
      case "expansionTargets":
        return "Organisations with less than 20% Land iQ adoption rate (minimum 5 users). Focus sales and expansion efforts on these organisations.";
      default:
        return "";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recency Distribution (days since last activity)</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Customer Type:</label>
              <Select
                value={customerTypeFilter}
                onValueChange={setCustomerTypeFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customer Types</SelectItem>
                  {availableCustomerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {customerTypeFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomerTypeFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        {/* Make container scrollable but allow chart to be taller than viewport */}
        <CardContent className="h-[600px] overflow-auto">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 160 }}
              barCategoryGap="50%"
              barGap={10}
            >
              {/* X-axis (value scale) – hidden line but ticks retained for tooltip positioning */}
              <XAxis type="number" hide domain={[0, "dataMax + 20"]} />
              {/* Left Y axis: organisation names */}
              <YAxis
                yAxisId="org"
                dataKey="org"
                type="category"
                width={280}
                tick={{ fontSize: 18 }}
                axisLine={{ stroke: "#0b3d59", strokeWidth: 4 }}
                tickLine={false}
              />
              {/* Right Y axis: user counts, shares domain, using tickFormatter */}
              <YAxis
                yAxisId="users"
                orientation="right"
                dataKey="org"
                type="category"
                width={80}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 16, fill: "#374151", fontWeight: 600 }}
                tickFormatter={(_, index) => chartData[index]?.users ?? ""}
              />
              {/* Horizontal grid lines for row separation */}
              <CartesianGrid
                strokeDasharray=""
                vertical={false}
                stroke="#e5e7eb"
              />

              <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} />

              {/* Giraffe median bar */}
              <Bar
                yAxisId="org"
                dataKey="g_med"
                name="Giraffe"
                fill="#f5a623"
                stroke="#5b2c01"
                strokeWidth={2}
                barSize={26}
                radius={[0, 6, 6, 0]}
              >
                <LabelList
                  dataKey="g_med"
                  position="insideRight"
                  fill="#000"
                  style={{ fontWeight: 600 }}
                />
              </Bar>
              {/* Land iQ median bar */}
              <Bar
                yAxisId="org"
                dataKey="l_med"
                name="Land iQ"
                fill="#002f7b"
                stroke="#5b2c01"
                strokeWidth={2}
                barSize={26}
                radius={[0, 6, 6, 0]}
              >
                <LabelList
                  dataKey="l_med"
                  position="insideRight"
                  fill="#fff"
                  style={{ fontWeight: 600 }}
                />
              </Bar>

              {/* removed hidden bar; user counts handled by right Y axis */}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>

        {/* Bubble scatter chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recency Scatter (individual users)</CardTitle>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Customer Type:</label>
                <Select
                  value={customerTypeFilter}
                  onValueChange={setCustomerTypeFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customer Types</SelectItem>
                    {availableCustomerTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomerTypeFilter("all")}
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Organisations:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[250px] justify-between"
                    >
                      {selectedOrganisations.size === 0
                        ? "All Organisations"
                        : `${selectedOrganisations.size} selected`}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Select Organisations
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrganisations(new Set())}
                        >
                          Clear All
                        </Button>
                      </div>
                      {availableOrganisations.map((org) => (
                        <div key={org} className="flex items-center space-x-2">
                          <Checkbox
                            id={org}
                            checked={selectedOrganisations.has(org)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(
                                selectedOrganisations
                              );
                              if (checked) {
                                newSelected.add(org);
                              } else {
                                newSelected.delete(org);
                              }
                              setSelectedOrganisations(newSelected);
                            }}
                          />
                          <label
                            htmlFor={org}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {org}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Exclude Types:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {excludedCustomerTypes.size} excluded
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Excluded Customer Types</h4>
                      {availableCustomerTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`exclude-${type}`}
                            checked={excludedCustomerTypes.has(type)}
                            onCheckedChange={(checked) => {
                              const newExcluded = new Set(
                                excludedCustomerTypes
                              );
                              if (checked) {
                                newExcluded.add(type);
                              } else {
                                newExcluded.delete(type);
                              }
                              setExcludedCustomerTypes(newExcluded);
                            }}
                          />
                          <label
                            htmlFor={`exclude-${type}`}
                            className="text-sm"
                          >
                            {type}
                          </label>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExcludedCustomerTypes(new Set())}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 20, left: 40 }}
              >
                {/* Quadrant background shading */}
                <ReferenceArea
                  x1={0}
                  x2={60}
                  y1={0}
                  y2={60}
                  fill="rgba(34, 197, 94, 0.1)"
                />
                <ReferenceArea
                  x1={0}
                  x2={60}
                  y1={60}
                  y2={240}
                  fill="rgba(251, 146, 60, 0.1)"
                />
                <ReferenceArea
                  x1={60}
                  x2={240}
                  y1={0}
                  y2={60}
                  fill="rgba(59, 130, 246, 0.1)"
                />
                <ReferenceArea
                  x1={60}
                  x2={240}
                  y1={60}
                  y2={240}
                  fill="rgba(239, 68, 68, 0.1)"
                />

                {/* Grid lines at 60 day markers only */}
                <ReferenceLine x={60} stroke="#666" strokeWidth={2} />
                <ReferenceLine y={60} stroke="#666" strokeWidth={2} />

                <XAxis
                  type="number"
                  dataKey="l_days"
                  name="Land iQ"
                  domain={[0, 240]}
                  tick={{ fontSize: 12 }}
                  ticks={[0, 30, 60, 90, 120, 150, 180, 210, 240]}
                  label={{
                    value: "Land iQ (days)",
                    position: "insideBottom",
                    dy: 10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="g_days"
                  name="Giraffe"
                  domain={[0, 240]}
                  tick={{ fontSize: 12 }}
                  ticks={[0, 30, 60, 90, 120, 150, 180, 210, 240]}
                  label={{
                    value: "Giraffe (days)",
                    angle: -90,
                    position: "insideLeft",
                    dx: -10,
                  }}
                />
                <RechartsTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg max-w-xs">
                          <p className="font-semibold mb-2">{data.org}</p>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">User:</span>{" "}
                              {data.email}
                            </div>
                            <div>
                              <span className="font-medium">Giraffe:</span>{" "}
                              {data.g_days} days ago
                              {data.g_days === 240 && (
                                <span className="text-red-600">
                                  {" "}
                                  (no activity)
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Land iQ:</span>{" "}
                              {data.l_days} days ago
                              {data.l_days === 240 && (
                                <span className="text-red-600">
                                  {" "}
                                  (no activity)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={userPoints}>
                  {userPoints.map((entry, index) => {
                    const isRed = entry.g_days === 240 || entry.l_days === 240;
                    return (
                      <Cell
                        key={`user-${index}`}
                        fill={isRed ? "#dc2626" : "#0284c7"}
                      />
                    );
                  })}
                </Scatter>

                {/* Quadrant labels with counts positioned at top of each quadrant */}
                <ReferenceArea
                  x1={30}
                  x2={30}
                  y1={50}
                  y2={50}
                  fill="transparent"
                  label={{
                    value: `Recent Giraffe and Land iQ use (${quadrantCounts.bottomLeft})`,
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#059669" },
                  }}
                />
                <ReferenceArea
                  x1={30}
                  x2={30}
                  y1={220}
                  y2={220}
                  fill="transparent"
                  label={{
                    value: `Recent Land iQ use only (${quadrantCounts.topLeft})`,
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#ea580c" },
                  }}
                />
                <ReferenceArea
                  x1={150}
                  x2={150}
                  y1={50}
                  y2={50}
                  fill="transparent"
                  label={{
                    value: `Recent Giraffe use only (${quadrantCounts.bottomRight})`,
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#2563eb" },
                  }}
                />
                <ReferenceArea
                  x1={150}
                  x2={150}
                  y1={220}
                  y2={220}
                  fill="transparent"
                  label={{
                    value: `No recent Giraffe or Land iQ use (${quadrantCounts.topRight})`,
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#dc2626" },
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>

          {/* Stat card for users with no Land iQ events */}
          <CardContent className="pt-0">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Users with no Land iQ events
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Giraffe users who have never used Land iQ
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-900">
                      {usersWithNoLandIQ}
                    </p>
                    <p className="text-xs text-red-600">
                      {userPoints.length > 0
                        ? `${Math.round(
                            (usersWithNoLandIQ / userPoints.length) * 100
                          )}%`
                        : "0%"}{" "}
                      of total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>

          {/* Strategic Action Cards */}
          <CardContent className="pt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Strategic Action Cards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Churn Risk */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="bg-red-50 border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🔴</span>
                                    <div>
                                      <p className="text-sm font-medium text-red-800">
                                        Churn Risk
                                      </p>
                                      <p className="text-xs text-red-600">
                                        Inactive &gt;120 days
                                      </p>
                                    </div>
                                    <Info className="h-4 w-4 text-red-600 opacity-50" />
                                  </div>
                                  <p className="text-xl font-bold text-red-900">
                                    {strategicStats.churnRisk}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCardTooltip("churnRisk")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg">🔴</span>
                            Churn Risk Users ({strategicStats.churnRisk})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto min-h-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organisation</TableHead>
                                <TableHead>Giraffe Days</TableHead>
                                <TableHead>Land iQ Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStrategicUsers("churnRisk").map(
                                (user, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.org}</TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.g_days > 120
                                            ? "text-red-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.g_days === 240
                                          ? "No events"
                                          : `${user.g_days} days`}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.l_days > 120
                                            ? "text-red-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.l_days === 240
                                          ? "No events"
                                          : `${user.l_days} days`}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Conversion Opportunity */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🟡</span>
                                    <div>
                                      <p className="text-sm font-medium text-amber-800">
                                        Conversion Opportunity
                                      </p>
                                      <p className="text-xs text-amber-600">
                                        Active Giraffe, no Land iQ
                                      </p>
                                    </div>
                                    <Info className="h-4 w-4 text-amber-600 opacity-50" />
                                  </div>
                                  <p className="text-xl font-bold text-amber-900">
                                    {strategicStats.conversionOpportunity}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCardTooltip("conversionOpportunity")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg">🟡</span>
                            Conversion Opportunity Users (
                            {strategicStats.conversionOpportunity})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto min-h-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organisation</TableHead>
                                <TableHead>Giraffe Days</TableHead>
                                <TableHead>Land iQ Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStrategicUsers("conversionOpportunity").map(
                                (user, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.org}</TableCell>
                                    <TableCell>
                                      <span className="text-green-600 font-semibold">
                                        {user.g_days} days
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-red-600 font-semibold">
                                        No events
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Success Stories */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="bg-green-50 border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🟢</span>
                                    <div>
                                      <p className="text-sm font-medium text-green-800">
                                        Success Stories
                                      </p>
                                      <p className="text-xs text-green-600">
                                        Active on both platforms
                                      </p>
                                    </div>
                                    <Info className="h-4 w-4 text-green-600 opacity-50" />
                                  </div>
                                  <p className="text-xl font-bold text-green-900">
                                    {strategicStats.successStories}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCardTooltip("successStories")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg">🟢</span>
                            Success Story Users ({strategicStats.successStories}
                            )
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto min-h-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organisation</TableHead>
                                <TableHead>Giraffe Days</TableHead>
                                <TableHead>Land iQ Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStrategicUsers("successStories").map(
                                (user, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.org}</TableCell>
                                    <TableCell>
                                      <span className="text-green-600 font-semibold">
                                        {user.g_days} days
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-green-600 font-semibold">
                                        {user.l_days} days
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Expansion Targets */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🔵</span>
                                    <div>
                                      <p className="text-sm font-medium text-blue-800">
                                        Expansion Targets
                                      </p>
                                      <p className="text-xs text-blue-600">
                                        Orgs &lt;20% Land iQ adoption
                                      </p>
                                    </div>
                                    <Info className="h-4 w-4 text-blue-600 opacity-50" />
                                  </div>
                                  <p className="text-xl font-bold text-blue-900">
                                    {expansionTargetOrgs}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCardTooltip("expansionTargets")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg">🔵</span>
                            Expansion Target Users (
                            {getStrategicUsers("expansionTargets").length})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto min-h-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organisation</TableHead>
                                <TableHead>Giraffe Days</TableHead>
                                <TableHead>Land iQ Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStrategicUsers("expansionTargets").map(
                                (user, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.org}</TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.g_days > 120
                                            ? "text-red-600"
                                            : user.g_days <= 30
                                            ? "text-green-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.g_days === 240
                                          ? "No events"
                                          : `${user.g_days} days`}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.l_days === 240
                                            ? "text-red-600 font-semibold"
                                            : user.l_days <= 30
                                            ? "text-green-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.l_days === 240
                                          ? "No events"
                                          : `${user.l_days} days`}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Re-engagement */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">⚪</span>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">
                                        Re-engagement
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        30-90 day gaps
                                      </p>
                                    </div>
                                    <Info className="h-4 w-4 text-gray-600 opacity-50" />
                                  </div>
                                  <p className="text-xl font-bold text-gray-900">
                                    {strategicStats.reEngagement}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCardTooltip("reEngagement")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg">⚪</span>
                            Re-engagement Users ({strategicStats.reEngagement})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto min-h-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organisation</TableHead>
                                <TableHead>Giraffe Days</TableHead>
                                <TableHead>Land iQ Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStrategicUsers("reEngagement").map(
                                (user, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.org}</TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.g_days >= 30 && user.g_days <= 90
                                            ? "text-amber-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.g_days === 240
                                          ? "No events"
                                          : `${user.g_days} days`}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          user.l_days >= 30 && user.l_days <= 90
                                            ? "text-amber-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {user.l_days === 240
                                          ? "No events"
                                          : `${user.l_days} days`}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </CardContent>

          {/* Engagement Trajectory Chart */}
          <CardContent className="pt-0">
            <EngagementTrajectoryChart
              userPoints={userPoints}
              timeframe="last_6_months"
              showTrendArrows={true}
              showCohortAnalysis={false}
              height={500}
            />
          </CardContent>
        </Card>
      </Card>
    </>
  );
}

function parseEventDate(raw: string): Date | null {
  const [d, m, y] = raw.split("/");
  if (!(d && m && y)) return null;
  const year = parseInt(y.length === 2 ? `20${y}` : y, 10);
  return new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
}

// Helper function to calculate organisation stats with optional customer type filter
const calculateOrgStats = (
  rawData: any,
  customerTypeFilter: string,
  excludedTypes: Set<string>
): OrgStats[] => {
  const { giraffe, liqCsv, emailToOrg, emailToCust } = rawData;

  // Giraffe days since last login per email (filtered by customer type)
  const orgToGiraffe: Record<string, number[]> = {};
  const orgToUserEmails: Record<string, Set<string>> = {};
  Object.values(giraffe).forEach((u: any) => {
    // Apply customer type filter
    const userCustomerType = emailToCust.get(u.email);
    if (customerTypeFilter !== "all" && userCustomerType !== customerTypeFilter)
      return;

    // Apply excluded types filter
    if (excludedTypes.has(userCustomerType || "Unknown Customer Type")) return;

    const days = daysSinceLastSeen(u.lastSeen);
    if (days === null) return;

    const org = emailToOrg.get(u.email) || "Unknown";
    if (!orgToGiraffe[org]) orgToGiraffe[org] = [];
    orgToGiraffe[org].push(days);
    if (!orgToUserEmails[org]) orgToUserEmails[org] = new Set();
    orgToUserEmails[org].add(u.email);
  });

  // Land iQ recency using LATEST event per email (filtered by customer type)
  const orgToLiq: Record<string, number[]> = {};
  const latestEventByEmail = new Map<string, number>(); // epoch ms
  liqCsv
    .trim()
    .split("\n")
    .slice(1) // skip header
    .forEach((line: string) => {
      const [, timestamp, , userEmail] = line.split(",");
      const email = (userEmail || "").trim().toLowerCase();
      if (!email || !timestamp) return;

      // Apply customer type filter
      const userCustomerType = emailToCust.get(email);
      if (
        customerTypeFilter !== "all" &&
        userCustomerType !== customerTypeFilter
      )
        return;

      // Apply excluded types filter
      if (excludedTypes.has(userCustomerType || "Unknown Customer Type"))
        return;

      const date = parseEventDate(timestamp.trim());
      if (!date) return;
      const ms = date.getTime();
      const prev = latestEventByEmail.get(email) || 0;
      if (ms > prev) latestEventByEmail.set(email, ms);
    });

  latestEventByEmail.forEach((ms, email) => {
    const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    const org = emailToOrg.get(email) || "Unknown";
    if (!orgToLiq[org]) orgToLiq[org] = [];
    orgToLiq[org].push(days);
    if (!orgToUserEmails[org]) orgToUserEmails[org] = new Set();
    orgToUserEmails[org].add(email);
  });

  const rows: OrgStats[] = [];
  const allOrgs = new Set([
    ...Object.keys(orgToGiraffe),
    ...Object.keys(orgToLiq),
  ]);
  allOrgs.forEach((org) => {
    if (org === "Unknown") return; // skip placeholder
    const gStats = computeQuartiles(orgToGiraffe[org] || []);
    const lStats = computeQuartiles(orgToLiq[org] || []);
    const users = orgToUserEmails[org]?.size || 0;

    // Use 240 for no data, cap all values at 240
    let gMed = gStats[2];
    let lMed = lStats[2];
    if (!orgToGiraffe[org] || orgToGiraffe[org].length === 0) gMed = 240;
    if (!orgToLiq[org] || orgToLiq[org].length === 0) lMed = 240;
    gMed = Math.min(gMed, 240);
    lMed = Math.min(lMed, 240);

    rows.push({
      org,
      g_med: gMed,
      l_med: lMed,
      users,
      giraffeUserDays: orgToGiraffe[org] || [],
      landiqUserDays: orgToLiq[org] || [],
    });
  });

  // sort by highest median (either product)
  rows.sort((a, b) => Math.max(b.g_med, b.l_med) - Math.max(a.g_med, a.l_med));

  return rows;
};

// Helper function to calculate individual user points for scatter chart
const calculateUserPoints = (
  rawData: any,
  customerTypeFilter: string,
  excludedTypes: Set<string>,
  selectedOrgs: Set<string>
): Array<{
  email: string;
  org: string;
  g_days: number;
  l_days: number;
  g_events: string[];
  l_events: string[];
}> => {
  const { giraffe, liqCsv, emailToOrg, emailToCust } = rawData;
  const points: Array<{
    email: string;
    org: string;
    g_days: number;
    l_days: number;
    g_events: string[];
    l_events: string[];
  }> = [];

  // Get Giraffe data for each user
  const userGiraffeDays = new Map<string, number>();
  const userGiraffeEvents = new Map<string, string[]>();
  Object.values(giraffe).forEach((u: any) => {
    const userCustomerType = emailToCust.get(u.email);
    if (customerTypeFilter !== "all" && userCustomerType !== customerTypeFilter)
      return;
    if (excludedTypes.has(userCustomerType || "Unknown Customer Type")) return;

    const org = emailToOrg.get(u.email) || "Unknown";
    if (selectedOrgs.size > 0 && !selectedOrgs.has(org)) return;

    // Record recency
    const days = daysSinceLastSeen(u.lastSeen);
    if (days !== null) {
      userGiraffeDays.set(u.email, Math.min(days, 240));
    }

    // Record each appearance date as an event (use snapshot key)
    const events: string[] = [];
    Object.keys(u.appearances || {}).forEach((snapIso) => {
      events.push(snapIso);
    });
    userGiraffeEvents.set(u.email, events);
  });

  // Get Land iQ data for each user
  const userLiqDays = new Map<string, number>();
  const userLiqEvents = new Map<string, string[]>();
  const latestEventByEmail = new Map<string, number>(); // epoch ms
  liqCsv
    .trim()
    .split("\n")
    .slice(1) // skip header
    .forEach((line: string) => {
      const [, timestamp, , userEmail] = line.split(",");
      const email = (userEmail || "").trim().toLowerCase();
      if (!email || !timestamp) return;

      const userCustomerType = emailToCust.get(email);
      if (
        customerTypeFilter !== "all" &&
        userCustomerType !== customerTypeFilter
      )
        return;
      if (excludedTypes.has(userCustomerType || "Unknown Customer Type"))
        return;

      const org = emailToOrg.get(email) || "Unknown";
      if (selectedOrgs.size > 0 && !selectedOrgs.has(org)) return;

      const date = parseEventDate(timestamp.trim());
      if (!date) return;
      const ms = date.getTime();
      const prev = latestEventByEmail.get(email) || 0;
      if (ms > prev) latestEventByEmail.set(email, ms);

      // Record event for monthly counts
      if (!userLiqEvents.has(email)) userLiqEvents.set(email, []);
      userLiqEvents.get(email)!.push(date.toISOString().slice(0, 10));
    });

  latestEventByEmail.forEach((ms, email) => {
    const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    userLiqDays.set(email, Math.min(days, 240));
  });

  // Only include users who have Giraffe data (no Giraffe = no Land iQ)
  userGiraffeDays.forEach((gDays, email) => {
    const org = emailToOrg.get(email) || "Unknown";
    if (org === "Unknown") return;

    const lDays = userLiqDays.get(email) ?? 240;

    points.push({
      email,
      org,
      g_days: gDays,
      l_days: lDays,
      g_events: userGiraffeEvents.get(email) || [],
      l_events: userLiqEvents.get(email) || [],
    });
  });

  return points;
};
