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
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Filter,
  Download,
  RefreshCw,
  ArrowRight,
  Calendar,
  CreditCard,
  Receipt,
  Banknote,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import {
  FilterOptions,
  DealPipelineData,
  ChartDataPoint,
  PipedriveDeal,
} from "@/lib/pipedrive-types";

interface DealPipelineTabProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isLoading?: boolean;
}

interface StageData {
  id: number;
  name: string;
  dealCount: number;
  totalValue: number;
  avgValue: number;
  conversionRate: number;
  avgTimeInStage: number;
  deals: PipedriveDeal[];
}

interface PaymentWorkflowData {
  dealId: number;
  dealTitle: string;
  expectedClose: string;
  paymentDue: string;
  invoiceSent: string;
  paymentReceived: string;
  value: number;
  status: "on-time" | "warning" | "overdue" | "completed";
  daysInStage: number;
}

interface SourceAnalysisData {
  source: string;
  dealCount: number;
  totalValue: number;
  conversionRate: number;
  avgDealSize: number;
  roi: number;
}

interface CategoryPerformanceData {
  category: string;
  avgDealValue: number;
  conversionRate: number;
  avgTimeToClose: number;
  winRate: number;
  dealCount: number;
}

export default function DealPipelineTab({
  filters,
  onFilterChange,
  isLoading,
}: DealPipelineTabProps) {
  const [data, setData] = useState<DealPipelineData>({
    pipelineStages: [],
    paymentWorkflow: [],
    sourceAnalysis: [],
    categoryPerformance: [],
    totalDeals: 0,
    totalValue: 0,
    avgDealSize: 0,
    overallConversionRate: 0,
  });
  const [stageData, setStageData] = useState<StageData[]>([]);
  const [paymentWorkflowData, setPaymentWorkflowData] = useState<
    PaymentWorkflowData[]
  >([]);
  const [sourceAnalysisData, setSourceAnalysisData] = useState<
    SourceAnalysisData[]
  >([]);
  const [categoryData, setCategoryData] = useState<CategoryPerformanceData[]>(
    []
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("3months");

  useEffect(() => {
    loadDealPipelineData();
  }, [filters, selectedTimeframe]);

  const loadDealPipelineData = async () => {
    setIsLoadingData(true);
    try {
      // Load deal pipeline data
      const pipelineData = await pipedriveService.getDealPipelineData();
      setData(pipelineData);

      // Load and process deals for detailed analysis
      const deals = await pipedriveService.fetchDeals(1000);
      const stages = await pipedriveService.fetchStages();

      // Process stage data
      const processedStageData = stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stage_id === stage.id);
        const totalValue = stageDeals.reduce(
          (sum, deal) => sum + (deal.weighted_value || 0),
          0
        );

        return {
          id: stage.id,
          name: stage.name,
          dealCount: stageDeals.length,
          totalValue,
          avgValue: stageDeals.length > 0 ? totalValue / stageDeals.length : 0,
          conversionRate: calculateConversionRate(stage.id, deals),
          avgTimeInStage: calculateAvgTimeInStage(stageDeals),
          deals: stageDeals,
        };
      });
      setStageData(processedStageData);

      // Process payment workflow data
      const paymentData = deals
        .filter((deal) => deal.status === "open" || deal.status === "won")
        .map((deal) => {
          const expectedClose = deal.expected_close_date || deal.close_time;
          const paymentDue = deal["445a7485337836c47de4a95f3fd627f0b5a08729"];
          const invoiceSent = deal["bb3eed6ef002960b8112b08c116865683c46a444"];
          const paymentReceived =
            deal["a111795c53afab3af6785e6ce8e7c9bf7a377136"];

          return {
            dealId: deal.id,
            dealTitle: deal.title,
            expectedClose: expectedClose || "",
            paymentDue: paymentDue || "",
            invoiceSent: invoiceSent || "",
            paymentReceived: paymentReceived || "",
            value: deal.weighted_value || 0,
            status: determinePaymentStatus(
              expectedClose,
              paymentDue,
              invoiceSent,
              paymentReceived
            ),
            daysInStage: calculateDaysInCurrentStage(deal),
          };
        });
      setPaymentWorkflowData(paymentData);

      // Process source analysis
      const sourceMap = new Map<
        string,
        { deals: PipedriveDeal[]; totalValue: number }
      >();
      deals.forEach((deal) => {
        const source =
          deal["72eeb13403477994f5b87d9d436a2df1bbae0133"] || "Unknown";
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { deals: [], totalValue: 0 });
        }
        sourceMap.get(source)!.deals.push(deal);
        sourceMap.get(source)!.totalValue += deal.weighted_value || 0;
      });

      const sourceAnalysis = Array.from(sourceMap.entries()).map(
        ([source, data]) => ({
          source,
          dealCount: data.deals.length,
          totalValue: data.totalValue,
          conversionRate: calculateSourceConversionRate(data.deals),
          avgDealSize:
            data.deals.length > 0 ? data.totalValue / data.deals.length : 0,
          roi: calculateSourceROI(data.deals),
        })
      );
      setSourceAnalysisData(sourceAnalysis);

      // Process category performance
      const categoryMap = new Map<string, PipedriveDeal[]>();
      deals.forEach((deal) => {
        const category =
          deal["7181253bf2d9ddfbd638a885fca2d2bc30956697"] || "Uncategorised";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(deal);
      });

      const categoryPerformance = Array.from(categoryMap.entries()).map(
        ([category, deals]) => ({
          category,
          avgDealValue:
            deals.length > 0
              ? deals.reduce(
                  (sum, deal) => sum + (deal.weighted_value || 0),
                  0
                ) / deals.length
              : 0,
          conversionRate: calculateCategoryConversionRate(deals),
          avgTimeToClose: calculateAvgTimeToClose(deals),
          winRate: calculateWinRate(deals),
          dealCount: deals.length,
        })
      );
      setCategoryData(categoryPerformance);
    } catch (error) {
      console.error("Error loading deal pipeline data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Helper functions
  const calculateConversionRate = (
    stageId: number,
    allDeals: PipedriveDeal[]
  ): number => {
    const stageDeals = allDeals.filter((deal) => deal.stage_id === stageId);
    const wonDeals = stageDeals.filter((deal) => deal.status === "won");
    return stageDeals.length > 0
      ? (wonDeals.length / stageDeals.length) * 100
      : 0;
  };

  const calculateAvgTimeInStage = (deals: PipedriveDeal[]): number => {
    const times = deals
      .filter((deal) => deal.stage_change_time && deal.add_time)
      .map((deal) => {
        const stageChangeTime = new Date(deal.stage_change_time).getTime();
        const addTime = new Date(deal.add_time).getTime();
        return Math.max(0, (stageChangeTime - addTime) / (1000 * 60 * 60 * 24)); // days
      });
    return times.length > 0
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0;
  };

  const determinePaymentStatus = (
    expectedClose: string,
    paymentDue: string,
    invoiceSent: string,
    paymentReceived: string
  ): "on-time" | "warning" | "overdue" | "completed" => {
    if (paymentReceived) return "completed";

    const now = new Date();
    const dueDate = paymentDue
      ? new Date(paymentDue)
      : expectedClose
      ? new Date(expectedClose)
      : null;

    if (!dueDate) return "on-time";

    const daysUntilDue =
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 0) return "overdue";
    if (daysUntilDue <= 7) return "warning";
    return "on-time";
  };

  const calculateDaysInCurrentStage = (deal: PipedriveDeal): number => {
    const stageChangeTime = deal.stage_change_time
      ? new Date(deal.stage_change_time)
      : new Date(deal.add_time);
    const now = new Date();
    return Math.floor(
      (now.getTime() - stageChangeTime.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const calculateSourceConversionRate = (deals: PipedriveDeal[]): number => {
    const wonDeals = deals.filter((deal) => deal.status === "won");
    return deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
  };

  const calculateSourceROI = (deals: PipedriveDeal[]): number => {
    // Simplified ROI calculation - this would need actual cost data
    const totalRevenue = deals
      .filter((deal) => deal.status === "won")
      .reduce((sum, deal) => sum + (deal.weighted_value || 0), 0);
    const estimatedCost = deals.length * 1000; // Placeholder cost per deal
    return estimatedCost > 0
      ? ((totalRevenue - estimatedCost) / estimatedCost) * 100
      : 0;
  };

  const calculateCategoryConversionRate = (deals: PipedriveDeal[]): number => {
    const wonDeals = deals.filter((deal) => deal.status === "won");
    return deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
  };

  const calculateAvgTimeToClose = (deals: PipedriveDeal[]): number => {
    const closedDeals = deals.filter(
      (deal) => deal.close_time && deal.add_time
    );
    const times = closedDeals.map((deal) => {
      const closeTime = new Date(deal.close_time!).getTime();
      const addTime = new Date(deal.add_time).getTime();
      return (closeTime - addTime) / (1000 * 60 * 60 * 24); // days
    });
    return times.length > 0
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0;
  };

  const calculateWinRate = (deals: PipedriveDeal[]): number => {
    const closedDeals = deals.filter(
      (deal) => deal.status === "won" || deal.status === "lost"
    );
    const wonDeals = deals.filter((deal) => deal.status === "won");
    return closedDeals.length > 0
      ? (wonDeals.length / closedDeals.length) * 100
      : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "on-time":
        return "bg-blue-500";
      case "warning":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "on-time":
        return "secondary";
      case "warning":
        return "destructive";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleRefreshData = async () => {
    await loadDealPipelineData();
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
            Deal Pipeline & Workflow Analysis
          </h2>
          <p className="text-gray-600 mt-1">
            Analyse deal progression through your sales pipeline and payment
            workflows
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
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
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
              Total Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data.totalDeals}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              12% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${(data.totalValue || 0).toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              8% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Deal Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${(data.avgDealSize || 0).toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              3% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(data.overallConversionRate || 0).toFixed(1)}%
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              2% from last quarter
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Deal Stage Funnel
          </CardTitle>
          <p className="text-sm text-gray-600">
            Conversion rates and deal volumes at each pipeline stage
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageData.map((stage, index) => (
              <div key={stage.id} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {stage.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {stage.dealCount} deals • $
                        {stage.totalValue.toLocaleString()} total value
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {stage.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">conversion</div>
                  </div>
                </div>
                <div className="ml-11">
                  <Progress value={stage.conversionRate} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Avg: ${stage.avgValue.toLocaleString()}</span>
                    <span>Time: {stage.avgTimeInStage.toFixed(0)} days</span>
                  </div>
                </div>
                {index < stageData.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-4 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Workflow Timeline
          </CardTitle>
          <p className="text-sm text-gray-600">
            Track deals through the payment process from expected close to
            payment received
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Payment Due</TableHead>
                  <TableHead>Invoice Sent</TableHead>
                  <TableHead>Payment Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days in Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentWorkflowData.slice(0, 10).map((item) => (
                  <TableRow key={item.dealId}>
                    <TableCell className="font-medium">
                      {item.dealTitle}
                    </TableCell>
                    <TableCell>${item.value.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.expectedClose
                        ? new Date(item.expectedClose).toLocaleDateString(
                            "en-GB"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.paymentDue
                        ? new Date(item.paymentDue).toLocaleDateString("en-GB")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.invoiceSent ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {new Date(item.invoiceSent).toLocaleDateString(
                            "en-GB"
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          Pending
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.paymentReceived ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {new Date(item.paymentReceived).toLocaleDateString(
                            "en-GB"
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          Pending
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status === "completed" && "Completed"}
                        {item.status === "on-time" && "On Time"}
                        {item.status === "warning" && "Warning"}
                        {item.status === "overdue" && "Overdue"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.daysInStage} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Source Analysis and Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Deal Source Analysis
            </CardTitle>
            <p className="text-sm text-gray-600">
              Performance metrics by deal source
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceAnalysisData.slice(0, 5).map((source) => (
                <div key={source.source} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">
                      {source.source}
                    </h4>
                    <Badge variant="outline">{source.dealCount} deals</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Value</p>
                      <p className="font-semibold">
                        ${source.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg Deal Size</p>
                      <p className="font-semibold">
                        ${source.avgDealSize.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Conversion Rate</p>
                      <p className="font-semibold">
                        {source.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">ROI</p>
                      <p
                        className={`font-semibold ${
                          source.roi >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {source.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Category Performance
            </CardTitle>
            <p className="text-sm text-gray-600">
              Performance metrics by deal category
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.slice(0, 5).map((category) => (
                <div key={category.category} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">
                      {category.category}
                    </h4>
                    <Badge variant="outline">{category.dealCount} deals</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Avg Deal Value</p>
                      <p className="font-semibold">
                        ${category.avgDealValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Win Rate</p>
                      <p className="font-semibold">
                        {category.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Conversion Rate</p>
                      <p className="font-semibold">
                        {category.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg Time to Close</p>
                      <p className="font-semibold">
                        {category.avgTimeToClose.toFixed(0)} days
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
