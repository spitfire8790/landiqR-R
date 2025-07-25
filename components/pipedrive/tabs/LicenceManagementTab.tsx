"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Award,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Building2,
  Settings,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Calendar,
  UserCheck,
  UserX,
  Activity,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  FilterOptions,
  LicenceManagementData,
  ChartDataPoint,
  TimeSeriesDataPoint,
  PipedriveOrganisation,
  PipedrivePerson,
} from "@/lib/pipedrive-types";

interface LicenceManagementTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading: boolean;
}

interface LicencePoolData {
  pool: string;
  totalCapacity: number;
  allocated: number;
  active: number;
  utilisation: number;
  status: "optimal" | "warning" | "critical";
  trend: "up" | "down" | "stable";
}

interface OrganisationLicenceData {
  organisation: string;
  organisationId: number;
  totalAllocated: number;
  activeUsers: number;
  licenceTypes: Record<string, number>;
  utilisationRate: number;
  lastActivity: string;
  status: "active" | "inactive" | "trial";
}

interface LicenceMetrics {
  totalLicences: number;
  activeLicences: number;
  availableLicences: number;
  utilisationRate: number;
  trialConversions: number;
  expiringLicences: number;
  costPerUser: number;
  monthlyRevenue: number;
}

export default function LicenceManagementTab({
  filters,
  onFilterChange,
  isLoading,
}: LicenceManagementTabProps) {
  const [metrics, setMetrics] = useState<LicenceMetrics>({
    totalLicences: 0,
    activeLicences: 0,
    availableLicences: 0,
    utilisationRate: 0,
    trialConversions: 0,
    expiringLicences: 0,
    costPerUser: 0,
    monthlyRevenue: 0,
  });
  const [poolData, setPoolData] = useState<LicencePoolData[]>([]);
  const [organisationData, setOrganisationData] = useState<
    OrganisationLicenceData[]
  >([]);
  const [trialConversionData, setTrialConversionData] = useState<
    ChartDataPoint[]
  >([]);
  const [trendsData, setTrendsData] = useState<TimeSeriesDataPoint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("6months");
  const [selectedPool, setSelectedPool] = useState("all");

  useEffect(() => {
    loadLicenceManagementData();
  }, [filters, selectedTimeframe, selectedPool]);

  const loadLicenceManagementData = async () => {
    setIsLoadingData(true);
    try {
      // Load organisations and persons data
      const [organisations, persons, deals] = await Promise.all([
        pipedriveService.fetchOrganisations(),
        pipedriveService.fetchPersons(),
        pipedriveService.fetchDeals(),
      ]);

      // Get custom field mappings
      const customFields = pipedriveService.getCustomFieldMappings();

      // Process licence pool data
      const licencePools = processLicencePoolData(organisations, customFields);
      setPoolData(licencePools);

      // Process organisation licence matrix
      const orgMatrix = processOrganisationMatrix(
        organisations,
        persons,
        customFields
      );
      setOrganisationData(orgMatrix);

      // Calculate key metrics
      const licenceMetrics = calculateLicenceMetrics(
        organisations,
        persons,
        deals,
        customFields
      );
      setMetrics(licenceMetrics);

      // Process trial conversion data
      const trialData = processTrialConversionData(
        organisations,
        deals,
        customFields
      );
      setTrialConversionData(trialData);

      // Process trends data
      const trends = processTrendsData(organisations, selectedTimeframe);
      setTrendsData(trends);
    } catch (error) {
      console.error("Error loading licence management data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const processLicencePoolData = (
    organisations: PipedriveOrganisation[],
    customFields: any
  ): LicencePoolData[] => {
    // Helper function to check if organization should be excluded from analytics
    const shouldExcludeOrganization = (
      organizationName: string | undefined
    ): boolean => {
      if (!organizationName) return false;
      return organizationName.toLowerCase().includes("wsp");
    };

    const poolMap = new Map<
      string,
      {
        total: number;
        allocated: number;
        organisations: PipedriveOrganisation[];
      }
    >();

    // Filter out WSP organizations
    const filteredOrganisations = organisations.filter(
      (org) => !shouldExcludeOrganization(org.name)
    );

    filteredOrganisations.forEach((org) => {
      const pool =
        (org[customFields.organisations.licencePool] as string) || "Standard";
      const allocated =
        (org[customFields.organisations.issuedLicences] as number) || 0;

      if (!poolMap.has(pool)) {
        poolMap.set(pool, { total: 0, allocated: 0, organisations: [] });
      }

      const poolData = poolMap.get(pool)!;
      poolData.allocated += allocated;
      poolData.organisations.push(org);
    });

    // Define pool capacities (this would typically come from configuration)
    const poolCapacities: Record<string, number> = {
      Standard: 1000,
      Enterprise: 500,
      Professional: 750,
      Basic: 2000,
    };

    return Array.from(poolMap.entries()).map(([pool, data]) => {
      const totalCapacity = poolCapacities[pool] || 1000;
      const utilisation =
        totalCapacity > 0 ? (data.allocated / totalCapacity) * 100 : 0;

      let status: "optimal" | "warning" | "critical" = "optimal";
      if (utilisation > 90) status = "critical";
      else if (utilisation > 75) status = "warning";

      return {
        pool,
        totalCapacity,
        allocated: data.allocated,
        active: Math.floor(data.allocated * 0.85), // Assume 85% active rate
        utilisation,
        status,
        trend: utilisation > 80 ? "up" : utilisation < 50 ? "down" : "stable",
      };
    });
  };

  const processOrganisationMatrix = (
    organisations: PipedriveOrganisation[],
    persons: PipedrivePerson[],
    customFields: any
  ): OrganisationLicenceData[] => {
    // Helper function to check if customer type should be excluded from analytics
    const shouldExcludeCustomerType = (
      customerType: string | undefined
    ): boolean => {
      if (!customerType) return false;
      const excludedTypes = ["Giraffe/WSP", "Land iQ Project Team"];
      return excludedTypes.includes(customerType);
    };

    // Helper function to check if organization should be excluded from analytics
    const shouldExcludeOrganization = (
      organizationName: string | undefined
    ): boolean => {
      if (!organizationName) return false;
      return organizationName.toLowerCase().includes("wsp");
    };

    // Helper function to check if specific email addresses should be excluded from analytics
    const shouldExcludeEmail = (email: string | undefined): boolean => {
      if (!email) return false;
      const excludedEmails = [
        "justin.mcfeeter@dpie.nsw.gov.au",
        "naishadh.dave@dpie.nsw.gov.au",
      ];
      return excludedEmails.includes(email.toLowerCase());
    };

    // Helper to map customer type from ID to label
    const mapCustomerType = (customerTypeId?: string | number): string => {
      if (!customerTypeId) return "Unknown";
      const legacyMappings: Record<string, string> = {
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
      return legacyMappings[String(customerTypeId)] || "Unknown Customer Type";
    };

    // Filter out internal team members from persons data and specific emails
    const filteredPersons = persons.filter((person) => {
      const customerTypeId = person[customFields.persons.customerType];
      const customerType = mapCustomerType(customerTypeId);

      // Exclude internal team members
      if (shouldExcludeCustomerType(customerType)) {
        return false;
      }

      // Exclude specific email addresses
      if (shouldExcludeEmail(person.email)) {
        return false;
      }

      return true;
    });

    return organisations
      .filter((org) => org[customFields.organisations.issuedLicences])
      .filter((org) => !shouldExcludeOrganization(org.name))
      .map((org) => {
        const totalAllocated =
          (org[customFields.organisations.issuedLicences] as number) || 0;
        const orgPersons = filteredPersons.filter(
          (person) => person.org_id === org.id
        );
        const activeUsers = orgPersons.filter(
          (person) =>
            person.last_activity_date &&
            new Date(person.last_activity_date) >
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length;

        // Simulate licence types distribution
        const licenceTypes: Record<string, number> = {
          Standard: Math.floor(totalAllocated * 0.6),
          Professional: Math.floor(totalAllocated * 0.3),
          Enterprise: Math.floor(totalAllocated * 0.1),
        };

        const utilisationRate =
          totalAllocated > 0 ? (activeUsers / totalAllocated) * 100 : 0;

        // Determine status
        let status: "active" | "inactive" | "trial" = "active";
        if (utilisationRate < 10) status = "inactive";
        else if (org.name.toLowerCase().includes("trial")) status = "trial";

        return {
          organisation: org.name,
          organisationId: org.id,
          totalAllocated,
          activeUsers,
          licenceTypes,
          utilisationRate,
          lastActivity:
            orgPersons.length > 0
              ? Math.max(
                  ...orgPersons.map((p) =>
                    new Date(p.last_activity_date || p.add_time).getTime()
                  )
                ).toString()
              : org.add_time,
          status,
        };
      })
      .sort((a, b) => b.totalAllocated - a.totalAllocated);
  };

  const calculateLicenceMetrics = (
    organisations: PipedriveOrganisation[],
    persons: PipedrivePerson[],
    deals: any[],
    customFields: any
  ): LicenceMetrics => {
    // Helper function to check if customer type should be excluded from analytics
    const shouldExcludeCustomerType = (
      customerType: string | undefined
    ): boolean => {
      if (!customerType) return false;
      const excludedTypes = ["Giraffe/WSP", "Land iQ Project Team"];
      return excludedTypes.includes(customerType);
    };

    // Helper function to check if organization should be excluded from analytics
    const shouldExcludeOrganization = (
      organizationName: string | undefined
    ): boolean => {
      if (!organizationName) return false;
      return organizationName.toLowerCase().includes("wsp");
    };

    // Helper function to check if specific email addresses should be excluded from analytics
    const shouldExcludeEmail = (email: string | undefined): boolean => {
      if (!email) return false;
      const excludedEmails = [
        "justin.mcfeeter@dpie.nsw.gov.au",
        "naishadh.dave@dpie.nsw.gov.au",
      ];
      return excludedEmails.includes(email.toLowerCase());
    };

    // Helper to map customer type from ID to label
    const mapCustomerType = (customerTypeId?: string | number): string => {
      if (!customerTypeId) return "Unknown";
      // This would use the same mapping logic as in PipedriveTab
      const legacyMappings: Record<string, string> = {
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
      return legacyMappings[String(customerTypeId)] || "Unknown Customer Type";
    };

    // Filter out internal team members from persons data, WSP organizations, and specific emails
    const filteredPersons = persons.filter((person) => {
      const customerTypeId = person[customFields.persons.customerType];
      const customerType = mapCustomerType(customerTypeId);

      // Exclude internal team members
      if (shouldExcludeCustomerType(customerType)) {
        return false;
      }

      // Find person's organization and exclude WSP organizations
      const org = organisations.find((o) => o.id === person.org_id);
      if (shouldExcludeOrganization(org?.name)) {
        return false;
      }

      // Exclude specific email addresses
      if (shouldExcludeEmail(person.email)) {
        return false;
      }

      return true;
    });

    // Filter out WSP organizations from licence calculations
    const filteredOrganisations = organisations.filter(
      (org) => !shouldExcludeOrganization(org.name)
    );

    const totalLicences = filteredOrganisations.reduce(
      (sum, org) =>
        sum + ((org[customFields.organisations.issuedLicences] as number) || 0),
      0
    );

    const activeLicences = filteredPersons.filter(
      (person) =>
        person.last_activity_date &&
        new Date(person.last_activity_date) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const availableLicences = Math.max(0, 5000 - totalLicences); // Assume total capacity of 5000
    const utilisationRate =
      totalLicences > 0 ? (activeLicences / totalLicences) * 100 : 0;

    // Calculate trial conversions (simplified) - excluding WSP organizations
    const trialOrgs = filteredOrganisations.filter((org) =>
      org.name.toLowerCase().includes("trial")
    );
    const convertedTrials = deals.filter(
      (deal) =>
        deal.status === "won" &&
        trialOrgs.some((trial) => trial.id === deal.org_id)
    ).length;

    // Simulate other metrics
    const expiringLicences = Math.floor(totalLicences * 0.05); // 5% expiring soon
    const costPerUser = 50; // $50 per user per month
    const monthlyRevenue = activeLicences * costPerUser;

    return {
      totalLicences,
      activeLicences,
      availableLicences,
      utilisationRate,
      trialConversions: convertedTrials,
      expiringLicences,
      costPerUser,
      monthlyRevenue,
    };
  };

  const processTrialConversionData = (
    organisations: PipedriveOrganisation[],
    deals: any[],
    customFields: any
  ): ChartDataPoint[] => {
    // Helper function to check if organization should be excluded from analytics
    const shouldExcludeOrganization = (
      organizationName: string | undefined
    ): boolean => {
      if (!organizationName) return false;
      return organizationName.toLowerCase().includes("wsp");
    };

    // Filter out WSP organizations
    const filteredOrganisations = organisations.filter(
      (org) => !shouldExcludeOrganization(org.name)
    );

    const trialOrgs = filteredOrganisations.filter((org) =>
      org.name.toLowerCase().includes("trial")
    );
    const paidOrgs = filteredOrganisations.filter(
      (org) => !org.name.toLowerCase().includes("trial")
    );

    return [
      { label: "Active Trials", value: trialOrgs.length },
      { label: "Converted to Paid", value: paidOrgs.length },
      {
        label: "Conversion Rate",
        value:
          trialOrgs.length > 0
            ? (paidOrgs.length / (trialOrgs.length + paidOrgs.length)) * 100
            : 0,
      },
    ];
  };

  const processTrendsData = (
    organisations: PipedriveOrganisation[],
    timeframe: string
  ): TimeSeriesDataPoint[] => {
    const months = timeframe === "12months" ? 12 : 6;
    const trends: TimeSeriesDataPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Simulate licence growth over time
      const baseValue = organisations.length;
      const growth = (months - i) * 2;
      const value = Math.max(0, baseValue - growth + Math.random() * 10);

      trends.push({
        date: dateStr,
        value: Math.floor(value),
      });
    }

    return trends;
  };

  const handleRefreshData = async () => {
    await loadLicenceManagementData();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "optimal":
      case "active":
        return "default";
      case "warning":
      case "trial":
        return "secondary";
      case "critical":
      case "inactive":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isLoadingData) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Licence Management & Utilisation
          </h2>
          <p className="text-gray-600 mt-1">
            Track licence allocation, utilisation rates, and optimise pool
            distribution across organisations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="12months">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPool} onValueChange={setSelectedPool}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pools</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Licences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.totalLicences.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-blue-600 mt-1">
              <Award className="h-3 w-3 mr-1" />
              Across all pools
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Licences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.activeLicences.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <UserCheck className="h-3 w-3 mr-1" />
              {metrics.utilisationRate.toFixed(1)}% utilisation
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Available Licences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.availableLicences.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <UserX className="h-3 w-3 mr-1" />
              Ready to allocate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${metrics.monthlyRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />${metrics.costPerUser}/user
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Licence Pool Utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Licence Pool Utilisation
          </CardTitle>
          <p className="text-sm text-gray-600">
            Current allocation and capacity across different licence pools
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {poolData.map((pool) => (
              <div key={pool.pool} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">
                      {pool.pool} Pool
                    </h4>
                    <Badge variant={getStatusBadgeVariant(pool.status)}>
                      {pool.status}
                    </Badge>
                    {getTrendIcon(pool.trend)}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {pool.utilisation.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">utilisation</div>
                  </div>
                </div>

                <div className="mb-3">
                  <Progress value={pool.utilisation} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Capacity</p>
                    <p className="font-semibold">
                      {pool.totalCapacity.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Allocated</p>
                    <p className="font-semibold">
                      {pool.allocated.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Active Users</p>
                    <p className="font-semibold">
                      {pool.active.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organisation Matrix and Trial Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organisation Licence Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisation Licence Matrix
            </CardTitle>
            <p className="text-sm text-gray-600">
              Licence allocation and utilisation by organisation
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {organisationData.slice(0, 10).map((org) => (
                <div key={org.organisationId} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {org.organisation}
                      </h5>
                      <Badge
                        variant={getStatusBadgeVariant(org.status)}
                        className="text-xs"
                      >
                        {org.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {org.utilisationRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-600">Allocated</p>
                      <p className="font-semibold">{org.totalAllocated}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Active</p>
                      <p className="font-semibold">{org.activeUsers}</p>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Progress value={org.utilisationRate} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trial Conversion Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Trial Conversion Tracking
            </CardTitle>
            <p className="text-sm text-gray-600">
              Trial to paid licence conversion metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Conversion Metrics */}
              <div className="grid grid-cols-1 gap-4">
                {trialConversionData.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? "bg-blue-500"
                            : index === 1
                            ? "bg-green-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {item.label.includes("Rate")
                          ? `${item.value.toFixed(1)}%`
                          : item.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trial Performance Summary */}
              <div className="border-t pt-4">
                <h6 className="text-sm font-medium text-gray-900 mb-3">
                  Performance Summary
                </h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expiring Soon</span>
                    <span className="font-semibold text-orange-600">
                      {metrics.expiringLicences}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversion Target</span>
                    <span className="font-semibold text-green-600">85%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Licence Trends and Detailed Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Licence Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Licence Utilisation Trends
            </CardTitle>
            <p className="text-sm text-gray-600">
              Historical licence allocation and usage patterns
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {trendsData.slice(-8).map((point, index) => {
                const maxValue = Math.max(...trendsData.map((p) => p.value));
                const height =
                  maxValue > 0 ? (point.value / maxValue) * 100 : 0;

                return (
                  <div
                    key={point.date}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                        {point.value}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 text-center transform -rotate-45 origin-center">
                      {new Date(point.date).toLocaleDateString("en-GB", {
                        month: "short",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Organisation Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detailed Organisation Breakdown
            </CardTitle>
            <p className="text-sm text-gray-600">
              Comprehensive licence allocation details
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Utilisation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organisationData.slice(0, 8).map((org) => (
                    <TableRow key={org.organisationId}>
                      <TableCell className="font-medium">
                        {org.organisation.length > 20
                          ? `${org.organisation.substring(0, 20)}...`
                          : org.organisation}
                      </TableCell>
                      <TableCell>{org.totalAllocated}</TableCell>
                      <TableCell>{org.activeUsers}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{
                                width: `${Math.min(org.utilisationRate, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {org.utilisationRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(org.status)}
                          className="text-xs"
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
