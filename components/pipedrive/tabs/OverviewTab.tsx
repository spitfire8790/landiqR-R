"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Building2,
  Target,
  Award,
  Clock,
  CheckCircle,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import { FilterOptions } from "@/lib/pipedrive-types";

interface OverviewTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading: boolean;
}

interface MetricCardData {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
}

export default function OverviewTab({
  filters,
  onFilterChange,
  isLoading,
}: OverviewTabProps) {
  const [metrics, setMetrics] = useState<MetricCardData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [quickStats, setQuickStats] = useState({
    activeDeals: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgDealValue: 0,
    totalOrganisations: 0,
    totalUsers: 0,
    recentActivities: 0,
    licenceUtilisation: 0,
  });

  useEffect(() => {
    loadOverviewData();
  }, [filters]);

  const loadOverviewData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch all necessary data in parallel
      const [deals, persons, organisations, activities] = await Promise.all([
        pipedriveService.fetchDeals(),
        pipedriveService.fetchPersons(),
        pipedriveService.fetchOrganisations(),
        pipedriveService.fetchActivities(),
      ]);

      // Calculate key metrics
      const activeDeals = deals.filter((deal) => deal.status === "open").length;
      const wonDeals = deals.filter((deal) => deal.status === "won");
      const totalRevenue = wonDeals.reduce(
        (sum, deal) => sum + (deal.value || 0),
        0
      );
      const conversionRate =
        deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
      const avgDealValue =
        wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

      // Recent activities (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentActivities = activities.filter(
        (activity) => new Date(activity.add_time) > thirtyDaysAgo
      ).length;

      // Licence utilisation calculation
      const customFieldMappings = pipedriveService.getCustomFieldMappings();
      const organisationsWithLicences = organisations.filter(
        (org) => org[customFieldMappings.organisations.issuedLicences]
      );
      const totalIssuedLicences = organisationsWithLicences.reduce(
        (sum, org) =>
          sum +
          ((org[customFieldMappings.organisations.issuedLicences] as number) ||
            0),
        0
      );

      const stats = {
        activeDeals,
        totalRevenue,
        conversionRate,
        avgDealValue,
        totalOrganisations: organisations.length,
        totalUsers: persons.length,
        recentActivities,
        licenceUtilisation: totalIssuedLicences,
      };

      setQuickStats(stats);

      // Build metrics cards
      const metricsData: MetricCardData[] = [
        {
          title: "Active Deals",
          value: activeDeals,
          icon: <Target className="h-6 w-6 text-blue-600" />,
          trend: activeDeals > 0 ? "up" : "neutral",
          subtitle: `${deals.length} total deals`,
        },
        {
          title: "Total Revenue",
          value: `$${(totalRevenue / 1000).toFixed(1)}k`,
          icon: <DollarSign className="h-6 w-6 text-green-600" />,
          trend: totalRevenue > 0 ? "up" : "neutral",
          subtitle: `${wonDeals.length} closed deals`,
        },
        {
          title: "Conversion Rate",
          value: `${conversionRate.toFixed(1)}%`,
          icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
          trend:
            conversionRate > 20
              ? "up"
              : conversionRate > 10
              ? "neutral"
              : "down",
          subtitle: "Deal success rate",
        },
        {
          title: "Avg Deal Value",
          value: `$${(avgDealValue / 1000).toFixed(1)}k`,
          icon: <Award className="h-6 w-6 text-orange-600" />,
          trend: avgDealValue > 50000 ? "up" : "neutral",
          subtitle: "Per successful deal",
        },
        {
          title: "Organisations",
          value: organisations.length,
          icon: <Building2 className="h-6 w-6 text-indigo-600" />,
          trend: "neutral",
          subtitle: "Total in CRM",
        },
        {
          title: "Active Users",
          value: persons.length,
          icon: <Users className="h-6 w-6 text-cyan-600" />,
          trend: "neutral",
          subtitle: "Contact persons",
        },
        {
          title: "Recent Activities",
          value: recentActivities,
          icon: <Activity className="h-6 w-6 text-pink-600" />,
          trend: recentActivities > 50 ? "up" : "neutral",
          subtitle: "Last 30 days",
        },
        {
          title: "Licences Issued",
          value: totalIssuedLicences,
          icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
          trend: "neutral",
          subtitle: "Total allocations",
        },
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error("Error loading overview data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const MetricCard = ({ metric }: { metric: MetricCardData }) => {
    const getTrendIcon = () => {
      switch (metric.trend) {
        case "up":
          return <TrendingUp className="h-4 w-4 text-green-500" />;
        case "down":
          return <TrendingDown className="h-4 w-4 text-red-500" />;
        default:
          return null;
      }
    };

    const getTrendColor = () => {
      switch (metric.trend) {
        case "up":
          return "text-green-600";
        case "down":
          return "text-red-600";
        default:
          return "text-gray-600";
      }
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {metric.icon}
              <h3 className="text-sm font-medium text-gray-700">
                {metric.title}
              </h3>
            </div>
            {getTrendIcon()}
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            {metric.subtitle && (
              <p className="text-sm text-gray-500">{metric.subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Overview
        </h2>
        <p className="text-gray-600">
          Key performance indicators and summary metrics for your Pipedrive CRM
          data
        </p>
      </div>

      {/* Metrics Grid */}
      {isLoadingData ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      )}

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Pipeline Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conversion Rate</span>
                <span className="font-medium">
                  {quickStats.conversionRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={quickStats.conversionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deal Activity</span>
                <span className="font-medium">
                  {quickStats.activeDeals} active
                </span>
              </div>
              <Progress
                value={
                  (quickStats.activeDeals /
                    Math.max(quickStats.activeDeals + 20, 1)) *
                  100
                }
                className="h-2"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">
                Your pipeline shows a{" "}
                {quickStats.conversionRate > 15
                  ? "strong"
                  : quickStats.conversionRate > 10
                  ? "moderate"
                  : "developing"}{" "}
                conversion rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Customer Engagement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Organisations</span>
                <span className="font-medium">
                  {quickStats.totalOrganisations}
                </span>
              </div>
              <Progress
                value={
                  (quickStats.totalOrganisations /
                    Math.max(quickStats.totalOrganisations + 10, 1)) *
                  100
                }
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contact Persons</span>
                <span className="font-medium">{quickStats.totalUsers}</span>
              </div>
              <Progress
                value={
                  (quickStats.totalUsers /
                    Math.max(quickStats.totalUsers + 20, 1)) *
                  100
                }
                className="h-2"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">
                Average of{" "}
                {quickStats.totalOrganisations > 0
                  ? (
                      quickStats.totalUsers / quickStats.totalOrganisations
                    ).toFixed(1)
                  : 0}{" "}
                contacts per organisation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Recent Activity
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {quickStats.recentActivities}
                </p>
                <p className="text-sm text-gray-500">Actions in last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Licence Utilisation
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {quickStats.licenceUtilisation}
                </p>
                <p className="text-sm text-gray-500">Total licences issued</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Revenue Performance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(quickStats.totalRevenue / 1000).toFixed(0)}k
                </p>
                <p className="text-sm text-gray-500">Total won deals value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
