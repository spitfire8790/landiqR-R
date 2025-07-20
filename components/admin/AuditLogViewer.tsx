"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Search,
  Download,
  Calendar,
  Clock,
  User,
  Database,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  fetchAuditLogs,
  exportAuditLogsToCsv,
  getAuditStats,
  setupAuditSystem,
  createAuditStatsFunction,
  type AuditLogEntry,
} from "@/lib/audit-service";
import { createToastHelpers } from "@/lib/toast";
import { format } from "date-fns";

interface AuditStats {
  total_entries: number;
  unique_users: number;
  tables_tracked: string[];
  recent_activity: number;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    total_entries: 0,
    unique_users: 0,
    tables_tracked: [],
    recent_activity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    table_name: "",
    user_email: "",
    action: "",
    from_date: "",
    to_date: "",
    search: "",
  });

  const toast = createToastHelpers();

  useEffect(() => {
    initializeAuditSystem();
  }, []);

  const initializeAuditSystem = async () => {
    setLoading(true);
    try {
      // Setup audit system if not already done
      await setupAuditSystem();
      await createAuditStatsFunction();

      // Load initial data
      await Promise.all([loadLogs(), loadStats()]);
    } catch (error) {
      console.error("Error initializing audit system:", error);
      toast.loadError("audit system");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const auditLogs = await fetchAuditLogs({
        table_name: filters.table_name || undefined,
        user_email: filters.user_email || undefined,
        action: filters.action || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        limit: 100,
      });
      setLogs(auditLogs);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.loadError("audit logs");
    }
  };

  const loadStats = async () => {
    try {
      const auditStats = await getAuditStats();
      setStats(auditStats);
    } catch (error) {
      console.error("Error loading audit stats:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({
      table_name: "",
      user_email: "",
      action: "",
      from_date: "",
      to_date: "",
      search: "",
    });
    // Reload logs without filters
    setTimeout(loadLogs, 0);
  };

  const handleExport = async () => {
    try {
      // Fetch all logs for export (no limit)
      const allLogs = await fetchAuditLogs({
        table_name: filters.table_name || undefined,
        user_email: filters.user_email || undefined,
        action: filters.action || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      });

      exportAuditLogsToCsv(allLogs);
      toast.exportSuccess();
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      toast.exportError();
    }
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName.charAt(0).toUpperCase() + tableName.slice(1);
  };

  // Filter logs based on search term
  const filteredLogs = logs.filter((log) => {
    if (!filters.search) return true;

    const searchTerm = filters.search.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(searchTerm) ||
      log.table_name.toLowerCase().includes(searchTerm) ||
      log.action.toLowerCase().includes(searchTerm) ||
      log.record_id.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total_entries}</p>
                <p className="text-xs text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.unique_users}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.tables_tracked.length}
                </p>
                <p className="text-xs text-muted-foreground">Tables Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.recent_activity}</p>
                <p className="text-xs text-muted-foreground">Last 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Log Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={applyFilters} size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                loadLogs();
                loadStats();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Table</Label>
              <Select
                value={filters.table_name}
                onValueChange={(value) =>
                  handleFilterChange("table_name", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tables</SelectItem>
                  {stats.tables_tracked.map((table) => (
                    <SelectItem key={table} value={table}>
                      {getTableDisplayName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange("action", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>User Email</Label>
              <Input
                placeholder="Filter by user..."
                value={filters.user_email}
                onChange={(e) =>
                  handleFilterChange("user_email", e.target.value)
                }
              />
            </div>

            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.from_date}
                onChange={(e) =>
                  handleFilterChange("from_date", e.target.value)
                }
              />
            </div>

            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange("to_date", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="text-muted-foreground">Loading audit logs...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.user_email || "System"}</TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTableDisplayName(log.table_name)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.record_id}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <p className="font-mono text-sm">
                    {format(
                      new Date(selectedLog.created_at),
                      "yyyy-MM-dd HH:mm:ss"
                    )}
                  </p>
                </div>
                <div>
                  <Label>User</Label>
                  <p>{selectedLog.user_email || "System"}</p>
                </div>
                <div>
                  <Label>Action</Label>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label>Table</Label>
                  <p>{getTableDisplayName(selectedLog.table_name)}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <Label>Previous Values</Label>
                  <ScrollArea className="h-40 w-full border rounded p-2">
                    <pre className="text-xs">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <Label>New Values</Label>
                  <ScrollArea className="h-40 w-full border rounded p-2">
                    <pre className="text-xs">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
