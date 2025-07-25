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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Calculator,
  Award,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Zap,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  FilterOptions,
  ChartDataPoint,
  TimeSeriesDataPoint,
  PipedriveDeal,
} from "@/lib/pipedrive-types";

interface RevenueAnalysisTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading?: boolean;
}

interface RevenueMetrics {
  totalRevenue: number;
  projectedRevenue: number;
  averageDealValue: number;
  revenueGrowthRate: number;
  conversionRate: number;
  salesVelocity: number;
  winRate: number;
  totalForecast: number;
}

interface RevenueByPeriod {
  period: string;
  actualRevenue: number;
  projectedRevenue: number;
  dealCount: number;
  averageDealSize: number;
}

interface ForecastData {
  month: string;
  conservativeEstimate: number;
  optimisticEstimate: number;
  actualRevenue: number;
  confidence: number;
}

interface RevenueSourceData {
  source: string;
  revenue: number;
  dealCount: number;
  averageDealSize: number;
  conversionRate: number;
  growth: number;
}

export default function RevenueAnalysisTab({
  filters,
  onFilterChange,
  isLoading,
}: RevenueAnalysisTabProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    projectedRevenue: 0,
    averageDealValue: 0,
    revenueGrowthRate: 0,
    conversionRate: 0,
    salesVelocity: 0,
    winRate: 0,
    totalForecast: 0,
  });
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [revenueBySource, setRevenueBySource] = useState<RevenueSourceData[]>(
    []
  );
  const [dealValueDistribution, setDealValueDistribution] = useState<
    ChartDataPoint[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("12months");
  const [selectedForecastMethod, setSelectedForecastMethod] =
    useState("pipeline");

  useEffect(() => {
    loadRevenueAnalyticsData();
  }, [filters, selectedTimeframe, selectedForecastMethod]);

  const loadRevenueAnalyticsData = async () => {
    setIsLoadingData(true);
    try {
      // Load deals data
      const deals = await pipedriveService.fetchDeals(2000);
      const users = await pipedriveService.fetchUsers();

      // Filter deals based on date range
      const dateRange = getDateRange(selectedTimeframe);
      const cutoffDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

      const recentDeals = deals.filter(
        (deal) => new Date(deal.add_time) >= cutoffDate
      );

      // Calculate key metrics
      const wonDeals = recentDeals.filter((deal) => deal.status === "won");
      const lostDeals = recentDeals.filter((deal) => deal.status === "lost");
      const openDeals = recentDeals.filter((deal) => deal.status === "open");

      const totalRevenue = wonDeals.reduce(
        (sum, deal) => sum + (deal.weighted_value || 0),
        0
      );
      const projectedRevenue = openDeals.reduce(
        (sum, deal) =>
          sum + ((deal.weighted_value || 0) * (deal.probability || 0)) / 100,
        0
      );
      const averageDealValue =
        wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
      const conversionRate =
        recentDeals.length > 0
          ? (wonDeals.length / recentDeals.length) * 100
          : 0;
      const winRate =
        wonDeals.length + lostDeals.length > 0
          ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
          : 0;

      // Calculate revenue growth rate (simplified)
      const prevPeriodDeals = deals.filter((deal) => {
        const dealDate = new Date(deal.add_time);
        const prevCutoff = new Date(
          cutoffDate.getTime() - dateRange * 24 * 60 * 60 * 1000
        );
        return (
          dealDate >= prevCutoff &&
          dealDate < cutoffDate &&
          deal.status === "won"
        );
      });
      const prevRevenue = prevPeriodDeals.reduce(
        (sum, deal) => sum + (deal.weighted_value || 0),
        0
      );
      const revenueGrowthRate =
        prevRevenue > 0
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
          : 0;

      // Calculate sales velocity (simplified - deals per month)
      const monthsInPeriod = dateRange / 30;
      const salesVelocity =
        monthsInPeriod > 0 ? wonDeals.length / monthsInPeriod : 0;

      const revenueMetrics: RevenueMetrics = {
        totalRevenue,
        projectedRevenue,
        averageDealValue,
        revenueGrowthRate,
        conversionRate,
        salesVelocity,
        winRate,
        totalForecast: totalRevenue + projectedRevenue,
      };
      setMetrics(revenueMetrics);

      // Process revenue by period
      const periodData = processRevenueByPeriod(deals, selectedTimeframe);
      setRevenueByPeriod(periodData);

      // Process forecast data
      const forecast = generateForecastData(deals, selectedForecastMethod);
      setForecastData(forecast);

      // Process revenue by source
      const sourceData = processRevenueBySource(deals);
      setRevenueBySource(sourceData);

      // Process deal value distribution
      const valueDistribution = processDealValueDistribution(wonDeals);
      setDealValueDistribution(valueDistribution);
    } catch (error) {
      console.error("Error loading revenue analytics data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getDateRange = (timeframe: string): number => {
    switch (timeframe) {
      case "3months":
        return 90;
      case "6months":
        return 180;
      case "12months":
        return 365;
      case "24months":
        return 730;
      default:
        return 365;
    }
  };

  const processRevenueByPeriod = (
    deals: PipedriveDeal[],
    timeframe: string
  ): RevenueByPeriod[] => {
    const periods =
      timeframe === "24months" ? 24 : timeframe === "12months" ? 12 : 6;
    const periodData: RevenueByPeriod[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - i - 1);
      periodStart.setDate(1);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);

      const periodDeals = deals.filter((deal) => {
        if (deal.status !== "won") return false;
        const dealDate = new Date(
          deal.won_time || deal.close_time || deal.add_time
        );
        return dealDate >= periodStart && dealDate <= periodEnd;
      });

      const openDeals = deals.filter((deal) => {
        if (deal.status !== "open") return false;
        const dealDate = new Date(deal.add_time);
        return dealDate >= periodStart && dealDate <= periodEnd;
      });

      const actualRevenue = periodDeals.reduce(
        (sum, deal) => sum + (deal.weighted_value || 0),
        0
      );
      const projectedRevenue = openDeals.reduce(
        (sum, deal) =>
          sum + ((deal.weighted_value || 0) * (deal.probability || 0)) / 100,
        0
      );

      periodData.push({
        period: periodStart.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
        }),
        actualRevenue,
        projectedRevenue,
        dealCount: periodDeals.length,
        averageDealSize:
          periodDeals.length > 0 ? actualRevenue / periodDeals.length : 0,
      });
    }

    return periodData;
  };

  const generateForecastData = (
    deals: PipedriveDeal[],
    method: string
  ): ForecastData[] => {
    const forecastData: ForecastData[] = [];
    const historicalMonths = 6;

    // Get historical revenue data
    const historicalData = [];
    for (let i = historicalMonths - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i - 1);
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthDeals = deals.filter((deal) => {
        if (deal.status !== "won") return false;
        const dealDate = new Date(
          deal.won_time || deal.close_time || deal.add_time
        );
        return dealDate >= monthStart && dealDate <= monthEnd;
      });

      const revenue = monthDeals.reduce(
        (sum, deal) => sum + (deal.weighted_value || 0),
        0
      );
      historicalData.push(revenue);
    }

    // Generate forecast for next 6 months
    for (let i = 0; i < 6; i++) {
      const forecastMonth = new Date();
      forecastMonth.setMonth(forecastMonth.getMonth() + i);

      // Simple trend-based forecast
      const avgRevenue =
        historicalData.reduce((sum, rev) => sum + rev, 0) /
        historicalData.length;
      const trend =
        historicalData.length > 1
          ? (historicalData[historicalData.length - 1] - historicalData[0]) /
            (historicalData.length - 1)
          : 0;

      const baseEstimate = avgRevenue + trend * i;
      const conservativeEstimate = baseEstimate * 0.8;
      const optimisticEstimate = baseEstimate * 1.2;

      // Calculate confidence based on historical variance
      const variance =
        historicalData.reduce(
          (sum, rev) => sum + Math.pow(rev - avgRevenue, 2),
          0
        ) / historicalData.length;
      const confidence = Math.max(
        60,
        100 - (Math.sqrt(variance) / avgRevenue) * 100
      );

      forecastData.push({
        month: forecastMonth.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
        }),
        conservativeEstimate,
        optimisticEstimate,
        actualRevenue: 0, // Future months
        confidence,
      });
    }

    return forecastData;
  };

  const processRevenueBySource = (
    deals: PipedriveDeal[]
  ): RevenueSourceData[] => {
    const sourceMap = new Map<
      string,
      {
        deals: PipedriveDeal[];
        wonDeals: PipedriveDeal[];
        revenue: number;
      }
    >();

    deals.forEach((deal) => {
      const source =
        deal["72eeb13403477994f5b87d9d436a2df1bbae0133"] || "Unknown";
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { deals: [], wonDeals: [], revenue: 0 });
      }

      const sourceData = sourceMap.get(source)!;
      sourceData.deals.push(deal);

      if (deal.status === "won") {
        sourceData.wonDeals.push(deal);
        sourceData.revenue += deal.weighted_value || 0;
      }
    });

    return Array.from(sourceMap.entries())
      .map(([source, data]) => {
        const conversionRate =
          data.deals.length > 0
            ? (data.wonDeals.length / data.deals.length) * 100
            : 0;
        const averageDealSize =
          data.wonDeals.length > 0 ? data.revenue / data.wonDeals.length : 0;

        // Calculate growth (simplified - compare recent vs older deals)
        const recentRevenue = data.wonDeals
          .filter(
            (deal) =>
              new Date(deal.add_time) >=
              new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          )
          .reduce((sum, deal) => sum + (deal.weighted_value || 0), 0);
        const olderRevenue = data.wonDeals
          .filter((deal) => {
            const dealDate = new Date(deal.add_time);
            return (
              dealDate < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) &&
              dealDate >= new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
            );
          })
          .reduce((sum, deal) => sum + (deal.weighted_value || 0), 0);

        const growth =
          olderRevenue > 0
            ? ((recentRevenue - olderRevenue) / olderRevenue) * 100
            : 0;

        return {
          source,
          revenue: data.revenue,
          dealCount: data.wonDeals.length,
          averageDealSize,
          conversionRate,
          growth,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  };

  const processDealValueDistribution = (
    wonDeals: PipedriveDeal[]
  ): ChartDataPoint[] => {
    const ranges = [
      { label: "$0 - $10K", min: 0, max: 10000 },
      { label: "$10K - $25K", min: 10000, max: 25000 },
      { label: "$25K - $50K", min: 25000, max: 50000 },
      { label: "$50K - $100K", min: 50000, max: 100000 },
      { label: "$100K - $250K", min: 100000, max: 250000 },
      { label: "$250K+", min: 250000, max: Infinity },
    ];

    return ranges.map((range) => {
      const dealsInRange = wonDeals.filter((deal) => {
        const value = deal.weighted_value || 0;
        return value >= range.min && value < range.max;
      });

      return {
        label: range.label,
        value: dealsInRange.length,
        metadata: {
          totalValue: dealsInRange.reduce(
            (sum, deal) => sum + (deal.weighted_value || 0),
            0
          ),
        },
      };
    });
  };

  const handleRefreshData = async () => {
    await loadRevenueAnalyticsData();
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
            Revenue Analysis & Forecasting
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive revenue analytics, forecasting, and performance
            insights
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
              <SelectItem value="24months">24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedForecastMethod}
            onValueChange={setSelectedForecastMethod}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pipeline">Pipeline</SelectItem>
              <SelectItem value="historical">Historical</SelectItem>
              <SelectItem value="trend">Trend</SelectItem>
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
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {metrics.revenueGrowthRate.toFixed(1)}% growth
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Projected Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${metrics.projectedRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-blue-600 mt-1">
              <Target className="h-3 w-3 mr-1" />
              From open pipeline
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Deal Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${metrics.averageDealValue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Calculator className="h-3 w-3 mr-1" />
              Per closed deal
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.winRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <Award className="h-3 w-3 mr-1" />
              {metrics.conversionRate.toFixed(1)}% conversion
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends and Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Period Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Revenue Trends
            </CardTitle>
            <p className="text-sm text-gray-600">
              Historical revenue performance by period
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {revenueByPeriod.slice(-12).map((period, index) => {
                const maxRevenue = Math.max(
                  ...revenueByPeriod.map((p) => p.actualRevenue)
                );
                const height =
                  maxRevenue > 0
                    ? (period.actualRevenue / maxRevenue) * 100
                    : 0;

                return (
                  <div
                    key={period.period}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                        ${(period.actualRevenue / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 text-center transform -rotate-45 origin-center">
                      {period.period}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Forecast
            </CardTitle>
            <p className="text-sm text-gray-600">
              6-month revenue projections with confidence intervals
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecastData.slice(0, 3).map((forecast, index) => (
                <div key={forecast.month} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">
                      {forecast.month}
                    </h4>
                    <Badge variant="outline">
                      {forecast.confidence.toFixed(0)}% confidence
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Conservative</p>
                      <p className="font-semibold">
                        ${forecast.conservativeEstimate.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Optimistic</p>
                      <p className="font-semibold">
                        ${forecast.optimisticEstimate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={forecast.confidence} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Sources and Deal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Revenue by Source
            </CardTitle>
            <p className="text-sm text-gray-600">
              Revenue performance and growth by lead source
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueBySource.slice(0, 5).map((source) => (
                <div key={source.source} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">
                      {source.source}
                    </h4>
                    <Badge variant="outline">
                      ${source.revenue.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Deals Won</p>
                      <p className="font-semibold">{source.dealCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg Deal Size</p>
                      <p className="font-semibold">
                        ${source.averageDealSize.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Conversion Rate</p>
                      <p className="font-semibold">
                        {source.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Growth</p>
                      <p
                        className={`font-semibold ${
                          source.growth >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {source.growth >= 0 ? "+" : ""}
                        {source.growth.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deal Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Deal Value Distribution
            </CardTitle>
            <p className="text-sm text-gray-600">
              Number of deals by value range
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dealValueDistribution.map((range) => {
                const maxCount = Math.max(
                  ...dealValueDistribution.map((r) => r.value)
                );
                const percentage =
                  maxCount > 0 ? (range.value / maxCount) * 100 : 0;

                return (
                  <div
                    key={range.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-gray-900 w-20">
                        {range.label}
                      </span>
                      <Progress value={percentage} className="flex-1 h-2" />
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {range.value} deals
                      </div>
                      <div className="text-xs text-gray-600">
                        ${(range.metadata?.totalValue || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Revenue Performance Summary
          </CardTitle>
          <p className="text-sm text-gray-600">
            Key revenue metrics and performance indicators
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                ${metrics.totalForecast.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Forecast</div>
              <div className="text-xs text-gray-500 mt-1">
                Current + Projected
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {metrics.salesVelocity.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Sales Velocity</div>
              <div className="text-xs text-gray-500 mt-1">Deals per month</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {metrics.conversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                All opportunities
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {metrics.revenueGrowthRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Growth Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                Period over period
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
