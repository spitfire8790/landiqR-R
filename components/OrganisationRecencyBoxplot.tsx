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

        // Calculate initial data with all users
        const initialRows = calculateOrgStats(
          rawDataObj,
          "all",
          excludedCustomerTypes
        );
        setData(initialRows);
        setFilteredData(initialRows);

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
  }, [rawData, customerTypeFilter, excludedCustomerTypes]);

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (error) return <p className="text-destructive">{error}</p>;

  // Dynamic height so that each organisation gets enough vertical space (ca. 50px)
  const chartData = filteredData;
  const chartHeight = Math.max(400, chartData.length * 80);

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
            <CardTitle>
              Recency Scatter (median days since last activity)
            </CardTitle>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="customer-type-filter"
                  className="text-sm font-medium"
                >
                  Customer Type:
                </label>
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
                  x2={90}
                  y1={0}
                  y2={90}
                  fill="rgba(34, 197, 94, 0.1)"
                />
                <ReferenceArea
                  x1={0}
                  x2={90}
                  y1={90}
                  y2={365}
                  fill="rgba(251, 146, 60, 0.1)"
                />
                <ReferenceArea
                  x1={90}
                  x2={365}
                  y1={0}
                  y2={90}
                  fill="rgba(59, 130, 246, 0.1)"
                />
                <ReferenceArea
                  x1={90}
                  x2={365}
                  y1={90}
                  y2={365}
                  fill="rgba(239, 68, 68, 0.1)"
                />

                {/* Grid lines at 90 day markers only */}
                <ReferenceLine x={90} stroke="#666" strokeWidth={2} />
                <ReferenceLine y={90} stroke="#666" strokeWidth={2} />

                <XAxis
                  type="number"
                  dataKey="l_med"
                  name="Land iQ"
                  domain={[0, 365]}
                  tick={{ fontSize: 12 }}
                  ticks={[
                    0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
                  ]}
                  label={{
                    value: "Land iQ (days)",
                    position: "insideBottom",
                    dy: 10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="g_med"
                  name="Giraffe"
                  domain={[0, 365]}
                  tick={{ fontSize: 12 }}
                  ticks={[
                    0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
                  ]}
                  label={{
                    value: "Giraffe (days)",
                    angle: -90,
                    position: "insideLeft",
                    dx: -10,
                  }}
                />
                <ZAxis
                  type="number"
                  dataKey="users"
                  range={[60, 400]}
                  name="# Users"
                />
                <RechartsTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;

                      // Safety check and ensure arrays exist
                      const giraffeArray = Array.isArray(data.giraffeUserDays)
                        ? data.giraffeUserDays
                        : [];
                      const landiqArray = Array.isArray(data.landiqUserDays)
                        ? data.landiqUserDays
                        : [];

                      const sortedGiraffe = [...giraffeArray].sort(
                        (a, b) => a - b
                      );
                      const sortedLandiq = [...landiqArray].sort(
                        (a, b) => a - b
                      );

                      return (
                        <div className="bg-white p-3 border rounded shadow-lg max-w-xs">
                          <p className="font-semibold mb-2">{data.org}</p>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">
                                Giraffe median:
                              </span>{" "}
                              {data.g_med} days
                              {data.g_med === 365 && (
                                <span className="text-red-600">
                                  {" "}
                                  (no activity)
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">
                                Land iQ median:
                              </span>{" "}
                              {data.l_med} days
                              {data.l_med === 365 && (
                                <span className="text-red-600">
                                  {" "}
                                  (no activity)
                                </span>
                              )}
                            </div>
                            <div className="pt-1 border-t">
                              <span className="font-medium">Total users:</span>{" "}
                              {data.users}
                            </div>
                            {giraffeArray.length > 0 && (
                              <div className="text-xs text-gray-600 pt-1">
                                <div className="font-medium">
                                  Giraffe user days:
                                </div>
                                <div className="max-h-16 overflow-y-auto">
                                  {sortedGiraffe.slice(0, 10).join(", ")}
                                  {sortedGiraffe.length > 10 &&
                                    ` ... +${sortedGiraffe.length - 10} more`}
                                </div>
                              </div>
                            )}
                            {landiqArray.length > 0 && (
                              <div className="text-xs text-gray-600 pt-1">
                                <div className="font-medium">
                                  Land iQ user days:
                                </div>
                                <div className="max-h-16 overflow-y-auto">
                                  {sortedLandiq.slice(0, 10).join(", ")}
                                  {sortedLandiq.length > 10 &&
                                    ` ... +${sortedLandiq.length - 10} more`}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={chartData}>
                  {chartData.map((entry, index) => {
                    const isRed = entry.g_med === 365 || entry.l_med === 365;
                    return (
                      <Cell
                        key={`bubble-${index}`}
                        fill={isRed ? "#dc2626" : "#0284c7"}
                      />
                    );
                  })}
                </Scatter>

                {/* Quadrant labels using properly positioned ReferenceArea */}
                <ReferenceArea
                  x1={22.5}
                  x2={22.5}
                  y1={22.5}
                  y2={22.5}
                  fill="transparent"
                  label={{
                    value: "Recent Giraffe and Land iQ use",
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#059669" },
                  }}
                />
                <ReferenceArea
                  x1={22.5}
                  x2={22.5}
                  y1={182}
                  y2={182}
                  fill="transparent"
                  label={{
                    value: "Recent Land iQ use only",
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#ea580c" },
                  }}
                />
                <ReferenceArea
                  x1={182}
                  x2={182}
                  y1={22.5}
                  y2={22.5}
                  fill="transparent"
                  label={{
                    value: "Recent Giraffe use only",
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#2563eb" },
                  }}
                />
                <ReferenceArea
                  x1={182}
                  x2={182}
                  y1={182}
                  y2={182}
                  fill="transparent"
                  label={{
                    value: "No recent Giraffe or Land iQ use",
                    position: "center",
                    style: { fontSize: 11, fontWeight: 600, fill: "#dc2626" },
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
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

    // Use 365 for no data, cap all values at 365
    let gMed = gStats[2];
    let lMed = lStats[2];
    if (!orgToGiraffe[org] || orgToGiraffe[org].length === 0) gMed = 365;
    if (!orgToLiq[org] || orgToLiq[org].length === 0) lMed = 365;
    gMed = Math.min(gMed, 365);
    lMed = Math.min(lMed, 365);

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
