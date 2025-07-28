"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGiraffeUsageData,
  daysSinceLastSeen,
} from "@/lib/giraffe-usage-service";
import { pipedriveService } from "@/lib/pipedrive-service";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface RowData {
  email: string;
  organisation: string;
  customerType: string;
  lastSeen: string;
  daysInactive: number;
}

export default function GiraffeAtRiskTable({
  threshold = 180,
}: {
  threshold?: number;
}) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const giraffe = await fetchGiraffeUsageData();
        const persons = await pipedriveService.fetchPersons();
        const organisations = await pipedriveService.fetchOrganisations();

        // Build helper maps
        const orgIdToName = new Map<number, string>();
        organisations.forEach((o: any) => {
          if (o.id && o.name) orgIdToName.set(o.id, o.name);
        });

        const emailToInfo = new Map<
          string,
          { org: string; customerType: string }
        >();
        persons.forEach((p: any) => {
          let email = "";
          if (typeof p.email === "string") email = p.email;
          else if (Array.isArray(p.email) && p.email.length)
            email = p.email[0]?.value || p.email[0]?.email || "";
          email = email.toLowerCase();
          if (!email) return;
          const org =
            p.org_name || (p.org_id && orgIdToName.get(p.org_id)) || "Unknown";
          const custType = p.customer_type || "";
          emailToInfo.set(email, { org, customerType: custType });
        });

        const today = new Date();
        const riskRows: RowData[] = [];
        Object.values(giraffe.users).forEach((u) => {
          const days = daysSinceLastSeen(u.lastSeen);
          if (days === null || days < threshold) return;
          const info = emailToInfo.get(u.email) || {
            org: "Unknown",
            customerType: "",
          };
          riskRows.push({
            email: u.email,
            organisation: info.org,
            customerType: info.customerType,
            lastSeen: u.lastSeen || "",
            daysInactive: days,
          });
        });

        // sort by daysInactive desc
        riskRows.sort((a, b) => b.daysInactive - a.daysInactive);
        setRows(riskRows);
      } catch (err: any) {
        console.error("Failed to build at-risk table", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [threshold]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) {
    return <p className="text-destructive">{error}</p>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users Inactive &gt; {threshold} days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Customer Type</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Days Inactive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.email}>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.organisation}</TableCell>
                  <TableCell>{r.customerType}</TableCell>
                  <TableCell>{r.lastSeen}</TableCell>
                  <TableCell className="text-right">{r.daysInactive}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No users exceed the threshold.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
