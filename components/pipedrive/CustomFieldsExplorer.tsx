"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Search,
  Info,
  Code,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import { useToast } from "@/components/ui/use-toast";

interface CustomField {
  id: number;
  key: string;
  name: string;
  field_type: string;
  options?: Array<{
    id: number;
    label: string;
    color?: string;
  }>;
  mandatory_flag: boolean;
  edit_flag: boolean;
  details_visible_flag: boolean;
  add_visible_flag: boolean;
  important_flag: boolean;
  bulk_edit_allowed: boolean;
  searchable_flag: boolean;
}

interface CustomFieldsData {
  personFields: CustomField[];
  organizationFields: CustomField[];
  dealFields: CustomField[];
  activityFields: CustomField[];
}

export default function CustomFieldsExplorer() {
  const [isLoading, setIsLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldsData>({
    personFields: [],
    organizationFields: [],
    dealFields: [],
    activityFields: [],
  });
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyCustom, setShowOnlyCustom] = useState(true);

  const { toast } = useToast();

  const loadCustomFields = async () => {
    setIsLoading(true);
    try {
      const fieldsData = await pipedriveService.getAllCustomFields();
      setCustomFields(fieldsData);

      console.log("Custom Fields Data:", fieldsData);

      toast({
        title: "Custom Fields Loaded",
        description:
          "Successfully loaded all custom field definitions from Pipedrive.",
      });
    } catch (error) {
      console.error("Failed to load custom fields:", error);
      toast({
        title: "Load Failed",
        description:
          "Failed to load custom field definitions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomFields();
  }, []);

  const toggleFieldExpansion = (fieldKey: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldKey)) {
      newExpanded.delete(fieldKey);
    } else {
      newExpanded.add(fieldKey);
    }
    setExpandedFields(newExpanded);
  };

  const filterFields = (fields: CustomField[]) => {
    let filtered = fields;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (field) =>
          field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          field.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter to show only custom fields (exclude standard fields)
    if (showOnlyCustom) {
      filtered = filtered.filter(
        (field) =>
          field.key.includes("_") ||
          field.field_type === "enum" ||
          field.field_type === "set" ||
          field.id > 1000 // Custom fields typically have higher IDs
      );
    }

    return filtered;
  };

  const getFieldTypeColor = (fieldType: string) => {
    switch (fieldType) {
      case "enum":
        return "bg-blue-100 text-blue-800";
      case "set":
        return "bg-green-100 text-green-800";
      case "varchar":
        return "bg-gray-100 text-gray-800";
      case "text":
        return "bg-yellow-100 text-yellow-800";
      case "int":
        return "bg-purple-100 text-purple-800";
      case "decimal":
        return "bg-orange-100 text-orange-800";
      case "date":
        return "bg-pink-100 text-pink-800";
      case "datetime":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderField = (field: CustomField, category: string) => {
    const isExpanded = expandedFields.has(`${category}-${field.key}`);
    const hasOptions = field.options && field.options.length > 0;

    return (
      <Card key={`${category}-${field.key}`} className="mb-3">
        <div
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleFieldExpansion(`${category}-${field.key}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasOptions ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {field.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Code className="w-3 h-3 mr-1" />
                      {field.key}
                    </Badge>
                    <Badge
                      className={`text-xs ${getFieldTypeColor(
                        field.field_type
                      )}`}
                    >
                      {field.field_type}
                    </Badge>
                    {field.mandatory_flag && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Badge variant="outline" className="text-xs">
                  ID: {field.id}
                </Badge>
                {hasOptions && (
                  <Badge variant="secondary" className="text-xs">
                    {field.options?.length} options
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </div>

        {isExpanded && hasOptions && (
          <CardContent className="pt-0">
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Available Options:
              </h4>
              <div className="grid gap-2">
                {field.options?.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      {option.color && (
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ID: {option.id}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderFieldsTab = (
    fields: CustomField[],
    category: string,
    title: string
  ) => {
    const filteredFields = filterFields(fields);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="outline">
            {filteredFields.length} field
            {filteredFields.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {filteredFields.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No custom fields found matching your criteria
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFields.map((field) => renderField(field, category))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full w-full p-4 bg-gray-50">
        <div className="mb-4">
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pipedrive Custom Fields Explorer
            </h1>
            <p className="text-gray-600 text-sm">
              Discover and explore custom fields, their codes, and available
              options
            </p>
          </div>
          <Button
            onClick={loadCustomFields}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Fields
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search fields by name or key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyCustom}
              onChange={(e) => setShowOnlyCustom(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Show only custom fields</span>
            {showOnlyCustom ? (
              <Eye className="w-4 h-4 text-gray-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500" />
            )}
          </label>
        </div>
      </div>

      {/* Fields Tabs */}
      <Tabs defaultValue="persons" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="persons">
            Persons ({filterFields(customFields.personFields).length})
          </TabsTrigger>
          <TabsTrigger value="organizations">
            Organizations (
            {filterFields(customFields.organizationFields).length})
          </TabsTrigger>
          <TabsTrigger value="deals">
            Deals ({filterFields(customFields.dealFields).length})
          </TabsTrigger>
          <TabsTrigger value="activities">
            Activities ({filterFields(customFields.activityFields).length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="persons">
            {renderFieldsTab(
              customFields.personFields,
              "person",
              "Person Custom Fields"
            )}
          </TabsContent>

          <TabsContent value="organizations">
            {renderFieldsTab(
              customFields.organizationFields,
              "organization",
              "Organization Custom Fields"
            )}
          </TabsContent>

          <TabsContent value="deals">
            {renderFieldsTab(
              customFields.dealFields,
              "deal",
              "Deal Custom Fields"
            )}
          </TabsContent>

          <TabsContent value="activities">
            {renderFieldsTab(
              customFields.activityFields,
              "activity",
              "Activity Custom Fields"
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
