"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye } from "lucide-react";
import { customFieldValuesExtractor } from "@/lib/custom-field-values";
import { useToast } from "@/components/ui/use-toast";

export default function CustomFieldsTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [fieldValues, setFieldValues] = useState<any>(null);

  const { toast } = useToast();

  const extractValues = async () => {
    setIsLoading(true);
    try {
      const values =
        await customFieldValuesExtractor.extractAllCustomFieldValues();
      setFieldValues(values);

      // Also log to console for easy copying
      await customFieldValuesExtractor.logAllFieldValues();

      toast({
        title: "Custom Field Values Extracted",
        description:
          "Check the console for detailed output and the UI below for a summary.",
      });
    } catch (error) {
      console.error("Failed to extract custom field values:", error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract custom field values. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFieldValues = (title: string, values: any) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(values).map(([fieldName, fieldValues]) => (
            <div key={fieldName}>
              <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                {fieldName.replace(/([A-Z])/g, " $1").trim()}:
              </h4>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(fieldValues) &&
                  fieldValues.map((value, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {typeof value === "object" && value.name
                        ? value.name
                        : String(value)}
                    </Badge>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Array.isArray(fieldValues) ? fieldValues.length : 0} unique
                values
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full w-full p-4 bg-gray-50 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Custom Field Values Extractor
        </h1>
        <p className="text-gray-600 text-sm">
          Extract unique values for the custom fields defined in
          pipedrive-types.ts
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Extract Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button onClick={extractValues} disabled={isLoading} size="lg">
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Extract All Custom Field Values
            </Button>
            <p className="text-sm text-gray-600">
              This will extract all unique values for the custom fields defined
              in your types.
            </p>
          </div>
        </CardContent>
      </Card>

      {fieldValues && (
        <div className="space-y-4">
          {renderFieldValues("Deals Custom Fields", fieldValues.deals)}
          {renderFieldValues("Persons Custom Fields", fieldValues.persons)}
          {renderFieldValues(
            "Organisations Custom Fields",
            fieldValues.organisations
          )}
        </div>
      )}

      {!fieldValues && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Click the button above to extract unique values from your
              Pipedrive custom fields
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
