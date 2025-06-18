"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  ConnectionMode,
  Connection,
  ReactFlowProvider,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2, Wrench, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Person, WorkflowTool, Workflow, WorkflowData } from "@/lib/types";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import React from "react";

// Add custom CSS for glow animation
const glowStyles = `
  @keyframes glow {
    0% {
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.15), 0 0 10px rgba(59, 130, 246, 0.1), 0 0 15px rgba(59, 130, 246, 0.05);
    }
    100% {
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.25), 0 0 15px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.08);
    }
  }
  
  @keyframes glow-selected {
    0% {
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.3), 0 0 15px rgba(59, 130, 246, 0.2), 0 0 25px rgba(59, 130, 246, 0.1);
    }
    100% {
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.25), 0 0 30px rgba(59, 130, 246, 0.15);
    }
  }
`;

// Step node component
const StepNode = ({ data, selected }: { data: any; selected: boolean }) => {
  // Access tools from the data passed to the node
  const toolsData = data.toolsData || [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`px-4 py-3 shadow-md rounded-md bg-white border-2 ${
          selected ? "border-blue-500" : "border-gray-200"
        } min-w-[200px] max-w-[280px] cursor-pointer relative`}
        style={{
          animation: selected
            ? "glow-selected 2s ease-in-out infinite alternate"
            : "glow 3s ease-in-out infinite alternate",
        }}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
        />

        <div className="font-semibold text-gray-900">
          {data.action || "Step"}
        </div>
        {data.description && (
          <div className="text-xs text-gray-700 mt-1">{data.description}</div>
        )}
        {data.people && data.people.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-blue-600 font-medium mb-1">
              People:
            </div>
            <div className="space-y-1">
              {data.people.map((personId: string) => {
                // Handle generic "User" option
                if (personId === "user") {
                  return (
                    <div
                      key={personId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700">User</span>
                    </div>
                  );
                }

                // Handle actual people from the people array
                const peopleData = data.peopleData || [];
                const person = peopleData.find((p: any) => p.id === personId);
                if (!person) return null;

                return (
                  <div
                    key={personId}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">
                      {person.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {data.tools && data.tools.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-green-600 font-medium mb-1">
              Tools:
            </div>
            <div className="space-y-1">
              {data.tools.map((toolId: string) => {
                const tool = toolsData.find((t: any) => t.id === toolId);
                if (!tool) return null;

                return (
                  <div key={toolId} className="flex items-center gap-2 text-xs">
                    {tool.icon &&
                    (tool.icon.startsWith("http") ||
                      tool.icon.startsWith("/storage/")) ? (
                      <Image
                        src={tool.icon}
                        alt={tool.name}
                        width={20}
                        height={20}
                        className="rounded flex-shrink-0"
                      />
                    ) : tool.icon && LucideIcons[tool.icon] ? (
                      React.createElement(LucideIcons[tool.icon], {
                        className: "h-5 w-5 text-green-600 flex-shrink-0",
                      })
                    ) : (
                      <Wrench className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    <span className="text-gray-700 truncate">{tool.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

interface WorkflowBuilderProps {
  people: Person[];
  tools: WorkflowTool[];
  taskId: string;
  existingWorkflow?: Workflow;
  onSave: (workflowData: {
    name: string;
    description: string;
    flowData: string;
  }) => Promise<void>;
}

export function WorkflowBuilder({
  people,
  tools,
  taskId,
  existingWorkflow,
  onSave,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState(
    existingWorkflow?.name || ""
  );
  const [workflowDescription, setWorkflowDescription] = useState(
    existingWorkflow?.description || ""
  );
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [newStepAction, setNewStepAction] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");
  const [newStepPeople, setNewStepPeople] = useState<string[]>([]);
  const [newStepTools, setNewStepTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showGrid, setShowGrid] = useState(true);

  // Define nodeTypes inside component
  const nodeTypes = useMemo(
    () => ({
      step: StepNode,
    }),
    []
  );

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        // Check if focus is on an input field where Backspace should work normally
        const target = event.target as HTMLElement;
        const isInputField = 
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.contentEditable === "true" ||
          target.closest('input, textarea, [contenteditable="true"]') !== null;
        
        // Check if any dialog/modal is currently open by looking for dialog elements
        const isDialogOpen = document.querySelector('[role="dialog"]') !== null;
        
        // Don't handle Delete/Backspace if typing in input fields or if a dialog is open
        if (isInputField || isDialogOpen) {
          return;
        }
        
        // Check if we're actually focused on the workflow canvas
        const workflowCanvas = document.querySelector('.react-flow');
        if (!workflowCanvas || !workflowCanvas.contains(target)) {
          return;
        }
        
        // Only prevent default and delete nodes/edges if we're focused on the workflow canvas
        event.preventDefault();
        event.stopPropagation();
        setEdges((edges) => edges.filter((edge) => !edge.selected));
        setNodes((nodes) => nodes.filter((node) => !node.selected));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setEdges, setNodes]);

  // Handle selection changes
  const onSelectionChange = useCallback(
    ({ nodes, edges }) => {
      // Update selection state in nodes and edges
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: nodes.some((n: any) => n.id === node.id),
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: edges.some((e: any) => e.id === edge.id),
        }))
      );
    },
    [setNodes, setEdges]
  );

  // Load existing workflow data
  useEffect(() => {
    if (existingWorkflow) {
      try {
        const flowData: WorkflowData = JSON.parse(existingWorkflow.flowData);
        // Add toolsData and peopleData to existing nodes so they can display information
        const nodesWithData = (flowData.nodes || []).map((node) => ({
          ...node,
          data: {
            ...node.data,
            toolsData: tools,
            peopleData: people,
          },
        }));
        setNodes(nodesWithData);
        setEdges(flowData.edges || []);
      } catch (error) {
        console.error("Error parsing existing workflow data:", error);
      }
    }
  }, [existingWorkflow, tools, people, setNodes, setEdges]);

  // Node click handler
  const onNodeClick = useCallback((event, node) => {
    setEditingNodeId(node.id);
    setStepDialogOpen(true);
  }, []);

  // Add new step node
  const addStepNode = () => {
    const newNode: Node = {
      id: `step-${Date.now()}`,
      type: "step",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        action: newStepAction.trim(),
        description: newStepDescription.trim(),
        people: newStepPeople,
        tools: newStepTools,
        toolsData: tools,
        peopleData: people,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNewStepAction("");
    setNewStepDescription("");
    setNewStepPeople([]);
    setNewStepTools([]);
  };

  // Save node edits
  const handleStepSave = (data: any) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNodeId
          ? {
              ...n,
              data: {
                ...n.data,
                ...data,
                toolsData: tools,
                peopleData: people,
              },
            }
          : n
      )
    );
    setEditingNodeId(null);
  };

  // Get node data for editing
  const editingNode = nodes.find((n) => n.id === editingNodeId);

  const clearWorkflow = () => {
    if (confirm("Are you sure you want to clear the entire workflow?")) {
      setNodes([]);
      setEdges([]);
    }
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workflow name.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const flowData: WorkflowData = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      await onSave({
        name: workflowName.trim(),
        description: workflowDescription.trim(),
        flowData: JSON.stringify(flowData),
      });
      toast({
        title: "Success",
        description: "Workflow saved successfully.",
      });
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add animated property to all edges
  const animatedEdges = edges.map((edge) => ({
    ...edge,
    animated: true,
    style: {
      strokeDasharray: "5,5",
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
    type: "smoothstep",
  }));

  return (
    <div className="flex h-[800px] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Workflow Details</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="workflow-name">Name *</Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Workflow name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Workflow description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-2">Add Step</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="step-action">Action</Label>
                <Input
                  id="step-action"
                  value={newStepAction}
                  onChange={(e) => setNewStepAction(e.target.value)}
                  placeholder="e.g. Send email, Issue invoice (optional)"
                />
              </div>
              <div>
                <Label htmlFor="step-description">Description</Label>
                <Textarea
                  id="step-description"
                  value={newStepDescription}
                  onChange={(e) => setNewStepDescription(e.target.value)}
                  placeholder="Step details (optional)"
                  rows={2}
                />
              </div>
              <div>
                <Label>People</Label>
                <Select
                  value={""}
                  onValueChange={(val) =>
                    setNewStepPeople([...newStepPeople, val])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add people" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Generic)</SelectItem>
                    {people
                      .filter((p) => !newStepPeople.includes(p.id))
                      .map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {newStepPeople.map((pid) => {
                    const person = people.find((p) => p.id === pid);
                    return person ? (
                      <Badge key={pid} className="bg-blue-100 text-blue-800">
                        {person.name}{" "}
                        <button
                          onClick={() =>
                            setNewStepPeople(
                              newStepPeople.filter((id) => id !== pid)
                            )
                          }
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <Label>Tools</Label>
                <Select
                  value={""}
                  onValueChange={(val) =>
                    setNewStepTools([...newStepTools, val])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add tools" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools
                      .filter((t) => !newStepTools.includes(t.id))
                      .map((tool) => (
                        <SelectItem key={tool.id} value={tool.id}>
                          {tool.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {newStepTools.map((tid) => {
                    const tool = tools.find((t) => t.id === tid);
                    return tool ? (
                      <Badge key={tid} className="bg-green-100 text-green-800">
                        {tool.name}{" "}
                        <button
                          onClick={() =>
                            setNewStepTools(
                              newStepTools.filter((id) => id !== tid)
                            )
                          }
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <Button onClick={addStepNode} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              onClick={saveWorkflow}
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
            <Button
              onClick={clearWorkflow}
              variant="outline"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button
              onClick={() => setShowGrid(!showGrid)}
              variant="outline"
              className="w-full"
            >
              {showGrid ? "Hide Grid" : "Show Grid"}
            </Button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={animatedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(params) => setEdges((eds) => addEdge(params, eds))}
          onNodeClick={onNodeClick}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          fitView
        >
          <Controls />
          <MiniMap />
          {showGrid && <Background variant="dots" gap={12} size={1} />}
        </ReactFlow>
        <StepEditDialog
          open={stepDialogOpen && !!editingNode}
          onOpenChange={(open: boolean) => {
            setStepDialogOpen(open);
            if (!open) setEditingNodeId(null);
          }}
          onSave={handleStepSave}
          people={people}
          tools={tools}
          nodeData={editingNode?.data}
        />
      </div>
    </div>
  );
}

export function WorkflowBuilderProvider(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder {...props} />
    </ReactFlowProvider>
  );
}

// StepEditDialog component
function StepEditDialog({
  open,
  onOpenChange,
  onSave,
  people,
  tools,
  nodeData,
}: any) {
  const [action, setAction] = useState(nodeData?.action || "");
  const [description, setDescription] = useState(nodeData?.description || "");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(
    nodeData?.people || []
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    nodeData?.tools || []
  );

  useEffect(() => {
    setAction(nodeData?.action || "");
    setDescription(nodeData?.description || "");
    setSelectedPeople(nodeData?.people || []);
    setSelectedTools(nodeData?.tools || []);
  }, [nodeData, open]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? "" : "hidden"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-step-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 id="edit-step-dialog-title" className="text-lg font-semibold mb-2">Edit Step</h3>
        <div className="space-y-3">
          <div>
            <Label>Action</Label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Send email, Issue invoice"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Step details (optional)"
              rows={2}
            />
          </div>
          <div>
            <Label>People</Label>
            <Select
              value={""}
              onValueChange={(val) =>
                setSelectedPeople([...selectedPeople, val])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Add people" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User (Generic)</SelectItem>
                {people
                  .filter((p) => !selectedPeople.includes(p.id))
                  .map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedPeople.map((pid) => {
                // Handle generic "User" option
                if (pid === "user") {
                  return (
                    <Badge key={pid} className="bg-blue-100 text-blue-800">
                      User{" "}
                      <button
                        onClick={() =>
                          setSelectedPeople(
                            selectedPeople.filter((id) => id !== pid)
                          )
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  );
                }

                // Handle actual people
                const person = people.find((p) => p.id === pid);
                return person ? (
                  <Badge key={pid} className="bg-blue-100 text-blue-800">
                    {person.name}{" "}
                    <button
                      onClick={() =>
                        setSelectedPeople(
                          selectedPeople.filter((id) => id !== pid)
                        )
                      }
                    >
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
          <div>
            <Label>Tools</Label>
            <Select
              value={""}
              onValueChange={(val) => setSelectedTools([...selectedTools, val])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add tools" />
              </SelectTrigger>
              <SelectContent>
                {tools
                  .filter((t) => !selectedTools.includes(t.id))
                  .map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTools.map((tid) => {
                const tool = tools.find((t) => t.id === tid);
                return tool ? (
                  <Badge key={tid} className="bg-green-100 text-green-800">
                    {tool.name}{" "}
                    <button
                      onClick={() =>
                        setSelectedTools(
                          selectedTools.filter((id) => id !== tid)
                        )
                      }
                    >
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({
                action,
                description,
                people: selectedPeople,
                tools: selectedTools,
              });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
