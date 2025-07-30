"use client";

import React from "react";
import GiraffeUsageTrend from "./GiraffeUsageTrend";
import GiraffeInactivityHistogram from "./GiraffeInactivityHistogram";
import GiraffeOrganisationLeaderboard from "./GiraffeOrganisationLeaderboard";
import CrossProductMatrix from "./CrossProductMatrix";
import GiraffeCorrelationScatter from "./GiraffeCorrelationScatter";
import GiraffeAtRiskTable from "./GiraffeAtRiskTable";
import OrganisationRecencyBoxplot from "./OrganisationRecencyBoxplot";

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
