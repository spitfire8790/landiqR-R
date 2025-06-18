"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Edit,
  Trash2,
  Workflow as WorkflowIcon,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Person, WorkflowTool, Workflow, Task } from "@/lib/types";
import {
  fetchWorkflows,
  fetchWorkflowTools,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "@/lib/data-service";
import { format } from "date-fns";

// Dynamic import for the WorkflowBuilderProvider to avoid SSR issues
import dynamic from "next/dynamic";

const WorkflowBuilderProvider = dynamic(
  () =>
    import("@/components/workflow-builder").then(
      (mod) => mod.WorkflowBuilderProvider
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading workflow builder...</p>
        </div>
      </div>
    ),
  }
);

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  people: Person[];
}

export function WorkflowDialog({
  open,
  onOpenChange,
  task,
  people,
}: WorkflowDialogProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools] = useState<WorkflowTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<
    Workflow | undefined
  >();
  const [viewingWorkflow, setViewingWorkflow] = useState<
    Workflow | undefined
  >();

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, task.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workflowsData, toolsData] = await Promise.all([
        fetchWorkflows(task.id),
        fetchWorkflowTools(),
      ]);
      setWorkflows(workflowsData);
      setTools(toolsData);
    } catch (error) {
      console.error("Error loading workflow data:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(undefined);
    setViewingWorkflow(undefined);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setViewingWorkflow(undefined);
    setShowBuilder(true);
  };

  const handleViewWorkflow = (workflow: Workflow) => {
    setViewingWorkflow(workflow);
    setEditingWorkflow(undefined);
    setShowBuilder(true);
  };

  const handleSaveWorkflow = async (workflowData: {
    name: string;
    description: string;
    flowData: string;
  }) => {
    try {
      if (editingWorkflow) {
        const updatedWorkflow = await updateWorkflow({
          ...editingWorkflow,
          ...workflowData,
        });
        if (updatedWorkflow) {
          await loadData();
          setShowBuilder(false);
          setEditingWorkflow(undefined);
          toast({
            title: "Success",
            description: "Workflow updated successfully.",
          });
        }
      } else {
        const newWorkflow = await createWorkflow({
          ...workflowData,
          taskId: task.id,
          isActive: true,
        });
        if (newWorkflow) {
          await loadData();
          setShowBuilder(false);
          toast({
            title: "Success",
            description: "Workflow created successfully.",
          });
        }
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) {
      return;
    }

    try {
      const success = await deleteWorkflow(workflowId);
      if (success) {
        await loadData();
        toast({
          title: "Success",
          description: "Workflow deleted successfully.",
        });
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast({
        title: "Error",
        description: "Failed to delete workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleWorkflowStatus = async (workflow: Workflow) => {
    try {
      const updatedWorkflow = await updateWorkflow({
        ...workflow,
        isActive: !workflow.isActive,
      });
      if (updatedWorkflow) {
        await loadData();
        toast({
          title: "Success",
          description: `Workflow ${
            workflow.isActive ? "deactivated" : "activated"
          } successfully.`,
        });
      }
    } catch (error) {
      console.error("Error updating workflow status:", error);
      toast({
        title: "Error",
        description: "Failed to update workflow status.",
        variant: "destructive",
      });
    }
  };

  if (showBuilder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WorkflowIcon className="h-5 w-5" />
              {editingWorkflow
                ? "Edit Workflow"
                : viewingWorkflow
                ? "View Workflow"
                : "Create Workflow"}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow
                ? "Modify the workflow diagram and save your changes."
                : viewingWorkflow
                ? "View the workflow diagram (read-only)."
                : "Create a new workflow diagram for this task using the available tools and people."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <WorkflowBuilderProvider
              people={people}
              tools={tools}
              taskId={task.id}
              existingWorkflow={editingWorkflow || viewingWorkflow}
              onSave={handleSaveWorkflow}
            />
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowBuilder(false);
                setEditingWorkflow(undefined);
                setViewingWorkflow(undefined);
              }}
            >
              {viewingWorkflow ? "Close" : "Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-5 w-5" />
            Workflows for "{task.name}"
          </DialogTitle>
          <DialogDescription>
            Create and manage interactive workflows for this task. Workflows
            help define the process flow using available tools and people.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {workflows.length === 0
                ? "No workflows created yet"
                : `${workflows.length} workflow(s)`}
            </h3>
            <Button onClick={handleCreateWorkflow}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>

          {workflows.length === 0 ? (
            <Card className="p-8 text-center">
              <WorkflowIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to define the process flow for this
                task.
              </p>
              <Button onClick={handleCreateWorkflow}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Workflow
              </Button>
            </Card>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <Card key={workflow.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {workflow.name}
                            </CardTitle>
                            <Badge
                              variant={
                                workflow.isActive ? "default" : "secondary"
                              }
                            >
                              {workflow.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {workflow.description && (
                            <CardDescription className="mt-1">
                              {workflow.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>
                              Created:{" "}
                              {format(
                                new Date(workflow.createdAt),
                                "MMM d, yyyy"
                              )}
                            </span>
                            <span>
                              Updated:{" "}
                              {format(
                                new Date(workflow.updatedAt),
                                "MMM d, yyyy"
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWorkflow(workflow)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorkflow(workflow)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWorkflowStatus(workflow)}
                          >
                            {workflow.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
