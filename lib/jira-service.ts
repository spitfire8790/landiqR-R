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

// Support Analytics Types
export interface SupportAnalyticsData {
  organisation: string;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgResolutionTimeHours: number;
  topIssueTypes: string[];
  supportHealth: 'low' | 'medium' | 'high';
  userEmails: string[];
  recentTickets: RecentTicket[];
}

export interface RecentTicket {
  key: string;
  summary: string;
  created: string;
  status: string;
  priority: string;
}

interface SupportMetrics {
  organisation: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTimeHours: number;
  resolutionTimes: number[];
  ticketsByType: Map<string, number>;
  ticketsByStatus: Map<string, number>;
  emails: Set<string>;
  recentTickets: RecentTicket[];
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
   * Get support analytics data for organizations
   * @param days Number of days to look back (default: 90)
   * @param pipedriveData Optional Pipedrive data for organisation mapping
   * @returns Promise<SupportAnalyticsData[]>
   */
  async getSupportAnalytics(
    days: number = 90, 
    pipedriveData?: { persons: any[]; organisations: any[] }
  ): Promise<SupportAnalyticsData[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const jqlDate = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const jql = `project = LL1HD AND issuetype = "General request" AND created >= "${jqlDate}" ORDER BY created DESC`;
      
      const fields = [
        'created',
        'updated', 
        'status',
        'priority',
        'resolution',
        'resolutiondate',
        'summary',
        'reporter',
        'customfield_10032', // Request participants  
        'customfield_10133', // Email field
        'customfield_10171', // Organisation
        'customfield_10202', // Reporter email
        'customfield_10172', // Request type
        'customfield_10232'  // Custom email
      ];

      const response = await this.searchIssues(jql, {
        maxResults: 1000,
        fields: fields
      });

      console.log('🔍 Jira API Response:', {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : null,
        success: response?.success,
        hasData: response && !!response.data,
        hasIssues: response?.data && !!response.data.issues,
        issuesLength: response?.data?.issues?.length || 0,
        jqlUsed: jql
      });

      // Check if response has the expected structure
      if (!response || !response.success || !response.data || !response.data.issues) {
        console.error('❌ Invalid Jira API response structure:', {
          hasResponse: !!response,
          success: response?.success,
          hasData: !!response?.data,
          error: response?.error
        });
        return [];
      }

      // Create email-to-organisation mapping from Pipedrive data
      const emailToOrgMap = new Map<string, string>();
      
      if (pipedriveData) {
        // Build email to organisation mapping directly from persons data
        pipedriveData.persons.forEach((person: any) => {
          // Get email from primary_email field (this is the main email as a string)
          const emailValue = person.primary_email;
          
          // Get organisation name directly from org_name field
          const orgName = person.org_name;
          
          if (emailValue && orgName && typeof emailValue === 'string' && typeof orgName === 'string') {
            emailToOrgMap.set(emailValue.toLowerCase(), orgName);
          }
        });
        
        console.log(`📧 Created email-to-org mapping: ${emailToOrgMap.size} entries`);
        
        // Debug: Log a sample person structure to understand the data format
        if (pipedriveData.persons.length > 0) {
          console.log('📋 Sample Pipedrive person structure:', {
            keys: Object.keys(pipedriveData.persons[0]),
            email: pipedriveData.persons[0].email,
            emailType: typeof pipedriveData.persons[0].email,
            org_id: pipedriveData.persons[0].org_id,
            orgIdType: typeof pipedriveData.persons[0].org_id
          });
        }
      }

      const analyticsMap = new Map<string, SupportMetrics>();

      response.data.issues.forEach(issue => {
        // Extract emails
        const emails = this.extractEmailsFromIssue([issue]);
        
        // Extract organisation using Pipedrive mapping
        let organisation = 'Unknown Organisation';
        
        // First try to find organisation from email mapping
        if (emails.length > 0 && pipedriveData) {
          for (const email of emails) {
            const orgName = emailToOrgMap.get(email.toLowerCase());
            if (orgName) {
              organisation = orgName;
              break;
            }
          }
        }
        
        // Fallback to Jira custom field if no Pipedrive match
        if (organisation === 'Unknown Organisation' && issue.fields.customfield_10171) {
          organisation = issue.fields.customfield_10171;
        }
        
        // Last resort: extract from email domain
        if (organisation === 'Unknown Organisation' && emails.length > 0) {
          const email = emails[0];
          const domain = email.split('@')[1];
          if (domain) {
            organisation = domain.replace(/\.(com|org|net|gov|edu)$/, '').replace(/\./g, ' ');
            organisation = organisation.charAt(0).toUpperCase() + organisation.slice(1);
          }
        }

        if (!analyticsMap.has(organisation)) {
          analyticsMap.set(organisation, {
            organisation,
            totalTickets: 0,
            resolvedTickets: 0,
            avgResolutionTimeHours: 0,
            resolutionTimes: [],
            ticketsByType: new Map(),
            ticketsByStatus: new Map(),
            emails: new Set(),
            recentTickets: []
          });
        }

        const metrics = analyticsMap.get(organisation)!;
        metrics.totalTickets++;
        
        // Add emails to the set
        emails.forEach(email => metrics.emails.add(email));

        // Track ticket status
        const status = issue.fields.status?.name || 'Unknown';
        metrics.ticketsByStatus.set(status, (metrics.ticketsByStatus.get(status) || 0) + 1);

        // Track ticket type
        const requestType = issue.fields.customfield_10172 || 'General';
        metrics.ticketsByType.set(requestType, (metrics.ticketsByType.get(requestType) || 0) + 1);

        // Calculate resolution time if resolved
        if (issue.fields.resolutiondate && issue.fields.created) {
          metrics.resolvedTickets++;
          const created = new Date(issue.fields.created);
          const resolved = new Date(issue.fields.resolutiondate);
          const resolutionHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          metrics.resolutionTimes.push(resolutionHours);
        }

        // Store recent ticket info
        metrics.recentTickets.push({
          key: issue.key,
          summary: issue.fields.summary,
          created: issue.fields.created,
          status: status,
          priority: issue.fields.priority?.name || 'Unknown'
        });
      });

      // Convert to final format and calculate averages
      const result: SupportAnalyticsData[] = Array.from(analyticsMap.values()).map(metrics => {
        const avgResolutionTimeHours = metrics.resolutionTimes.length > 0 
          ? metrics.resolutionTimes.reduce((a, b) => a + b, 0) / metrics.resolutionTimes.length
          : 0;

        const resolutionRate = metrics.totalTickets > 0 
          ? (metrics.resolvedTickets / metrics.totalTickets) * 100 
          : 0;

        // Get top 3 issue types
        const topIssueTypes = Array.from(metrics.ticketsByType.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => `${type} (${count})`);

        // Calculate support health based on resolution rate and volume
        let supportHealth: 'low' | 'medium' | 'high' = 'medium';
        if (resolutionRate > 80 && metrics.totalTickets < 10) {
          supportHealth = 'low';
        } else if (resolutionRate < 50 || metrics.totalTickets > 20) {
          supportHealth = 'high';
        }

        return {
          organisation: metrics.organisation,
          totalTickets: metrics.totalTickets,
          resolvedTickets: metrics.resolvedTickets,
          resolutionRate,
          avgResolutionTimeHours,
          topIssueTypes,
          supportHealth,
          userEmails: Array.from(metrics.emails),
          recentTickets: metrics.recentTickets.slice(0, 5) // Keep latest 5
        };
      });

      return result.sort((a, b) => b.totalTickets - a.totalTickets);

    } catch (error) {
      console.error('Error fetching support analytics:', error);
      return [];
    }
  }

  /**
   * Helper to extract emails from a single issue
   */
  private extractEmailsFromIssue(issues: JiraIssue[]): string[] {
    return this.extractUserEmails(issues);
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