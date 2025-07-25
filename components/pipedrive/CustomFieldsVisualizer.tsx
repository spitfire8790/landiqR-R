"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react";
import { pipedriveService } from "@/lib/pipedrive-service";
import { useToast } from "@/components/ui/use-toast";

interface CustomFieldVisualization {
  fieldKey: string;
  fieldName: string;
  fieldType: string;
  dataType: "persons" | "organizations" | "deals" | "activities";
  chartData: Array<{ label: string; value: number; percentage: number }>;
  totalRecords: number;
}

export default function CustomFieldsVisualizer() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<
    "persons" | "organizations" | "deals" | "activities"
  >("persons");
  const [selectedField, setSelectedField] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<
    Array<{ key: string; name: string; type: string }>
  >([]);
  const [visualization, setVisualization] =
    useState<CustomFieldVisualization | null>(null);

  const { toast } = useToast();

  const loadAvailableFields = async () => {
    try {
      const fieldsData = await pipedriveService.getAllCustomFields();

      let fields: Array<{ key: string; name: string; type: string }> = [];

      switch (selectedDataType) {
        case "persons":
          fields = fieldsData.personFields
            .filter(
              (f) =>
                f.field_type === "enum" || f.field_type === "set" || f.options
            )
            .map((f) => ({ key: f.key, name: f.name, type: f.field_type }));
          break;
        case "organizations":
          fields = fieldsData.organizationFields
            .filter(
              (f) =>
                f.field_type === "enum" || f.field_type === "set" || f.options
            )
            .map((f) => ({ key: f.key, name: f.name, type: f.field_type }));
          break;
        case "deals":
          fields = fieldsData.dealFields
            .filter(
              (f) =>
                f.field_type === "enum" || f.field_type === "set" || f.options
            )
            .map((f) => ({ key: f.key, name: f.name, type: f.field_type }));
          break;
        case "activities":
          fields = fieldsData.activityFields
            .filter(
              (f) =>
                f.field_type === "enum" || f.field_type === "set" || f.options
            )
            .map((f) => ({ key: f.key, name: f.name, type: f.field_type }));
          break;
      }

      setAvailableFields(fields);
      setSelectedField("");
    } catch (error) {
      console.error("Failed to load available fields:", error);
      toast({
        title: "Load Failed",
        description: "Failed to load available custom fields.",
        variant: "destructive",
      });
    }
  };

  const generateVisualization = async () => {
    if (!selectedField) return;

    setIsLoading(true);
    try {
      // Get the field definition and data
      const fieldsData = await pipedriveService.getAllCustomFields();
      let data: any[] = [];
      let fieldDefinitions: any[] = [];

      // Fetch the appropriate data and field definitions
      switch (selectedDataType) {
        case "persons":
          data = await pipedriveService.fetchPersons();
          fieldDefinitions = fieldsData.personFields;
          break;
        case "organizations":
          data = await pipedriveService.fetchOrganisations();
          fieldDefinitions = fieldsData.organizationFields;
          break;
        case "deals":
          data = await pipedriveService.fetchDeals();
          fieldDefinitions = fieldsData.dealFields;
          break;
        case "activities":
          data = await pipedriveService.fetchActivities();
          fieldDefinitions = fieldsData.activityFields;
          break;
      }

      // Find the field definition
      const field = fieldDefinitions.find((f) => f.key === selectedField);
      if (!field) {
        throw new Error(`Field ${selectedField} not found`);
      }

      // Count values - using any type to access custom fields
      const valueCounts = new Map<string, number>();

      data.forEach((record: any) => {
        const value = record[selectedField];
        let label = "Not Set";

        if (value !== null && value !== undefined && value !== "") {
          if (field.options && Array.isArray(field.options)) {
            // Handle enum/set fields with options
            if (Array.isArray(value)) {
              // Multiple values (set type)
              const labels = value.map((v) => {
                const option = field.options.find((opt: any) => opt.id === v);
                return option ? option.label : v;
              });
              label = labels.join(", ");
            } else {
              // Single value (enum type)
              const option = field.options.find((opt: any) => opt.id === value);
              label = option ? option.label : String(value);
            }
          } else {
            label = String(value);
          }
        }

        valueCounts.set(label, (valueCounts.get(label) || 0) + 1);
      });

      // Convert to chart data
      const total = data.length;
      const chartData = Array.from(valueCounts.entries())
        .map(([label, count]) => ({
          label,
          value: count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.value - a.value);

      setVisualization({
        fieldKey: selectedField,
        fieldName: field.name,
        fieldType: field.field_type,
        dataType: selectedDataType,
        chartData,
        totalRecords: total,
      });

      console.log(`Custom Field Analysis for ${field.name}:`, {
        field,
        chartData,
        rawData: data.slice(0, 5), // Sample of raw data
      });

      toast({
        title: "Visualization Created",
        description: `Successfully analyzed ${total} ${selectedDataType} records.`,
      });
    } catch (error) {
      console.error("Failed to generate visualization:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate visualization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableFields();
  }, [selectedDataType]);

  const renderBarChart = (
    data: Array<{ label: string; value: number; percentage: number }>
  ) => {
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
      <div className="space-y-2">
        {data.slice(0, 10).map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-32 text-sm truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 relative">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                >
                  <span className="text-white text-xs font-medium">
                    {item.value}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-12 text-sm text-gray-600">{item.percentage}%</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full p-4 bg-gray-50 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Custom Fields Visualizer
        </h1>
        <p className="text-gray-600 text-sm">
          Create visualizations from Pipedrive custom field data
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Visualization Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <Select
                value={selectedDataType}
                onValueChange={(value: any) => setSelectedDataType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persons">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Persons</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="organizations">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>Organizations</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="deals">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Deals</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="activities">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Activities</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Field
              </label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a field..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      <div className="flex items-center justify-between w-full">
                        <span>{field.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateVisualization}
                disabled={!selectedField || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Generate Chart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      {visualization && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {visualization.fieldName}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Distribution across {visualization.totalRecords}{" "}
                  {visualization.dataType}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{visualization.fieldType}</Badge>
                <Badge>{visualization.chartData.length} unique values</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderBarChart(visualization.chartData)}

            {visualization.chartData.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                Showing top 10 values. Total {visualization.chartData.length}{" "}
                unique values found.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!visualization && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Select a data type and custom field to generate a visualization
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
