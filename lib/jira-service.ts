/**
 * Jira Service Module
 * Provides typed interfaces and methods for interacting with Jira REST API
 */

// Jira API Response Types
export interface JiraApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  errorMessages?: string[];
}

export interface JiraUser {
  self: string;
  accountId: string;
  accountType: string;
  emailAddress: string;
  avatarUrls: {
    [size: string]: string;
  };
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
}

export interface JiraProject {
  expand: string;
  self: string;
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties: any;
}

export interface JiraIssueType {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  avatarId?: number;
  entityId?: string;
  hierarchyLevel?: number;
  scope?: {
    type: string;
    project: {
      id: string;
    };
  };
}

export interface JiraPriority {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
}

export interface JiraStatus {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraCustomField {
  id: string;
  key: string;
  name: string;
  custom: boolean;
  orderable: boolean;
  navigable: boolean;
  searchable: boolean;
  clauseNames: string[];
  schema?: {
    type: string;
    custom?: string;
    customId?: number;
    configuration?: any;
  };
}

export interface JiraIssue {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: {
    // Standard fields
    summary: string;
    description?: string | null;
    issuetype: JiraIssueType;
    project: JiraProject;
    assignee?: JiraUser | null;
    reporter?: JiraUser;
    priority?: JiraPriority;
    status: JiraStatus;
    created: string;
    updated: string;
    resolved?: string | null;
    
    // Common custom fields (dynamic based on instance)
    [customFieldId: string]: any;
    
    // Service Desk specific fields
    // LandiQ specific custom fields
    customfield_10032?: {
      emailAddress?: string;
      displayName?: string;
    }[]; // Request participants
    customfield_10133?: {
      emailAddress?: string;
      displayName?: string;
    }[]; // Mailing List
    customfield_10171?: string; // Email
    customfield_10202?: string; // Company email address
    customfield_10172?: string; // Accounts Payable Contact Email
    customfield_10232?: string; // Customer Source
  };
  transitions?: any[];
  changelog?: {
    startAt: number;
    maxResults: number;
    total: number;
    histories: any[];
  };
}

export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  names?: { [key: string]: string };
  schema?: { [key: string]: any };
}

interface JiraConfig {
  baseUrl: string;
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class JiraService {
  private config: JiraConfig;
  private cache: SimpleCache;

  constructor() {
    this.config = {
      baseUrl: '/api/jira',
      cache: {
        enabled: true,
        ttl: 300 // 5 minutes
      }
    };
    this.cache = new SimpleCache();
  }

  /**
   * Make HTTP request to Jira API with error handling
   */
  private async makeRequest<T>(endpoint: string, useCache: boolean = true): Promise<JiraApiResponse<T>> {
    const cacheKey = `jira_${endpoint}`;
    
    // Check cache first
    if (useCache && this.config.cache.enabled) {
      const cachedData = this.cache.get<JiraApiResponse<T>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    const url = `${this.config.baseUrl}?endpoint=${encodeURIComponent(endpoint)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: JiraApiResponse<T> = await response.json();

      // Cache successful responses
      if (data.success && useCache && this.config.cache.enabled) {
        this.cache.set(cacheKey, data, this.config.cache.ttl);
      }

      return data;
    } catch (error) {
      console.error('Jira API request failed:', error);
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Test Jira connection
   */
  async testConnection(): Promise<JiraApiResponse<JiraUser>> {
    try {
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test-connection' })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<JiraApiResponse<JiraUser>> {
    return this.makeRequest<JiraUser>('/myself');
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(jql: string, options?: {
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
  }): Promise<JiraApiResponse<JiraSearchResponse>> {
    const params = new URLSearchParams({
      jql,
      startAt: (options?.startAt || 0).toString(),
      maxResults: (options?.maxResults || 50).toString(),
    });

    if (options?.fields) {
      params.append('fields', options.fields.join(','));
    }

    if (options?.expand) {
      params.append('expand', options.expand.join(','));
    }

    return this.makeRequest<JiraSearchResponse>(`/search?${params.toString()}`);
  }

  /**
   * Get helpdesk/service desk issues
   */
  async getHelpdeskIssues(projectKey?: string, maxResults: number = 50): Promise<JiraApiResponse<JiraSearchResponse>> {
    // For LandiQ, use their specific issue type
    let jql = projectKey ? `project = ${projectKey}` : 'project = LL1HD';
    jql += ' AND issuetype = "General request" ORDER BY created DESC';

    return this.searchIssues(jql, {
      maxResults,
      expand: ['names', 'schema'],
      fields: [
        'summary',
        'description', 
        'issuetype',
        'project',
        'assignee',
        'reporter',
        'priority',
        'status',
        'created',
        'updated',
        'resolved',
        // LandiQ specific email fields
        'customfield_10032', // Request participants
        'customfield_10133', // Mailing List
        'customfield_10171', // Email
        'customfield_10202', // Company email address
        'customfield_10172', // Accounts Payable Contact Email
        'customfield_10232', // Customer Source
      ]
    });
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<JiraApiResponse<JiraProject[]>> {
    return this.makeRequest<JiraProject[]>('/project');
  }

  /**
   * Get service desk projects
   */
  async getServiceDeskProjects(): Promise<JiraApiResponse<JiraProject[]>> {
    return this.makeRequest<JiraProject[]>('/project?typeKey=service_desk');
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string, expand?: string[]): Promise<JiraApiResponse<JiraIssue>> {
    let endpoint = `/issue/${issueKey}`;
    if (expand && expand.length > 0) {
      endpoint += `?expand=${expand.join(',')}`;
    }
    return this.makeRequest<JiraIssue>(endpoint);
  }

  /**
   * Get all fields (including custom fields)
   */
  async getFields(): Promise<JiraApiResponse<JiraCustomField[]>> {
    return this.makeRequest<JiraCustomField[]>('/field');
  }

  /**
   * Get issue types
   */
  async getIssueTypes(): Promise<JiraApiResponse<JiraIssueType[]>> {
    return this.makeRequest<JiraIssueType[]>('/issuetype');
  }

  /**
   * Get priorities
   */
  async getPriorities(): Promise<JiraApiResponse<JiraPriority[]>> {
    return this.makeRequest<JiraPriority[]>('/priority');
  }

  /**
   * Get statuses
   */
  async getStatuses(): Promise<JiraApiResponse<JiraStatus[]>> {
    return this.makeRequest<JiraStatus[]>('/status');
  }

  /**
   * Explore helpdesk data structure
   */
  async exploreHelpdeskStructure(): Promise<JiraApiResponse<{
    projects: any;
    sampleIssues: JiraSearchResponse;
    availableFields: JiraCustomField[];
  }>> {
    try {
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'explore-helpdesk' })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Failed to explore helpdesk structure'
      };
    }
  }

  /**
   * Extract user emails from issues
   */
  extractUserEmails(issues: JiraIssue[]): string[] {
    const emails = new Set<string>();

    issues.forEach(issue => {
      // Reporter email
      if (issue.fields.reporter?.emailAddress) {
        emails.add(issue.fields.reporter.emailAddress);
      }

      // Assignee email
      if (issue.fields.assignee?.emailAddress) {
        emails.add(issue.fields.assignee.emailAddress);
      }

      // Request participants (LandiQ: customfield_10032)
      if (issue.fields.customfield_10032) {
        issue.fields.customfield_10032.forEach((participant: any) => {
          if (participant.emailAddress) {
            emails.add(participant.emailAddress);
          }
        });
      }

      // Mailing List (LandiQ: customfield_10133)
      if (issue.fields.customfield_10133) {
        issue.fields.customfield_10133.forEach((participant: any) => {
          if (participant.emailAddress) {
            emails.add(participant.emailAddress);
          }
        });
      }

      // Direct email fields
      const emailFields = ['customfield_10171', 'customfield_10202', 'customfield_10172'];
      emailFields.forEach(fieldId => {
        const value = issue.fields[fieldId];
        if (value && typeof value === 'string' && value.includes('@')) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const matches = value.match(emailRegex);
          if (matches) {
            matches.forEach(email => emails.add(email));
          }
        }
      });

      // Check other custom fields that might contain email addresses
      Object.keys(issue.fields).forEach(key => {
        if (key.startsWith('customfield_')) {
          const value = issue.fields[key];
          if (typeof value === 'string' && value.includes('@')) {
            // Simple email validation
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = value.match(emailRegex);
            if (matches) {
              matches.forEach(email => emails.add(email));
            }
          }
        }
      });
    });

    return Array.from(emails);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const jiraService = new JiraService();