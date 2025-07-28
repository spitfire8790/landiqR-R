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
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGiraffeUsageData,
  daysSinceLastSeen,
} from "@/lib/giraffe-usage-service";
import { pipedriveService } from "@/lib/pipedrive-service";

interface OrgStats {
  org: string;
  g_med: number;
  l_med: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const emailToOrg = new Map<string, string>();
        const emailToCust = new Map<string, string>();
        persons.forEach((p: any) => {
          let email = "";
          if (typeof p.email === "string") email = p.email;
          else if (Array.isArray(p.email) && p.email.length)
            email = p.email[0]?.value || p.email[0]?.email || "";
          email = email.toLowerCase();
          if (!email) return;
          const org =
            p.org_name || (p.org_id && orgIdToName.get(p.org_id)) || "Unknown";
          const cust = p.customer_type || "";
          emailToOrg.set(email, org);
          emailToCust.set(email, cust);
        });

        // Giraffe days since last login per email
        const orgToGiraffe: Record<string, number[]> = {};
        Object.values(giraffe.users).forEach((u) => {
          if (emailToCust.get(u.email) === "Access Revoked") return;
          const days = daysSinceLastSeen(u.lastSeen);
          if (days === null) return;
          const org = emailToOrg.get(u.email) || "Unknown";
          if (!orgToGiraffe[org]) orgToGiraffe[org] = [];
          orgToGiraffe[org].push(days);
        });

        // Land iQ recency compute from latest snapshot date
        const orgToLiq: Record<string, number[]> = {};
        const lines = liqCsv.trim().split("\n");
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            const [id, timestamp, _event, userEmail] = lines[i].split(",");
            const email = (userEmail || "").trim().toLowerCase();
            if (!email || !timestamp) continue;
            const date = parseEventDate(timestamp.trim());
            if (!date) continue;
            const days = Math.floor(
              (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
            );
            const org = emailToOrg.get(email) || "Unknown";
            if (!orgToLiq[org]) orgToLiq[org] = [];
            orgToLiq[org].push(days);
          }
        }

        const rows: OrgStats[] = [];
        const allOrgs = new Set([
          ...Object.keys(orgToGiraffe),
          ...Object.keys(orgToLiq),
        ]);
        allOrgs.forEach((org) => {
          if (org === "Unknown") return; // skip placeholder
          const gStats = computeQuartiles(orgToGiraffe[org] || []);
          const lStats = computeQuartiles(orgToLiq[org] || []);
          rows.push({ org, g_med: gStats[2], l_med: lStats[2] });
        });
        // sort by highest median (either product)
        rows.sort(
          (a, b) => Math.max(b.g_med, b.l_med) - Math.max(a.g_med, a.l_med)
        );
        setData(rows);
      } catch (err: any) {
        setError(err?.message || "Failed");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (error) return <p className="text-destructive">{error}</p>;

  // Layout: each entry as custom box in ComposedChart.
  const chartData = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recency Distribution (days since last activity)</CardTitle>
      </CardHeader>
      <CardContent className="h-[600px] overflow-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 160 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="org" type="category" width={220} />
            <RechartsTooltip />
            <Bar dataKey="g_med" name="Giraffe" fill="#f59e0b" barSize={30} />
            <Bar dataKey="l_med" name="Land iQ" fill="#1e3a8a" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function parseEventDate(raw: string): Date | null {
  const [d, m, y] = raw.split("/");
  if (!(d && m && y)) return null;
  const year = parseInt(y.length === 2 ? `20${y}` : y, 10);
  return new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
}
