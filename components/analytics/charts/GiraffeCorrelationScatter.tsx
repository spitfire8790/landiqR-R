"use client";

import React, { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGiraffeUsageData } from "@/lib/giraffe-usage-service";

interface Point {
  x: number; // Giraffe days active
  y: number; // Land iQ events
  z: number; // activities count
  name: string;
}

export default function GiraffeCorrelationScatter() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [giraffe, liqResp] = await Promise.all([
          fetchGiraffeUsageData(),
          fetch("/landiQSDKeventsDate.csv"),
        ]);
        const liqCsv = await liqResp.text();

        // Calculate Land iQ days-active (non-empty entries across snapshots)
        const liqDays = new Map<string, number>();
        const liqLines = liqCsv.trim().split("\n");
        if (liqLines.length > 1) {
          const header = liqLines[0].split(",");
          for (let i = 1; i < liqLines.length; i++) {
            const parts = liqLines[i].split(",");
            const email = (parts[0] || "").trim().toLowerCase();
            if (!email) continue;
            let count = 0;
            for (let c = 1; c < header.length; c++) {
              const cell = (parts[c] || "").trim();
              if (cell && cell !== "0") count++;
            }
            liqDays.set(email, count);
          }
        }

        const latestSnap =
          giraffe.snapshotDates[giraffe.snapshotDates.length - 1];

        const points: Point[] = [];
        Object.values(giraffe.users).forEach((u) => {
          const daysActive = Object.keys(u.appearances).length;
          const liqActiveDays = liqDays.get(u.email.toLowerCase()) || 0;
          if (daysActive === 0 && liqActiveDays === 0) return;
          points.push({ x: daysActive, y: liqActiveDays, z: 1, name: u.email });
        });
        setData(points);
      } catch (err: any) {
        setError(err?.message || "Failed");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Correlation: Giraffe Days-Active vs Land iQ Events
        </CardTitle>
      </CardHeader>
      <CardContent className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="x" name="Days Active" />
            <YAxis type="number" dataKey="y" name="Land iQ Events" />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="#2563eb" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
