"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Edit, Trash2, Plus, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import type { Workflow, Task, Category, Group } from "@/lib/types";
import { fetchWorkflows, fetchTasks, deleteWorkflow } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";

interface WorkflowsTableProps {
  groups: Group[];
  categories: Category[];
  tasks: Task[];
  isAdmin: boolean;
  onEdit: (workflow: Workflow) => void;
  onView: (workflow: Workflow) => void;
  onCreateNew: () => void;
  onDelete?: (id: string) => void;
  onDataChange?: () => void;
}

export default function WorkflowsTable({
  groups,
  categories,
  tasks,
  isAdmin,
  onEdit,
  onView,
  onCreateNew,
  onDelete,
  onDataChange,
}: WorkflowsTableProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const workflowsData = await fetchWorkflows();
      setWorkflows(workflowsData);
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter workflows based on search term, task, and status
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTask = taskFilter === "all" || workflow.taskId === taskFilter;
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && workflow.isActive) ||
      (statusFilter === "inactive" && !workflow.isActive);

    return matchesSearch && matchesTask && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      const success = await deleteWorkflow(id);
      if (success) {
        setWorkflows(workflows.filter(w => w.id !== id));
        toast({
          title: "Success",
          description: "Workflow deleted successfully",
        });
        onDataChange?.();
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.name || "Unknown Task";
  };

  const getCategoryName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return "Unknown Category";
    const category = categories.find(c => c.id === task.categoryId);
    return category?.name || "Unknown Category";
  };

  const getGroupName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return "Unknown Group";
    const category = categories.find(c => c.id === task.categoryId);
    if (!category) return "Unknown Group";
    const group = groups.find(g => g.id === category.groupId);
    return group?.name || "Unknown Group";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GitBranch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">
            Manage and view all saved workflows across your tasks
          </p>
        </div>
        {isAdmin && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Workflow
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Task</label>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredWorkflows.length} of {workflows.length} workflows
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-center">
                        <GitBranch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">
                          {workflows.length === 0 
                            ? "No workflows found. Create your first workflow to get started."
                            : "No workflows match your current filters."
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkflows.map((workflow, index) => (
                    <motion.tr
                      key={workflow.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">
                        {workflow.name}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={workflow.description}>
                          {workflow.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell>{getTaskName(workflow.taskId)}</TableCell>
                      <TableCell>{getCategoryName(workflow.taskId)}</TableCell>
                      <TableCell>{getGroupName(workflow.taskId)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={workflow.isActive ? "default" : "secondary"}
                          className={workflow.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(workflow.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(workflow.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(workflow)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(workflow)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(workflow.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
