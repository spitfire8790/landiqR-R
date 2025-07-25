"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  Filter,
  Search,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Award,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  FilterOptions,
  UserDistributionData,
  ChartDataPoint,
} from "@/lib/pipedrive-types";

interface UserDistributionTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading: boolean;
}

interface UserTableData {
  id: number;
  name: string;
  organisation: string;
  customerType: string;
  businessUnit: string;
  email?: string;
  phone?: string;
  lastActivity?: string;
  dealsCount: number;
}

export default function UserDistributionTab({
  filters,
  onFilterChange,
  isLoading,
}: UserDistributionTabProps) {
  const [data, setData] = useState<UserDistributionData>({
    usersByOrganisation: [],
    customerTypeBreakdown: [],
    licenceUtilisation: [],
  });
  const [userTableData, setUserTableData] = useState<UserTableData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof UserTableData>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter options
  const [availableFilters, setAvailableFilters] = useState({
    customerTypes: [] as string[],
    licencePools: [] as string[],
    organisationGroups: [] as string[],
    networks: [] as string[],
  });

  useEffect(() => {
    loadUserDistributionData();
  }, [filters]);

  const loadUserDistributionData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch user distribution data with current filters (already labelled)
      const distributionData = await pipedriveService.getUserDistributionData(
        filters
      );
      setData(distributionData);

      // Fetch detailed data for table (persons, organisations and field definitions)
      const [persons, organisations, personFields] = await Promise.all([
        pipedriveService.fetchPersons(),
        pipedriveService.fetchOrganisations(),
        pipedriveService.fetchPersonFields(),
      ]);

      const customFieldMappings = pipedriveService.getCustomFieldMappings();

      // Helper to map raw customer-type value to label
      const toCustomerTypeLabel = (raw: any): string =>
        pipedriveService.mapCustomFieldValue(
          customFieldMappings.persons.customerType,
          raw,
          personFields
        ) || "Unknown";

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

      // Build table data (excluding internal team members)
      const tableData: UserTableData[] = persons
        .map((person) => {
          const org = organisations.find((o) => o.id === person.org_id);
          const customerTypeLabel = toCustomerTypeLabel(
            person[customFieldMappings.persons.customerType]
          );
          return {
            id: person.id,
            name: person.name,
            organisation: org?.name || "Unknown Organisation",
            customerType: customerTypeLabel,
            businessUnit:
              person[customFieldMappings.persons.businessUnit] || "Unknown",
            email: person.email,
            phone: person.phone,
            lastActivity: person.last_activity_date,
            dealsCount:
              person.open_deals_count +
              person.won_deals_count +
              person.lost_deals_count,
          };
        })
        .filter((user) => !shouldExcludeCustomerType(user.customerType))
        .filter((user) => !shouldExcludeOrganization(user.organisation))
        .filter((user) => !shouldExcludeEmail(user.email));

      setUserTableData(tableData);

      // Extract available filter options
      const customerTypes = [
        ...new Set(
          persons
            .map((p) =>
              toCustomerTypeLabel(p[customFieldMappings.persons.customerType])
            )
            .filter(Boolean) as string[]
        ),
      ];

      const licencePools = [
        ...new Set(
          organisations
            .map((o) => o[customFieldMappings.organisations.licencePool])
            .filter(Boolean) as string[]
        ),
      ];

      const organisationGroups = [
        ...new Set(
          organisations
            .map((o) => o[customFieldMappings.organisations.organisationGroup])
            .filter(Boolean) as string[]
        ),
      ];

      const networks = [
        ...new Set(
          organisations
            .map((o) => o[customFieldMappings.organisations.network])
            .filter(Boolean) as string[]
        ),
      ];

      setAvailableFilters({
        customerTypes,
        licencePools,
        organisationGroups,
        networks,
      });
    } catch (error) {
      console.error("Error loading user distribution data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filter and sort table data
  const filteredAndSortedData = userTableData
    .filter((user) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.organisation.toLowerCase().includes(searchLower) ||
          user.customerType.toLowerCase().includes(searchLower) ||
          user.businessUnit.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  const handleSort = (field: keyof UserTableData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (type: keyof FilterOptions, value: string) => {
    if (type === "dateRange") return; // Handle separately if needed

    const currentArray = filters[type] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value];

    onFilterChange({
      ...filters,
      [type]: newArray,
    });
  };

  // Chart components (simplified for now)
  const ChartCard = ({
    title,
    data,
    type,
  }: {
    title: string;
    data: ChartDataPoint[];
    type: "bar" | "pie";
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {type === "bar" ? (
            <BarChart3 className="h-5 w-5" />
          ) : (
            <PieChart className="h-5 w-5" />
          )}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-3">
            {data.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm truncate max-w-xs">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{item.value}</span>
                  <div
                    className="h-2 bg-blue-200 rounded-full"
                    style={{
                      width: `${Math.max(
                        (item.value / Math.max(...data.map((d) => d.value))) *
                          100,
                        10
                      )}px`,
                    }}
                  >
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${
                          (item.value / Math.max(...data.map((d) => d.value))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          User Distribution Analytics
        </h2>
        <p className="text-gray-600">
          Analyse user distribution across organisations with advanced filtering
          capabilities
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Customer Type
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange("customerTypes", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  {availableFilters.customerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Licence Pool
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange("licencePools", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select licence pool" />
                </SelectTrigger>
                <SelectContent>
                  {availableFilters.licencePools.map((pool) => (
                    <SelectItem key={pool} value={pool}>
                      {pool}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Organisation Group
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange("organisationGroups", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation group" />
                </SelectTrigger>
                <SelectContent>
                  {availableFilters.organisationGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Network
              </label>
              <Select
                onValueChange={(value) => handleFilterChange("networks", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {availableFilters.networks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.customerTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleFilterChange("customerTypes", type)}
              >
                Customer: {type} ×
              </Badge>
            ))}
            {filters.licencePools.map((pool) => (
              <Badge
                key={pool}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleFilterChange("licencePools", pool)}
              >
                Licence Pool: {pool} ×
              </Badge>
            ))}
            {filters.organisationGroups.map((group) => (
              <Badge
                key={group}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleFilterChange("organisationGroups", group)}
              >
                Org Group: {group} ×
              </Badge>
            ))}
            {filters.networks.map((network) => (
              <Badge
                key={network}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleFilterChange("networks", network)}
              >
                Network: {network} ×
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {isLoadingData ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard
            title="Users by Organisation"
            data={data.usersByOrganisation}
            type="bar"
          />
          <ChartCard
            title="Customer Type Breakdown"
            data={data.customerTypeBreakdown}
            type="pie"
          />
          <ChartCard
            title="Licence Utilisation"
            data={data.licenceUtilisation}
            type="bar"
          />
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Details</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("name")}
                  >
                    Name{" "}
                    {sortField === "name" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("organisation")}
                  >
                    Organisation{" "}
                    {sortField === "organisation" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("customerType")}
                  >
                    Customer Type{" "}
                    {sortField === "customerType" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("businessUnit")}
                  >
                    Business Unit{" "}
                    {sortField === "businessUnit" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("dealsCount")}
                  >
                    Deals{" "}
                    {sortField === "dealsCount" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.slice(0, 100).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.organisation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.customerType}</Badge>
                    </TableCell>
                    <TableCell>{user.businessUnit}</TableCell>
                    <TableCell className="text-sm">
                      {user.email && <div>{user.email}</div>}
                      {user.phone && (
                        <div className="text-gray-500">{user.phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {user.dealsCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.lastActivity
                        ? new Date(user.lastActivity).toLocaleDateString(
                            "en-GB"
                          )
                        : "No activity"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedData.length > 100 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing first 100 of {filteredAndSortedData.length} users. Use
              search to narrow results.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
