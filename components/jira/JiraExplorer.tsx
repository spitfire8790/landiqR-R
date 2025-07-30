"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { jiraService, JiraIssue } from "@/lib/jira-service";
import { Loader2, CheckCircle, AlertCircle, User, Mail } from "lucide-react";

export default function JiraExplorer() {
  const [loading, setLoading] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [explorationData, setExplorationData] = useState<any>(null);
  const [helpdeskIssues, setHelpdeskIssues] = useState<JiraIssue[]>([]);
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading("connection");
    setError(null);
    try {
      const result = await jiraService.testConnection();
      setConnectionStatus(result);
      if (!result.success) {
        setError(result.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setLoading(null);
    }
  };

  const exploreStructure = async () => {
    setLoading("explore");
    setError(null);
    try {
      const result = await jiraService.exploreHelpdeskStructure();
      if (result.success) {
        setExplorationData(result.data);
        // Extract issues from the response
        if (result.data?.sampleIssues?.issues) {
          setHelpdeskIssues(result.data.sampleIssues.issues);
          // Extract emails from issues
          const emails = jiraService.extractUserEmails(
            result.data.sampleIssues.issues
          );
          setExtractedEmails(emails);
        }
      } else {
        setError(result.error || "Failed to explore helpdesk structure");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Exploration failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Jira Connection Setup</CardTitle>
          <CardDescription>
            Connect to your Jira instance to access helpdesk data and user
            emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Setup Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                Add these environment variables to your <code>.env.local</code>{" "}
                file:
              </p>
              <pre className="bg-muted p-2 rounded text-sm">
                {`JIRA_DOMAIN=your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token`}
              </pre>
              <p className="mt-2 text-sm">
                Generate an API token at:{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Atlassian API Tokens
                </a>
              </p>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={testConnection} disabled={loading !== null}>
              {loading === "connection" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={exploreStructure}
              disabled={loading !== null || !connectionStatus?.success}
              variant="secondary"
            >
              {loading === "explore" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Explore Helpdesk Data
            </Button>
          </div>

          {/* Connection Status */}
          {connectionStatus && (
            <Alert
              variant={connectionStatus.success ? "default" : "destructive"}
            >
              {connectionStatus.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Connected Successfully</AlertTitle>
                  <AlertDescription>
                    {connectionStatus.result && (
                      <div className="mt-2">
                        <p>
                          <strong>User:</strong>{" "}
                          {connectionStatus.result.displayName}
                        </p>
                        <p>
                          <strong>Email:</strong>{" "}
                          {connectionStatus.result.emailAddress}
                        </p>
                        <p>
                          <strong>Account ID:</strong>{" "}
                          {connectionStatus.result.accountId}
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Connection Failed</AlertTitle>
                  <AlertDescription>{connectionStatus.error}</AlertDescription>
                </>
              )}
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Exploration Results */}
      {explorationData && (
        <Card>
          <CardHeader>
            <CardTitle>Jira Data Structure</CardTitle>
            <CardDescription>
              Explore the available data from your Jira helpdesk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="issues" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="emails">Extracted Emails</TabsTrigger>
                <TabsTrigger value="fields">Custom Fields</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Sample Helpdesk Issues
                  </h3>
                  <Badge variant="secondary">
                    {explorationData.sampleIssues?.total || 0} total issues
                  </Badge>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {helpdeskIssues.map((issue) => (
                      <Card key={issue.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{issue.key}</h4>
                              <p className="text-sm text-muted-foreground">
                                {issue.fields.summary}
                              </p>
                            </div>
                            <Badge>{issue.fields.status.name}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Type:</span>{" "}
                              {issue.fields.issuetype.name}
                            </div>
                            <div>
                              <span className="font-medium">Priority:</span>{" "}
                              {issue.fields.priority?.name || "None"}
                            </div>
                            <div>
                              <span className="font-medium">Reporter:</span>{" "}
                              {issue.fields.reporter?.displayName}
                              {issue.fields.reporter?.emailAddress && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({issue.fields.reporter.emailAddress})
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span>{" "}
                              {new Date(
                                issue.fields.created
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          {/* Request Participants */}
                          {issue.fields.customfield_10032 &&
                            issue.fields.customfield_10032.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium">
                                  Request Participants:
                                </span>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {issue.fields.customfield_10032.map(
                                    (participant: any, idx: number) => (
                                      <Badge key={idx} variant="outline">
                                        <User className="mr-1 h-3 w-3" />
                                        {participant.displayName ||
                                          participant.emailAddress}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Mailing List */}
                          {issue.fields.customfield_10133 &&
                            issue.fields.customfield_10133.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium">
                                  Mailing List:
                                </span>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {issue.fields.customfield_10133.map(
                                    (participant: any, idx: number) => (
                                      <Badge key={idx} variant="outline">
                                        <Mail className="mr-1 h-3 w-3" />
                                        {participant.displayName ||
                                          participant.emailAddress}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Direct Email Fields */}
                          {issue.fields.customfield_10171 && (
                            <div className="text-sm">
                              <span className="font-medium">Email:</span>{" "}
                              {issue.fields.customfield_10171}
                            </div>
                          )}
                          {issue.fields.customfield_10202 && (
                            <div className="text-sm">
                              <span className="font-medium">
                                Company Email:
                              </span>{" "}
                              {issue.fields.customfield_10202}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Emails Tab */}
              <TabsContent value="emails" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Extracted Email Addresses
                  </h3>
                  <Badge variant="secondary">
                    {extractedEmails.length} unique emails
                  </Badge>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {extractedEmails.map((email, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent value="fields" className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Available Custom Fields
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {explorationData.availableFields
                      ?.filter((field: any) => field.custom)
                      .map((field: any) => (
                        <Card key={field.id} className="p-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium">{field.name}</h4>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {field.id}
                              </code>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Type: {field.schema?.type || "Unknown"}
                              {field.schema?.custom &&
                                ` (${field.schema.custom})`}
                            </p>
                          </div>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-4">
                <h3 className="text-lg font-semibold">Service Desk Projects</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {explorationData.projects?.map((project: any) => (
                      <Card key={project.id} className="p-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{project.name}</h4>
                            <Badge variant="outline">{project.key}</Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Type: {project.projectTypeKey} | ID: {project.id}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
