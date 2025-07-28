"use client";

import React from "react";
import GiraffeUsageTrend from "@/components/GiraffeUsageTrend";
import GiraffeInactivityHistogram from "@/components/GiraffeInactivityHistogram";
import GiraffeOrganisationLeaderboard from "@/components/GiraffeOrganisationLeaderboard";
import CrossProductMatrix from "@/components/CrossProductMatrix";
import GiraffeCorrelationScatter from "@/components/GiraffeCorrelationScatter";
import GiraffeAtRiskTable from "@/components/GiraffeAtRiskTable";
import OrganisationRecencyBoxplot from "@/components/OrganisationRecencyBoxplot";

export default function GiraffeDashboard() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Giraffe Usage Analytics</h1>

      <GiraffeUsageTrend />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GiraffeInactivityHistogram />
        <GiraffeOrganisationLeaderboard />
      </div>

      <CrossProductMatrix />

      <GiraffeCorrelationScatter />

      <OrganisationRecencyBoxplot />

      <GiraffeAtRiskTable threshold={180} />
    </div>
  );
}
