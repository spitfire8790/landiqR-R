"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  ZAxis,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Scatter,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGiraffeUsageData } from "@/lib/giraffe-usage-service";
import { pipedriveService } from "@/lib/pipedrive-service";
import { readFileSync } from "fs";

interface MatrixPoint {
  liq: 0 | 1; // 1 if active in Land IQ
  giraffe: 0 | 1; // 1 if active in Giraffe
  count: number;
  label: string;
}

export default function CrossProductMatrix() {
  const [data, setData] = useState<MatrixPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const giraffe = await fetchGiraffeUsageData();
        // For Land iQ actives – reuse existing CSV already fetched in TimeSeriesSection? we quickly fetch.
        const resp = await fetch("/landiQSDKeventsDate.csv");
        const csvText = await resp.text();
        const liqActiveEmails = new Set<string>();
        const lines = csvText.trim().split("\n");
        if (lines.length > 1) {
          const header = lines[0].split(",");
          const lastIdx = header.length - 1; // latest snapshot column index
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(",");
            const email = (parts[0] || "").trim().toLowerCase();
            const cell = (parts[lastIdx] || "").trim();
            if (cell && cell !== "0") {
              liqActiveEmails.add(email);
            }
          }
        }

        const latestSnap =
          giraffe.snapshotDates[giraffe.snapshotDates.length - 1];
        const giraffeActiveEmails = new Set<string>();
        Object.values(giraffe.users).forEach((u) => {
          if (u.appearances[latestSnap])
            giraffeActiveEmails.add(u.email.toLowerCase());
        });

        const buckets: Record<string, MatrixPoint> = {};
        const key = (liq: 0 | 1, g: 0 | 1) => `${liq}${g}`;
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ].forEach(([li, g]) => {
          buckets[key(li as 0 | 1, g as 0 | 1)] = {
            liq: li as 0 | 1,
            giraffe: g as 0 | 1,
            count: 0,
            label: "",
          };
        });

        const allEmails = new Set<string>([
          ...Array.from(liqActiveEmails),
          ...Array.from(giraffeActiveEmails),
        ]);
        allEmails.forEach((email) => {
          const li = liqActiveEmails.has(email) ? 1 : 0;
          const g = giraffeActiveEmails.has(email) ? 1 : 0;
          buckets[key(li as 0 | 1, g as 0 | 1)].count += 1;
        });
        const points = Object.values(buckets);
        setData(points);
      } catch (err: any) {
        setError(err?.message || "Failed to build matrix");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-destructive">{error}</p>;

  // Render as simple table for now
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-Product Adoption Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1"> </th>
              <th className="border px-2 py-1">Giraffe Inactive</th>
              <th className="border px-2 py-1">Giraffe Active</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((liq) => (
              <tr key={liq}>
                <th className="border px-2 py-1 text-left">
                  {liq ? "Land iQ Active" : "Land iQ Inactive"}
                </th>
                {[0, 1].map((g) => (
                  <td key={g} className="border px-2 py-1 text-center">
                    {data.find((p) => p.liq === liq && p.giraffe === g)
                      ?.count || 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
