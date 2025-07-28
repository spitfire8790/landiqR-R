"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGiraffeUsageData,
  GiraffeUsageData,
} from "@/lib/giraffe-usage-service";

interface TrendPoint {
  date: string; // ISO yyyy-mm-dd
  active: number;
}

export default function GiraffeUsageTrend() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const parsed: GiraffeUsageData = await fetchGiraffeUsageData();
        const trend: TrendPoint[] = parsed.snapshotDates.map((d) => ({
          date: d,
          active: parsed.activeCounts[d] || 0,
        }));
        setData(trend);
      } catch (err: any) {
        console.error("Failed to load Giraffe usage data", err);
        setError(err?.message || "Failed to load Giraffe usage data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giraffe Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giraffe Active Users Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(5)} // show mm-dd for brevity
              minTickGap={20}
            />
            <YAxis allowDecimals={false} />
            <RechartsTooltip
              formatter={(value) => [value, "Active Users"]}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="active"
              stroke="#2563eb" // tailwind blue-600
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
