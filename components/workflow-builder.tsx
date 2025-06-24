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
  Undo,
  Redo,
  Copy,
  Clipboard,
  AlertTriangle,
  Diamond,
  Play,
  Square,
  GitBranch,
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

  // Check if this step should be highlighted based on filters
  const isHighlighted = shouldHighlightStep(
    data.people || [],
    peopleData,
    data.filterPerson || "",
    data.filterOrganisation || ""
  );

  // Apply dulling effect if filters are active and this step doesn't match
  const hasActiveFilters =
    (data.filterPerson && data.filterPerson !== "all") ||
    (data.filterOrganisation && data.filterOrganisation !== "all");
  const isDulled = hasActiveFilters && !isHighlighted;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`px-4 py-3 shadow-md rounded-md ${colors.bg} border-2 ${
          selected ? colors.selectedBorder : colors.border
        } min-w-[200px] max-w-[280px] cursor-pointer relative transition-opacity duration-300 ${
          isDulled ? "opacity-30" : "opacity-100"
        }`}
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

// Decision node component (diamond shape)
const DecisionNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const colors = getStepNodeColor(data.people, data.peopleData || []);

  // Check if this step should be highlighted based on filters
  const isHighlighted = shouldHighlightStep(
    data.people || [],
    data.peopleData || [],
    data.filterPerson || "",
    data.filterOrganisation || ""
  );

  const hasActiveFilters =
    (data.filterPerson && data.filterPerson !== "all") ||
    (data.filterOrganisation && data.filterOrganisation !== "all");
  const isDulled = hasActiveFilters && !isHighlighted;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`relative cursor-pointer transition-opacity duration-300 ${
          isDulled ? "opacity-30" : "opacity-100"
        }`}
        style={{ width: "120px", height: "120px" }}
      >
        {/* Diamond shape */}
        <div
          className={`absolute inset-0 transform rotate-45 ${
            colors.bg
          } border-2 ${
            selected ? colors.selectedBorder : colors.border
          } shadow-md`}
          style={{
            animation: selected
              ? "glow-selected 2s ease-in-out infinite alternate"
              : "glow 3s ease-in-out infinite alternate",
            boxShadow: selected
              ? `0 0 12px ${colors.glow}, 0 0 20px ${colors.glow}, 0 0 30px ${colors.glow}`
              : `0 0 8px ${colors.glow}, 0 0 15px ${colors.glow}, 0 0 20px ${colors.glow}`,
          }}
        />

        {/* Content container */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center max-w-full">
            <div className="font-semibold text-gray-900 text-sm">
              {data.action || "Decision"}
            </div>
            {data.description && (
              <div className="text-xs text-gray-700 mt-1">
                {data.description}
              </div>
            )}
          </div>
        </div>

        {/* Connection handles with labels */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
          style={{ top: -6 }}
        />

        {/* Yes (green) - right side */}
        <Handle
          type="source"
          position={Position.Right}
          id="yes"
          className="w-3 h-3 !bg-green-500 border-2 border-white"
          style={{ right: -6 }}
        />
        <span className="absolute right-0 top-1/4 transform translate-x-full -translate-y-1/2 text-xs font-semibold text-green-600 whitespace-nowrap bg-white px-1 rounded shadow-sm border ml-2">
          Yes
        </span>

        {/* No (red) - bottom side */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="no"
          className="w-3 h-3 !bg-red-500 border-2 border-white"
          style={{ bottom: -6 }}
        />
        <span className="absolute bottom-0 left-3/4 transform translate-y-full -translate-x-1/2 text-xs font-semibold text-red-600 whitespace-nowrap bg-white px-1 rounded shadow-sm border mt-2">
          No
        </span>

        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
          style={{ left: -6 }}
        />
      </div>
    </>
  );
};

// Start node component (circle with play icon)
const StartNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const isDulled = false; // Start nodes are always visible

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`relative cursor-pointer transition-opacity duration-300 ${
          isDulled ? "opacity-30" : "opacity-100"
        }`}
      >
        {/* Circle shape */}
        <div
          className={`w-20 h-20 rounded-full bg-green-100 border-2 ${
            selected ? "border-green-500" : "border-green-300"
          } shadow-md flex items-center justify-center`}
          style={{
            animation: selected
              ? "glow-selected 2s ease-in-out infinite alternate"
              : "glow 3s ease-in-out infinite alternate",
            boxShadow: selected
              ? `0 0 12px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.2), 0 0 30px rgba(34, 197, 94, 0.1)`
              : `0 0 8px rgba(34, 197, 94, 0.2), 0 0 15px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.05)`,
          }}
        >
          <Play className="h-8 w-8 text-green-600" fill="currentColor" />
        </div>

        {/* Label below */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
          <div className="font-semibold text-gray-900 text-sm whitespace-nowrap">
            {data.action || "Start"}
          </div>
        </div>

        {/* Connection handles */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="w-3 h-3 !bg-green-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="w-3 h-3 !bg-green-500 border-2 border-white"
        />
      </div>
    </>
  );
};

// End node component (circle with square icon)
const EndNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const isDulled = false; // End nodes are always visible

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`relative cursor-pointer transition-opacity duration-300 ${
          isDulled ? "opacity-30" : "opacity-100"
        }`}
      >
        {/* Circle shape */}
        <div
          className={`w-20 h-20 rounded-full bg-red-100 border-2 ${
            selected ? "border-red-500" : "border-red-300"
          } shadow-md flex items-center justify-center`}
          style={{
            animation: selected
              ? "glow-selected 2s ease-in-out infinite alternate"
              : "glow 3s ease-in-out infinite alternate",
            boxShadow: selected
              ? `0 0 12px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.1)`
              : `0 0 8px rgba(239, 68, 68, 0.2), 0 0 15px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.05)`,
          }}
        >
          <Square className="h-6 w-6 text-red-600" fill="currentColor" />
        </div>

        {/* Label below */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
          <div className="font-semibold text-gray-900 text-sm whitespace-nowrap">
            {data.action || "End"}
          </div>
        </div>

        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="w-3 h-3 !bg-red-500 border-2 border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="w-3 h-3 !bg-red-500 border-2 border-white"
        />
      </div>
    </>
  );
};

// Parallel process node component
const ParallelNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const colors = getStepNodeColor(data.people, data.peopleData || []);

  const isHighlighted = shouldHighlightStep(
    data.people || [],
    data.peopleData || [],
    data.filterPerson || "",
    data.filterOrganisation || ""
  );

  const hasActiveFilters =
    (data.filterPerson && data.filterPerson !== "all") ||
    (data.filterOrganisation && data.filterOrganisation !== "all");
  const isDulled = hasActiveFilters && !isHighlighted;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <div
        className={`px-4 py-3 shadow-md rounded-md ${colors.bg} border-2 ${
          selected ? colors.selectedBorder : colors.border
        } cursor-pointer relative transition-opacity duration-300 ${
          isDulled ? "opacity-30" : "opacity-100"
        } min-w-[200px] max-w-[280px] border-l-4 border-l-purple-500`}
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
          className="w-3 h-3 !bg-purple-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="w-3 h-3 !bg-purple-500 border-2 border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="w-3 h-3 !bg-purple-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="w-3 h-3 !bg-purple-500 border-2 border-white"
        />

        <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
          <GitBranch className="h-4 w-4 text-purple-600" />
          <span>{data.action || "Parallel Process"}</span>
        </div>

        {data.description && (
          <div className="text-xs text-gray-700 mb-2">{data.description}</div>
        )}

        <div className="text-xs text-purple-600 italic">
          Multiple activities run simultaneously
        </div>
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

// Helper function to check if a step should be highlighted based on filters
const shouldHighlightStep = (
  stepPeople: string[],
  peopleData: Person[],
  filterPerson: string,
  filterOrganisation: string
) => {
  if (
    (!filterPerson || filterPerson === "all") &&
    (!filterOrganisation || filterOrganisation === "all")
  )
    return true; // No filters active

  // Check if any of the step's people match the filters
  for (const personId of stepPeople) {
    // Handle generic users
    if (personId === "user" || personId === "customer") {
      if (filterPerson && filterPerson !== "all" && filterPerson === personId)
        return true;
      continue;
    }

    // Handle real people
    const person = peopleData.find((p) => p.id === personId);
    if (person) {
      if (filterPerson && filterPerson !== "all" && filterPerson === personId)
        return true;
      if (
        filterOrganisation &&
        filterOrganisation !== "all" &&
        filterOrganisation === person.organisation
      )
        return true;
    }
  }

  return false;
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
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [filterOrganisation, setFilterOrganisation] = useState<string>("all");

  // Undo/Redo system
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>(
    []
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Workflow validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Copy/Paste functionality
  const [clipboard, setClipboard] = useState<{
    nodes: Node[];
    edges: Edge[];
  } | null>(null);

  // Edge label functionality
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeLabelDialogOpen, setEdgeLabelDialogOpen] = useState(false);

  // Save state to history for undo/redo
  const saveToHistory = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (isUndoRedoAction) return;

      const newState = { nodes: newNodes, edges: newEdges };
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newState);
        // Limit history to 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex, isUndoRedoAction]
  );

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoRedoAction(true);
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex((prev) => prev - 1);
      setTimeout(() => setIsUndoRedoAction(false), 0);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedoAction(true);
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex((prev) => prev + 1);
      setTimeout(() => setIsUndoRedoAction(false), 0);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Workflow validation function
  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(
      (node) => !connectedNodeIds.has(node.id) && nodes.length > 1
    );

    if (disconnectedNodes.length > 0) {
      errors.push(`${disconnectedNodes.length} disconnected node(s) found`);
    }

    // Check for circular dependencies (simple cycle detection)
    const hasCycle = () => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const dfs = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          if (dfs(edge.target)) return true;
        }

        recursionStack.delete(nodeId);
        return false;
      };

      for (const node of nodes) {
        if (!visited.has(node.id) && dfs(node.id)) {
          return true;
        }
      }
      return false;
    };

    if (hasCycle()) {
      errors.push("Circular dependency detected in workflow");
    }

    // Check for nodes without people assigned
    const nodesWithoutPeople = nodes.filter(
      (node) =>
        node.type === "step" &&
        (!node.data?.people ||
          !Array.isArray(node.data.people) ||
          node.data.people.length === 0)
    );

    if (nodesWithoutPeople.length > 0) {
      errors.push(
        `${nodesWithoutPeople.length} step(s) without assigned people`
      );
    }

    // Check for empty step names
    const emptySteps = nodes.filter(
      (node) =>
        node.type === "step" &&
        (!node.data?.action ||
          typeof node.data.action !== "string" ||
          node.data.action.trim() === "")
    );

    if (emptySteps.length > 0) {
      errors.push(`${emptySteps.length} step(s) without names`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [nodes, edges]);

  // Copy selected nodes and edges
  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = edges.filter(
      (edge) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    if (selectedNodes.length > 0) {
      setClipboard({ nodes: selectedNodes, edges: selectedEdges });
      toast({
        title: "Copied",
        description: `Copied ${selectedNodes.length} node(s) and ${selectedEdges.length} edge(s)`,
      });
    }
  }, [nodes, edges, toast]);

  // Paste copied nodes and edges
  const pasteSelection = useCallback(() => {
    if (!clipboard) return;

    const offset = 50; // Offset for pasted items
    const nodeIdMap = new Map<string, string>();

    // Create new nodes with new IDs
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `${node.type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      nodeIdMap.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset,
        },
        selected: true,
        data: {
          ...node.data,
          toolsData: tools,
          peopleData: people,
          filterPerson,
          filterOrganisation,
        },
      };
    });

    // Create new edges with updated node IDs
    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target,
      selected: true,
    }));

    // Clear existing selection
    setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: false })));

    // Add new nodes and edges
    setNodes((nds) => nds.concat(newNodes));
    setEdges((eds) => eds.concat(newEdges));

    toast({
      title: "Pasted",
      description: `Pasted ${newNodes.length} node(s) and ${newEdges.length} edge(s)`,
    });
  }, [
    clipboard,
    tools,
    people,
    filterPerson,
    filterOrganisation,
    setNodes,
    setEdges,
    toast,
  ]);

  // Handle sidebar resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  // Define nodeTypes inside component
  const nodeTypes = useMemo(
    () => ({
      step: StepNode,
      notes: NotesNode,
      decision: DecisionNode,
      start: StartNode,
      end: EndNode,
      parallel: ParallelNode,
    }),
    []
  );

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

  // Track changes for undo/redo
  useEffect(() => {
    if (!isUndoRedoAction) {
      saveToHistory(nodes, edges);
    }
  }, [nodes, edges, saveToHistory, isUndoRedoAction]);

  // Handle keyboard events for deletion and undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle undo/redo
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        undo();
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "y" || (event.key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
        return;
      }

      // Handle copy/paste
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        pasteSelection();
        return;
      }

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

  // Handle new connections
  const onConnect = useCallback(
  (params: Connection) => {
    // Defensive: Ensure sourceHandle and targetHandle are always set
    let { sourceHandle, targetHandle, source, target } = params;
    if (!sourceHandle) {
      // Try to guess the most likely handle id based on node type
      // (You may want to improve this logic if you add more node types)
      if (source && source.startsWith('start')) sourceHandle = 'bottom';
      else if (source && source.startsWith('step')) sourceHandle = 'bottom';
      else if (source && source.startsWith('parallel')) sourceHandle = 'bottom';
      else if (source && source.startsWith('decision')) sourceHandle = 'yes'; // default to 'yes' for decision
      else sourceHandle = 'bottom';
      console.warn('Missing sourceHandle on connect, defaulting to', sourceHandle, params);
    }
    if (!targetHandle) {
      if (target && target.startsWith('end')) targetHandle = 'top';
      else if (target && target.startsWith('step')) targetHandle = 'top';
      else if (target && target.startsWith('parallel')) targetHandle = 'top';
      else if (target && target.startsWith('decision')) targetHandle = 'top';
      else targetHandle = 'top';
      console.warn('Missing targetHandle on connect, defaulting to', targetHandle, params);
    }
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          id: `edge-${Date.now()}`,
          sourceHandle,
          targetHandle,
        },
        eds
      )
    );
  },
  [setEdges]
);


  // Load existing workflow data
  useEffect(() => {
    if (existingWorkflow) {
      try {
        const flowData: WorkflowData = JSON.parse(existingWorkflow.flowData);
        // Add toolsData, peopleData, and filter data to existing nodes so they can display information
        const nodesWithData = (flowData.nodes || []).map((node) => ({
          ...node,
          data: {
            ...node.data,
            toolsData: tools,
            peopleData: people,
            filterPerson,
            filterOrganisation,
          },
        }));
        setNodes(nodesWithData);
        setEdges(flowData.edges || []);
      } catch (error) {
        console.error("Error parsing existing workflow data:", error);
      }
    }
  }, [existingWorkflow, tools, people, setNodes, setEdges]);

  // Update nodes with filter data when filters change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          filterPerson,
          filterOrganisation,
        },
      }))
    );
  }, [filterPerson, filterOrganisation, setNodes]);

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

  // Edge double-click handler for editing labels
  const onEdgeDoubleClick: EdgeMouseHandler = useCallback((event, edge) => {
    setEditingEdgeId(edge.id);
    setEdgeLabelDialogOpen(true);
  }, []);

  // Handle edge label update
  const handleEdgeLabelUpdate = useCallback(
    (label: string) => {
      if (editingEdgeId) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === editingEdgeId
              ? { ...edge, label: label.trim() || undefined }
              : edge
          )
        );
        setEditingEdgeId(null);
        setEdgeLabelDialogOpen(false);
      }
    },
    [editingEdgeId, setEdges]
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
        filterPerson,
        filterOrganisation,
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

  // Add new decision node
  const addDecisionNode = () => {
    const newNode: Node = {
      id: `decision-${Date.now()}`,
      type: "decision",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        action: "Decision Point",
        description: "Choose path based on criteria",
        people: [],
        tools: [],
        toolsData: tools,
        peopleData: people,
        filterPerson,
        filterOrganisation,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // Add new start node
  const addStartNode = () => {
    const newNode: Node = {
      id: `start-${Date.now()}`,
      type: "start",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        action: "Start",
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // Add new end node
  const addEndNode = () => {
    const newNode: Node = {
      id: `end-${Date.now()}`,
      type: "end",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        action: "End",
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // Add new parallel node
  const addParallelNode = () => {
    const newNode: Node = {
      id: `parallel-${Date.now()}`,
      type: "parallel",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        action: "Parallel Process",
        description: "Multiple tasks running simultaneously",
        people: [],
        tools: [],
        toolsData: tools,
        peopleData: people,
        filterPerson,
        filterOrganisation,
      },
    };
    setNodes((nds) => nds.concat(newNode));
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
                // Only add toolsData, peopleData, and filter data for step nodes
                ...(n.type === "step"
                  ? {
                      toolsData: tools,
                      peopleData: people,
                      filterPerson,
                      filterOrganisation,
                    }
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
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
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

  // Add animated blue dashed styling to all edges while preserving handle information
  const animatedEdges = edges.map((edge) => ({
    ...edge,
    animated: true,
    style: {
      strokeDasharray: "5,5", // Dashed line
      stroke: edge.selected ? "#ef4444" : "#3b82f6", // Red when selected, blue otherwise
      strokeWidth: edge.selected ? 3 : 2, // Thicker when selected
    },
    type: "smoothstep",
    // Preserve handle information for consistent connection points
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
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
            <h3 className="text-lg font-semibold mb-2">Filters</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="filter-person">Filter by Person</Label>
                <Select value={filterPerson} onValueChange={setFilterPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="All people" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All people</SelectItem>
                    <SelectItem value="user">User (Generic)</SelectItem>
                    <SelectItem value="customer">Customer (Generic)</SelectItem>
                    {people
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.organisation})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-organisation">
                  Filter by Organisation
                </Label>
                <Select
                  value={filterOrganisation}
                  onValueChange={setFilterOrganisation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All organisations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organisations</SelectItem>
                    {Array.from(new Set(people.map((p) => p.organisation)))
                      .sort()
                      .map((org) => (
                        <SelectItem key={org} value={org}>
                          {org}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterPerson !== "all" || filterOrganisation !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterPerson("all");
                    setFilterOrganisation("all");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
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

          <div>
            <h3 className="text-lg font-semibold mb-2">Add Decision Node</h3>
            <Button
              onClick={addDecisionNode}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Diamond className="h-4 w-4 text-blue-600" />
              <span>Add Decision</span>
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={undo}
                disabled={historyIndex <= 0}
                variant="outline"
                size="sm"
                className="flex-1"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="h-4 w-4 mr-1" />
                Undo
              </Button>
              <Button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                variant="outline"
                size="sm"
                className="flex-1"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="h-4 w-4 mr-1" />
                Redo
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copySelection}
                disabled={!nodes.some((node) => node.selected)}
                variant="outline"
                size="sm"
                className="flex-1"
                title="Copy (Ctrl+C)"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                onClick={pasteSelection}
                disabled={!clipboard}
                variant="outline"
                size="sm"
                className="flex-1"
                title="Paste (Ctrl+V)"
              >
                <Clipboard className="h-4 w-4 mr-1" />
                Paste
              </Button>
            </div>
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
            <Button
              onClick={() => {
                validateWorkflow();
                setShowValidation(true);
              }}
              variant="outline"
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Validate Workflow
            </Button>
          </div>

          {/* Validation Results */}
          {showValidation && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Validation Results</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValidation(false)}
                  className="p-1 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {validationErrors.length === 0 ? (
                <div className="text-green-600 text-sm">
                  ✓ Workflow validation passed
                </div>
              ) : (
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div
                      key={index}
                      className="text-red-600 text-sm flex items-start gap-1"
                    >
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
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
        <EdgeLabelDialog
          open={edgeLabelDialogOpen}
          onOpenChange={setEdgeLabelDialogOpen}
          onSave={handleEdgeLabelUpdate}
          currentLabel={
            editingEdgeId
              ? (edges.find((e) => e.id === editingEdgeId)?.label as string) ||
                ""
              : ""
          }
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

// EdgeLabelDialog component for editing edge labels
function EdgeLabelDialog({
  open,
  onOpenChange,
  onSave,
  currentLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (label: string) => void;
  currentLabel: string;
}) {
  const [label, setLabel] = useState(currentLabel);

  useEffect(() => {
    setLabel(currentLabel);
  }, [currentLabel, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(label);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? "" : "hidden"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edge-label-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 id="edge-label-dialog-title" className="text-lg font-semibold mb-4">
          Edit Connection Label
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edge-label">Label</Label>
              <Input
                id="edge-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter connection label (optional)"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Label</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
