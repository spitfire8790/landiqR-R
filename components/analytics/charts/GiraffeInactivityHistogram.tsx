"use client";

import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGiraffeUsageData } from "@/lib/giraffe-usage-service";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface Bucket {
  name: string;
  value: number;
  color: string;
}

const BUCKETS: { label: string; maxDays: number | null; color: string }[] = [
  { label: "< 30 days", maxDays: 29, color: "#16a34a" }, // green
  { label: "30–89 days", maxDays: 89, color: "#f59e0b" }, // amber
  { label: "90–179 days", maxDays: 179, color: "#d97706" }, // darker amber
  { label: "≥ 180 days", maxDays: null, color: "#dc2626" }, // red
];

export default function GiraffeInactivityHistogram() {
  const [data, setData] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const parsed = await fetchGiraffeUsageData();
        const bucketsCount = BUCKETS.map(() => 0);

        const today = new Date();
        Object.values(parsed.users).forEach((u) => {
          if (!u.lastSeen) return; // never seen
          const lastDate = parseISO(u.lastSeen);
          const days = differenceInCalendarDays(today, lastDate);
          let idx = BUCKETS.findIndex((b) =>
            b.maxDays === null ? true : days <= b.maxDays
          );
          if (idx === -1) idx = BUCKETS.length - 1;
          bucketsCount[idx] += 1;
        });

        const bucketData: Bucket[] = BUCKETS.map((b, i) => ({
          name: b.label,
          value: bucketsCount[i],
          color: b.color,
        }));
        setData(bucketData);
      } catch (err: any) {
        console.error("Failed to compute inactivity histogram", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giraffe User Inactivity</CardTitle>
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
        <CardTitle>User Inactivity – Days Since Last Seen</CardTitle>
      </CardHeader>
      <CardContent className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value"
              data={data}
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value, _name, props: any) => [
                value,
                props.payload.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
