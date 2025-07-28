"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGiraffeUsageData } from "@/lib/giraffe-usage-service";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  categorizeJobTitleEnhanced,
  getCategoryColor,
} from "@/lib/job-title-categories";

interface OrgChartDatum {
  org: string;
  [category: string]: number | string; // category counts
}

export default function GiraffeOrganisationLeaderboard({
  top = 10,
}: {
  top?: number;
}) {
  const [data, setData] = useState<OrgChartDatum[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [giraffe, persons, organisations] = await Promise.all([
          fetchGiraffeUsageData(),
          pipedriveService.fetchPersons(),
          pipedriveService.fetchOrganisations(),
        ]);

        // Map orgId -> name for faster lookup
        const orgIdToName = new Map<number, string>();
        organisations.forEach((o: any) => {
          if (o.id && o.name) orgIdToName.set(o.id, o.name);
        });

        // Build email -> { category, org } map
        const emailInfo = new Map<
          string,
          { category: string; organisation: string }
        >();
        persons.forEach((p: any) => {
          const emailRaw: any = p.email ?? p.primary_email;
          let emailStr = "";
          if (typeof emailRaw === "string") emailStr = emailRaw;
          else if (Array.isArray(emailRaw) && emailRaw.length)
            emailStr = emailRaw[0]?.value || emailRaw[0]?.email || "";
          emailStr = emailStr.toLowerCase().trim();
          if (!emailStr) return;

          const jobTitle: string = p.job_title || "";
          const category = categorizeJobTitleEnhanced(jobTitle);
          let orgName = p.org_name || "Unknown";
          if (p.org_id && orgIdToName.has(p.org_id)) {
            orgName = orgIdToName.get(p.org_id)!;
          }
          emailInfo.set(emailStr, { category, organisation: orgName });
        });

        // Identify latest snapshot date
        const latestSnapshot =
          giraffe.snapshotDates[giraffe.snapshotDates.length - 1];

        // Aggregate counts per organisation per category
        const orgMap = new Map<string, Map<string, number>>();
        Object.values(giraffe.users).forEach((u) => {
          if (!u.appearances[latestSnapshot]) return; // active only
          const info = emailInfo.get(u.email.toLowerCase()) ?? {
            category: "Other",
            organisation: "Unknown",
          };
          const orgName = info.organisation || "Unknown";
          const cat = info.category || "Other";
          if (!orgMap.has(orgName)) orgMap.set(orgName, new Map());
          const catMap = orgMap.get(orgName)!;
          catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });

        // Convert to array and select top organisations
        let rows: OrgChartDatum[] = Array.from(orgMap.entries()).map(
          ([org, catMap]) => {
            const obj: OrgChartDatum = { org };
            catMap.forEach((v, cat) => {
              obj[cat] = v;
            });
            obj.total = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
            return obj;
          }
        );
        rows = rows
          .sort((a, b) => (b.total as number) - (a.total as number))
          .slice(0, top);

        // Determine keys (categories) present
        const allCats = new Set<string>();
        rows.forEach((r) => {
          Object.keys(r).forEach((k) => {
            if (k !== "org" && k !== "total") allCats.add(k);
          });
        });
        const keysArr = Array.from(allCats);

        setData(rows);
        setKeys(keysArr);
      } catch (err: any) {
        console.error("Failed to build organisation leaderboard", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [top]);

  if (loading) return <Skeleton className="h-72 w-full" />;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Users by Organisation</CardTitle>
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
        <CardTitle>Top Organisations – Active Giraffe Users</CardTitle>
      </CardHeader>
      <CardContent className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 30, top: 10, right: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="org" type="category" width={150} />
            <RechartsTooltip />
            <RechartsLegend />
            {keys.map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={getCategoryColor(k)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
