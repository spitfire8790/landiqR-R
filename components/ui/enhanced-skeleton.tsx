import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Table Header */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}

      {/* Table Rows */}
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex gap-4 p-4 border-b border-gray-100"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-1/4" : "flex-1" // First column narrower
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

export function CardSkeleton({
  showAvatar = false,
  showActions = true,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "p-6 border border-gray-200 rounded-lg space-y-4",
        className
      )}
    >
      {/* Header with optional avatar */}
      <div className="flex items-center gap-4">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      )}
    </div>
  );
}

interface ChartSkeletonProps {
  type?: "bar" | "line" | "pie" | "area";
  className?: string;
}

export function ChartSkeleton({ type = "bar", className }: ChartSkeletonProps) {
  return (
    <div className={cn("p-6 border border-gray-200 rounded-lg", className)}>
      {/* Chart Title */}
      <div className="mb-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Chart Area */}
      <div className="relative h-64">
        {type === "pie" ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        ) : (
          <div className="h-full w-full relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`y-${i}`} className="h-3 w-8" />
              ))}
            </div>

            {/* Chart bars/lines */}
            <div className="ml-12 h-full flex items-end gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`bar-${i}`}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <Skeleton
                    className="w-full"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`legend-${i}`} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
  showSubmit?: boolean;
  className?: string;
}

export function FormSkeleton({
  fields = 4,
  showSubmit = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Form Fields */}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {/* Submit Button */}
      {showSubmit && (
        <div className="pt-4">
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
}

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`stat-${i}`}
            className="p-4 border border-gray-200 rounded-lg"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="pie" />
      </div>

      {/* Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

interface OrgChartSkeletonProps {
  className?: string;
}

export function OrgChartSkeleton({ className }: OrgChartSkeletonProps) {
  return (
    <div className={cn("p-6 space-y-6", className)}>
      {/* Controls */}
      <div className="flex gap-4 items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Org Chart Structure */}
      <div className="space-y-8">
        {/* Top Level Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <div key={`group-${groupIndex}`} className="space-y-4">
              {/* Group Header */}
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>

              {/* Categories */}
              <div className="ml-4 space-y-3">
                {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map(
                  (_, catIndex) => (
                    <div
                      key={`cat-${groupIndex}-${catIndex}`}
                      className="p-3 bg-green-50 rounded border-l-2 border-green-300"
                    >
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />

                      {/* People */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from({
                          length: 1 + Math.floor(Math.random() * 4),
                        }).map((_, personIndex) => (
                          <div
                            key={`person-${groupIndex}-${catIndex}-${personIndex}`}
                            className="flex items-center gap-2 p-2 bg-white rounded border"
                          >
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
