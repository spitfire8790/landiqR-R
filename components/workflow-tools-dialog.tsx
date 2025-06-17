"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WorkflowTool } from "@/lib/types";
import {
  fetchWorkflowTools,
  createWorkflowTool,
  updateWorkflowTool,
  deleteWorkflowTool,
} from "@/lib/data-service";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import * as LucideIcons from "lucide-react";

interface WorkflowToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOOL_CATEGORIES = [
  "analysis",
  "communication",
  "review",
  "data-processing",
  "reporting",
  "quality",
  "approval",
  "validation",
  "general",
];

const ICON_OPTIONS = [
  "BarChart3",
  "Mail",
  "FileText",
  "Database",
  "FileOutput",
  "CheckCircle2",
  "Stamp",
  "Shield",
  "Bell",
  "FileProcessing",
  "Settings",
  "Wrench",
  "Cog",
  "Search",
  "Filter",
  "Download",
  "Upload",
  "Copy",
  "Edit",
  "Trash2",
];

async function uploadToolIcon(file: File): Promise<string | null> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from("tool-icons")
    .upload(fileName, file, { upsert: true });
  if (error) {
    console.error("Upload error:", error);
    return null;
  }
  const { data: publicUrlData } = supabase.storage
    .from("tool-icons")
    .getPublicUrl(fileName);
  return publicUrlData?.publicUrl || null;
}

export function WorkflowToolsDialog({
  open,
  onOpenChange,
}: WorkflowToolsDialogProps) {
  const [tools, setTools] = useState<WorkflowTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTool, setEditingTool] = useState<WorkflowTool | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [category, setCategory] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTools();
      // Log current user for debugging authentication
      supabase.auth.getUser().then(({ data: { user } }) => {
        console.log("Supabase auth user:", user);
      });
    }
  }, [open]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const toolsData = await fetchWorkflowTools();
      setTools(toolsData);
    } catch (error) {
      console.error("Error loading tools:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow tools.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("");
    setCategory("");
    setEditingTool(null);
    setShowAddForm(false);
    setIconFile(null);
    setIconPreview("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let iconUrl = icon;
      if (iconFile) {
        iconUrl = await uploadToolIcon(iconFile);
        if (!iconUrl) {
          toast({
            title: "Error",
            description: "Failed to upload icon image.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      const toolData = {
        name: name.trim(),
        description: description.trim(),
        icon: iconUrl || "Wrench",
        category,
      };

      if (editingTool) {
        const updatedTool = await updateWorkflowTool({
          ...editingTool,
          ...toolData,
        });
        if (updatedTool) {
          await loadTools();
          toast({
            title: "Success",
            description: "Tool updated successfully.",
          });
          resetForm();
        }
      } else {
        const newTool = await createWorkflowTool(toolData);
        if (newTool) {
          await loadTools();
          toast({
            title: "Success",
            description: "Tool created successfully.",
          });
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving tool:", error);
      toast({
        title: "Error",
        description: "Failed to save tool. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tool: WorkflowTool) => {
    setEditingTool(tool);
    setName(tool.name);
    setDescription(tool.description);
    setIcon(tool.icon || "");
    setCategory(tool.category);
    setShowAddForm(true);
    setIconPreview(
      tool.icon &&
        (tool.icon.startsWith("http") || tool.icon.startsWith("/storage/"))
        ? tool.icon
        : ""
    );
    setIconFile(null);
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) {
      return;
    }

    setLoading(true);
    try {
      const success = await deleteWorkflowTool(toolId);
      if (success) {
        await loadTools();
        toast({
          title: "Success",
          description: "Tool deleted successfully.",
        });
      }
    } catch (error) {
      console.error("Error deleting tool:", error);
      toast({
        title: "Error",
        description: "Failed to delete tool. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, WorkflowTool[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Workflow Tools Management
          </DialogTitle>
          <DialogDescription>
            Manage the tools available for creating workflows. These tools can
            be used as building blocks in your workflow diagrams.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Available Tools</h3>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
          </div>

          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingTool ? "Edit Tool" : "Add New Tool"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tool name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={category}
                        onValueChange={setCategory}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOOL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() +
                                cat.slice(1).replace("-", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tool description"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={icon} onValueChange={setIcon}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((iconName) => (
                          <SelectItem key={iconName} value={iconName}>
                            {iconName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="icon-upload">Or Upload Image</Label>
                    <Input
                      id="icon-upload"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIconFile(file);
                          setIconPreview(URL.createObjectURL(file));
                          setIcon(""); // Clear Lucide icon if uploading image
                        }
                      }}
                    />
                    {iconPreview && (
                      <div className="mt-2">
                        <Image
                          src={iconPreview}
                          alt="Icon Preview"
                          width={40}
                          height={40}
                          className="rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {editingTool ? "Update Tool" : "Create Tool"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {Object.entries(groupedTools).map(
                ([categoryName, categoryTools]) => (
                  <div key={categoryName}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      {categoryName.charAt(0).toUpperCase() +
                        categoryName.slice(1).replace("-", " ")}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryTools.map((tool) => (
                        <Card key={tool.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {tool.icon &&
                                (tool.icon.startsWith("http") ||
                                  tool.icon.startsWith("/storage/")) ? (
                                  <Image
                                    src={tool.icon}
                                    alt={tool.name}
                                    width={24}
                                    height={24}
                                    className="rounded mr-2"
                                  />
                                ) : tool.icon &&
                                  ICON_OPTIONS.includes(tool.icon) ? (
                                  React.createElement(LucideIcons[tool.icon], {
                                    className: "h-5 w-5 mr-2",
                                  })
                                ) : (
                                  <Wrench className="h-5 w-5 mr-2" />
                                )}
                                <h5 className="font-medium">{tool.name}</h5>
                                <Badge variant="secondary" className="text-xs">
                                  {tool.category.charAt(0).toUpperCase() +
                                    tool.category.slice(1).replace("-", " ")}
                                </Badge>
                              </div>
                              {tool.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(tool)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(tool.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
