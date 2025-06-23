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
  BackgroundVariant,
  ConnectionMode,
  Connection,
  ReactFlowProvider,
  Handle,
  Position,
  EdgeMouseHandler,
  NodeMouseHandler,
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  Trash2,
  Wrench,
  Users,
  Link,
  ExternalLink,
  X,
  FileText,
  StickyNote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Person, WorkflowTool, Workflow, WorkflowData } from "@/lib/types";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import React from "react";
import { getOrganizationLogo } from "@/lib/utils";

// Add custom CSS for glow animation and rich text display
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

  .rich-text-display ul {
    margin: 0.25em 0;
    padding-left: 1em;
    list-style-type: disc;
  }
  
  .rich-text-display ol {
    margin: 0.25em 0;
    padding-left: 1em;
    list-style-type: decimal;
  }
  
  .rich-text-display li {
    margin: 0.1em 0;
  }
  
  .rich-text-display strong {
    font-weight: bold;
  }
  
  .rich-text-display em {
    font-style: italic;
  }
  
  .rich-text-display u {
    text-decoration: underline;
  }
`;

// Helper function to get organization color for step boxes
const getStepNodeColor = (people: any[], peopleData: any[]) => {
  if (!people || people.length === 0) {
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      selectedBorder: "border-yellow-500",
      glow: "rgba(251, 191, 36, 0.15)", // yellow
    };
  }

  // Get the first real person (not generic user/customer)
  const firstRealPerson = people.find(
    (personId) => personId !== "user" && personId !== "customer"
  );

  if (firstRealPerson) {
    const person = peopleData.find((p: any) => p.id === firstRealPerson);
    if (person) {
      switch (person.organisation) {
        case "PDNSW":
          return {
            bg: "bg-blue-50",
            border: "border-blue-300",
            selectedBorder: "border-blue-500",
            glow: "rgba(59, 130, 246, 0.15)", // blue
          };
        case "WSP":
          return {
            bg: "bg-red-50",
            border: "border-red-300",
            selectedBorder: "border-red-500",
            glow: "rgba(239, 68, 68, 0.15)", // red
          };
        case "Giraffe":
          return {
            bg: "bg-orange-50",
            border: "border-orange-300",
            selectedBorder: "border-orange-500",
            glow: "rgba(245, 158, 11, 0.15)", // orange
          };
      }
    }
  }

  // Default to yellow for generic users or unknown organizations
  return {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    selectedBorder: "border-yellow-500",
    glow: "rgba(251, 191, 36, 0.15)", // yellow
  };
};

// Step node component
const StepNode = ({ data, selected }: { data: any; selected: boolean }) => {
  // Access tools from the data passed to the node
  const toolsData = data.toolsData || [];
  const peopleData = data.peopleData || [];
  const colors = getStepNodeColor(data.people, peopleData);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`px-4 py-3 shadow-md rounded-md ${colors.bg} border-2 ${
          selected ? colors.selectedBorder : colors.border
        } min-w-[200px] max-w-[280px] cursor-pointer relative`}
        style={{
          animation: selected
            ? "glow-selected 2s ease-in-out infinite alternate"
            : "glow 3s ease-in-out infinite alternate",
          boxShadow: selected
            ? `0 0 12px ${colors.glow}, 0 0 20px ${colors.glow}, 0 0 30px ${colors.glow}`
            : `0 0 8px ${colors.glow}, 0 0 15px ${colors.glow}, 0 0 20px ${colors.glow}`,
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

                // Handle generic "Customer" option
                if (personId === "customer") {
                  return (
                    <div
                      key={personId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700">Customer</span>
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
                    {getOrganizationLogo(person.organisation) && (
                      <Image
                        src={getOrganizationLogo(person.organisation)}
                        alt={`${person.organisation} logo`}
                        width={12}
                        height={12}
                        className="flex-shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {data.tools && data.tools.length > 0 && (
          <div className="mt-2">
            <div className="space-y-1">
              {data.tools.map((toolId: string) => {
                const tool = toolsData.find((t: any) => t.id === toolId);
                return tool ? (
                  <div key={toolId} className="flex items-center gap-2 text-xs">
                    {tool.icon &&
                    (tool.icon.startsWith("http") ||
                      tool.icon.startsWith("/storage/")) ? (
                      <Image
                        src={tool.icon}
                        alt={tool.name}
                        width={12}
                        height={12}
                        className="rounded flex-shrink-0"
                      />
                    ) : (
                      <Wrench className="w-3 h-3 text-green-600" />
                    )}
                    <span className="text-green-700">{tool.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
        {data.links && data.links.length > 0 && (
          <div className="mt-2">
            <div className="space-y-1">
              {data.links.slice(0, 2).map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-xs text-purple-700 hover:underline"
                  title={link.description || link.url}
                >
                  <ExternalLink className="w-3 h-3 text-purple-600 flex-shrink-0" />
                  <span className="truncate">
                    {link.description || link.url || "Link"}
                  </span>
                </a>
              ))}
              {data.links.length > 2 && (
                <div className="text-xs text-purple-600">
                  +{data.links.length - 2} more links
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Helper function to get note color styles
const getNoteColorStyles = (color: string) => {
  const colorMap: Record<
    string,
    {
      bg: string;
      border: string;
      selectedBorder: string;
      glow: string;
      handle: string;
    }
  > = {
    gray: {
      bg: "bg-gray-100",
      border: "border-gray-300",
      selectedBorder: "border-blue-500",
      glow: "rgba(107, 114, 128, 0.2)",
      handle: "!bg-gray-500",
    },
    yellow: {
      bg: "bg-yellow-100",
      border: "border-yellow-300",
      selectedBorder: "border-yellow-500",
      glow: "rgba(251, 191, 36, 0.2)",
      handle: "!bg-yellow-500",
    },
    blue: {
      bg: "bg-blue-100",
      border: "border-blue-300",
      selectedBorder: "border-blue-500",
      glow: "rgba(59, 130, 246, 0.2)",
      handle: "!bg-blue-500",
    },
    green: {
      bg: "bg-green-100",
      border: "border-green-300",
      selectedBorder: "border-green-500",
      glow: "rgba(34, 197, 94, 0.2)",
      handle: "!bg-green-500",
    },
    red: {
      bg: "bg-red-100",
      border: "border-red-300",
      selectedBorder: "border-red-500",
      glow: "rgba(239, 68, 68, 0.2)",
      handle: "!bg-red-500",
    },
    purple: {
      bg: "bg-purple-100",
      border: "border-purple-300",
      selectedBorder: "border-purple-500",
      glow: "rgba(168, 85, 247, 0.2)",
      handle: "!bg-purple-500",
    },
    pink: {
      bg: "bg-pink-100",
      border: "border-pink-300",
      selectedBorder: "border-pink-500",
      glow: "rgba(236, 72, 153, 0.2)",
      handle: "!bg-pink-500",
    },
    orange: {
      bg: "bg-orange-100",
      border: "border-orange-300",
      selectedBorder: "border-orange-500",
      glow: "rgba(245, 158, 11, 0.2)",
      handle: "!bg-orange-500",
    },
  };

  return colorMap[color] || colorMap.gray;
};

// Notes node component
const NotesNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const colors = getNoteColorStyles(data.color || "gray");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`px-4 py-3 shadow-md rounded-md ${colors.bg} border-2 ${
          selected ? colors.selectedBorder : colors.border
        } min-w-[200px] max-w-[280px] cursor-pointer relative`}
        style={{
          animation: selected
            ? "glow-selected 2s ease-in-out infinite alternate"
            : "glow 3s ease-in-out infinite alternate",
          boxShadow: selected
            ? `0 0 12px ${colors.glow}, 0 0 20px ${colors.glow}, 0 0 30px ${colors.glow}`
            : `0 0 8px ${colors.glow}, 0 0 15px ${colors.glow}, 0 0 20px ${colors.glow}`,
        }}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={`w-3 h-3 ${colors.handle} border-2 border-white`}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={`w-3 h-3 ${colors.handle} border-2 border-white`}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={`w-3 h-3 ${colors.handle} border-2 border-white`}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={`w-3 h-3 ${colors.handle} border-2 border-white`}
        />

        <div className="flex items-center gap-2 font-semibold text-black mb-2">
          <StickyNote className="h-4 w-4" />
          <span>{data.title || "Notes"}</span>
        </div>

        {data.content && (
          <RichTextDisplay
            content={data.content}
            className="text-xs text-gray-800"
          />
        )}

        {!data.title && !data.content && (
          <div className="text-xs text-gray-600 italic">
            Click to add notes...
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
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
  const [newNotesTitle, setNewNotesTitle] = useState("");
  const [newNotesContent, setNewNotesContent] = useState("");
  const [newNotesColor, setNewNotesColor] = useState("gray");
  const [loading, setLoading] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Define nodeTypes inside component
  const nodeTypes = useMemo(
    () => ({
      step: StepNode,
      notes: NotesNode,
    }),
    []
  );

  // Handle sidebar resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

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

        // Check if any nodes or edges are selected
        const hasSelectedNodes = nodes.some((node) => node.selected);
        const hasSelectedEdges = edges.some((edge) => edge.selected);

        if (hasSelectedNodes || hasSelectedEdges) {
          // Prevent default behavior and delete selected items
          event.preventDefault();
          event.stopPropagation();

          // Delete selected edges
          setEdges((edges: Edge[]) => edges.filter((edge) => !edge.selected));

          // Delete selected nodes
          setNodes((nodes: Node[]) => nodes.filter((node) => !node.selected));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setEdges, setNodes, nodes, edges]);

  // Handle selection changes
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      // Update selection state in nodes and edges
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: nodes.some((n) => n.id === node.id),
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: edges.some((e) => e.id === edge.id),
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

  // Node click handler - single click for selection only
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    // Single click just selects the node, doesn't open dialog
    // The selection is handled by ReactFlow automatically
  }, []);

  // Node double-click handler - opens edit dialog
  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    setEditingNodeId(node.id);
    setStepDialogOpen(true);
  }, []);

  // Edge click handler for selection
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      // Prevent event bubbling to avoid deselecting
      event.stopPropagation();

      // Update edge selection state
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          selected: e.id === edge.id,
        }))
      );

      // Clear node selection when edge is selected
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: false,
        }))
      );
    },
    [setEdges, setNodes]
  );

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

  // Add new notes node
  const addNotesNode = () => {
    const newNode: Node = {
      id: `notes-${Date.now()}`,
      type: "notes",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        title: newNotesTitle.trim(),
        content: newNotesContent.trim(),
        color: newNotesColor,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNewNotesTitle("");
    setNewNotesContent("");
    setNewNotesColor("gray");
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
                // Only add toolsData and peopleData for step nodes
                ...(n.type === "step"
                  ? { toolsData: tools, peopleData: people }
                  : {}),
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
      // Convert ReactFlow nodes/edges to WorkflowData format
      const workflowNodes = nodes.map((node): any => ({
        id: node.id,
        type: node.type || "step", // Default to 'step' if undefined
        position: node.position,
        data: {
          label: node.data.action || node.data.title || "Step",
          ...node.data,
        },
      }));

      const workflowEdges = edges.map((edge): any => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: typeof edge.label === "string" ? edge.label : undefined,
        data: edge.data,
      }));

      const flowData = {
        nodes: workflowNodes,
        edges: workflowEdges,
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

  // Add animated blue dashed styling to all edges
  const animatedEdges = edges.map((edge) => ({
    ...edge,
    animated: true,
    style: {
      strokeDasharray: "5,5", // Dashed line
      stroke: edge.selected ? "#ef4444" : "#3b82f6", // Red when selected, blue otherwise
      strokeWidth: edge.selected ? 3 : 2, // Thicker when selected
    },
    type: "smoothstep",
    // Add selection styling
    className: edge.selected ? "selected-edge" : "",
  }));

  return (
    <div className="flex h-[800px] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div
        className="border-r bg-gray-50 flex flex-col relative"
        style={{
          width: sidebarCollapsed ? "48px" : `${sidebarWidth}px`,
          minWidth: sidebarCollapsed ? "48px" : "250px",
          maxWidth: sidebarCollapsed ? "48px" : "600px",
        }}
      >
        {/* Collapse button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 h-8 w-8"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div
          className={`p-4 space-y-4 overflow-y-auto flex-1 ${
            sidebarCollapsed ? "hidden" : ""
          }`}
        >
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
                    <SelectItem value="customer">Customer (Generic)</SelectItem>
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
                    // Handle generic "User" option
                    if (pid === "user") {
                      return (
                        <Badge key={pid} className="bg-blue-100 text-blue-800">
                          User{" "}
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
                      );
                    }

                    // Handle generic "Customer" option
                    if (pid === "customer") {
                      return (
                        <Badge key={pid} className="bg-blue-100 text-blue-800">
                          Customer{" "}
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
                      );
                    }

                    // Handle actual people
                    const person = people.find((p: Person) => p.id === pid);
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
                      .filter((t: WorkflowTool) => !newStepTools.includes(t.id))
                      .map((tool: WorkflowTool) => (
                        <SelectItem key={tool.id} value={tool.id}>
                          {tool.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {newStepTools.map((tid) => {
                    const tool = tools.find((t: WorkflowTool) => t.id === tid);
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

          <div>
            <h3 className="text-lg font-semibold mb-2">Add Notes</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="notes-title">Title (optional)</Label>
                <Input
                  id="notes-title"
                  value={newNotesTitle}
                  onChange={(e) => setNewNotesTitle(e.target.value)}
                  placeholder="e.g. Important reminder, Key points"
                />
              </div>
              <div>
                <Label htmlFor="notes-content">Content</Label>
                <RichTextEditor
                  value={newNotesContent}
                  onChange={setNewNotesContent}
                  placeholder="Enter notes content..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[
                    {
                      value: "gray",
                      bg: "bg-gray-100",
                      border: "border-gray-300",
                    },
                    {
                      value: "yellow",
                      bg: "bg-yellow-100",
                      border: "border-yellow-300",
                    },
                    {
                      value: "blue",
                      bg: "bg-blue-100",
                      border: "border-blue-300",
                    },
                    {
                      value: "green",
                      bg: "bg-green-100",
                      border: "border-green-300",
                    },
                    {
                      value: "red",
                      bg: "bg-red-100",
                      border: "border-red-300",
                    },
                    {
                      value: "purple",
                      bg: "bg-purple-100",
                      border: "border-purple-300",
                    },
                    {
                      value: "pink",
                      bg: "bg-pink-100",
                      border: "border-pink-300",
                    },
                    {
                      value: "orange",
                      bg: "bg-orange-100",
                      border: "border-orange-300",
                    },
                  ].map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewNotesColor(color.value)}
                      className={`w-8 h-8 rounded-md border-2 ${color.bg} ${
                        newNotesColor === color.value
                          ? "border-black"
                          : color.border
                      } hover:border-black transition-colors`}
                      title={
                        color.value.charAt(0).toUpperCase() +
                        color.value.slice(1)
                      }
                    />
                  ))}
                </div>
              </div>
              <Button onClick={addNotesNode} className="w-full">
                <StickyNote className="h-4 w-4 mr-2" />
                Add Notes
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

        {/* Resize handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors"
            onMouseDown={handleMouseDown}
            style={{
              background: isResizing ? "#9ca3af" : undefined,
            }}
          />
        )}
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
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          fitView
          fitViewOptions={{ padding: 0.4 }}
        >
          <Controls />
          <MiniMap />
          {showGrid && (
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          )}
        </ReactFlow>
        <NodeEditDialog
          open={stepDialogOpen && !!editingNode}
          onOpenChange={(open: boolean) => {
            setStepDialogOpen(open);
            if (!open) setEditingNodeId(null);
          }}
          onSave={handleStepSave}
          people={people}
          tools={tools}
          nodeData={editingNode?.data}
          nodeType={editingNode?.type}
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

// NodeEditDialog component - handles both step and notes nodes
function NodeEditDialog({
  open,
  onOpenChange,
  onSave,
  people,
  tools,
  nodeData,
  nodeType,
}: any) {
  // Step node fields
  const [action, setAction] = useState(nodeData?.action || "");
  const [description, setDescription] = useState(nodeData?.description || "");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(
    nodeData?.people || []
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    nodeData?.tools || []
  );
  const [links, setLinks] = useState<any[]>(nodeData?.links || []);

  // Notes node fields
  const [notesTitle, setNotesTitle] = useState(nodeData?.title || "");
  const [notesContent, setNotesContent] = useState(nodeData?.content || "");
  const [notesColor, setNotesColor] = useState(nodeData?.color || "gray");

  useEffect(() => {
    if (nodeType === "step") {
      setAction(nodeData?.action || "");
      setDescription(nodeData?.description || "");
      setSelectedPeople(nodeData?.people || []);
      setSelectedTools(nodeData?.tools || []);
      setLinks(nodeData?.links || []);
    } else if (nodeType === "notes") {
      setNotesTitle(nodeData?.title || "");
      setNotesContent(nodeData?.content || "");
      setNotesColor(nodeData?.color || "gray");
    }
  }, [nodeData, nodeType, open]);

  const handleAddLink = () => {
    setLinks([
      ...links,
      { id: Date.now().toString(), url: "", description: "" },
    ]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: string, value: string) => {
    setLinks(
      links.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

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
        <h3 id="edit-step-dialog-title" className="text-lg font-semibold mb-2">
          {nodeType === "notes" ? "Edit Notes" : "Edit Step"}
        </h3>
        <div className="space-y-3">
          {nodeType === "notes" ? (
            // Notes node fields
            <>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={notesTitle}
                  onChange={(e) => setNotesTitle(e.target.value)}
                  placeholder="e.g. Important reminder, Key points"
                />
              </div>
              <div>
                <Label>Content</Label>
                <RichTextEditor
                  value={notesContent}
                  onChange={setNotesContent}
                  placeholder="Enter notes content..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[
                    {
                      value: "gray",
                      bg: "bg-gray-100",
                      border: "border-gray-300",
                    },
                    {
                      value: "yellow",
                      bg: "bg-yellow-100",
                      border: "border-yellow-300",
                    },
                    {
                      value: "blue",
                      bg: "bg-blue-100",
                      border: "border-blue-300",
                    },
                    {
                      value: "green",
                      bg: "bg-green-100",
                      border: "border-green-300",
                    },
                    {
                      value: "red",
                      bg: "bg-red-100",
                      border: "border-red-300",
                    },
                    {
                      value: "purple",
                      bg: "bg-purple-100",
                      border: "border-purple-300",
                    },
                    {
                      value: "pink",
                      bg: "bg-pink-100",
                      border: "border-pink-300",
                    },
                    {
                      value: "orange",
                      bg: "bg-orange-100",
                      border: "border-orange-300",
                    },
                  ].map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNotesColor(color.value)}
                      className={`w-8 h-8 rounded-md border-2 ${color.bg} ${
                        notesColor === color.value
                          ? "border-black"
                          : color.border
                      } hover:border-black transition-colors`}
                      title={
                        color.value.charAt(0).toUpperCase() +
                        color.value.slice(1)
                      }
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Step node fields
            <>
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
                    <SelectItem value="customer">Customer (Generic)</SelectItem>
                    {people
                      .filter((p: Person) => !selectedPeople.includes(p.id))
                      .map((person: Person) => (
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
                            aria-label="Remove user"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    }

                    // Handle generic "Customer" option
                    if (pid === "customer") {
                      return (
                        <Badge key={pid} className="bg-blue-100 text-blue-800">
                          Customer{" "}
                          <button
                            onClick={() =>
                              setSelectedPeople(
                                selectedPeople.filter((id) => id !== pid)
                              )
                            }
                            aria-label="Remove customer"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    }

                    // Handle actual people
                    const person = people.find((p: Person) => p.id === pid);
                    return person ? (
                      <Badge key={pid} className="bg-blue-100 text-blue-800">
                        <div className="flex items-center gap-1">
                          <span>{person.name}</span>
                          {getOrganizationLogo(person.organisation) && (
                            <Image
                              src={getOrganizationLogo(person.organisation)}
                              alt={`${person.organisation} logo`}
                              width={12}
                              height={12}
                              className="flex-shrink-0"
                            />
                          )}
                        </div>{" "}
                        <button
                          onClick={() =>
                            setSelectedPeople(
                              selectedPeople.filter((id) => id !== pid)
                            )
                          }
                          title="Remove person"
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
                    setSelectedTools([...selectedTools, val])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add tools" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools
                      .filter(
                        (t: WorkflowTool) => !selectedTools.includes(t.id)
                      )
                      .map((tool: WorkflowTool) => (
                        <SelectItem key={tool.id} value={tool.id}>
                          {tool.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTools.map((tid) => {
                    const tool = tools.find((t: WorkflowTool) => t.id === tid);
                    return tool ? (
                      <Badge key={tid} className="bg-green-100 text-green-800">
                        {tool.name}{" "}
                        <button
                          onClick={() =>
                            setSelectedTools(
                              selectedTools.filter((id) => id !== tid)
                            )
                          }
                          aria-label="Remove tool"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <Label>Links</Label>
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={link.url}
                      onChange={(e) =>
                        handleLinkChange(index, "url", e.target.value)
                      }
                      placeholder="Enter link URL"
                    />
                    <Input
                      value={link.description}
                      onChange={(e) =>
                        handleLinkChange(index, "description", e.target.value)
                      }
                      placeholder="Enter link description"
                    />
                    <button
                      onClick={() => handleRemoveLink(index)}
                      aria-label="Remove link"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
                <Button
                  onClick={handleAddLink}
                  variant="outline"
                  className="w-full"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (nodeType === "notes") {
                onSave({
                  title: notesTitle,
                  content: notesContent,
                  color: notesColor,
                });
              } else {
                onSave({
                  action,
                  description,
                  people: selectedPeople,
                  tools: selectedTools,
                  links,
                });
              }
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
