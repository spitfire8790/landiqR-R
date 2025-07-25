/**
 * Pipedrive API Service for Land iQ Integration
 * Provides comprehensive data fetching with caching, rate limiting, and error handling
 * Using British English terminology throughout
 */

import {
  PipedriveDeal,
  PipedrivePerson,
  PipedriveOrganisation,
  PipedriveActivity,
  PipedriveStage,
  PipedrivePipeline,
  PipedriveUser,
  PipedriveApiResponse,
  PipedriveError,
  PipedriveConfig,
  CustomFieldMappings,
  UserDistributionData,
  DealPipelineData,
  ActivityAnalyticsData,
  RevenueAnalysisData,
  LicenceManagementData,
  ChartDataPoint,
  TimeSeriesDataPoint,
  FilterOptions
} from './pipedrive-types';

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PipedriveCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlMinutes: number = 15): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // Convert to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Rate limiting
class RateLimiter {
  private requests: number[] = [];
  private requestsPerSecond: number;
  private requestsPerHour: number;

  constructor(requestsPerSecond: number = 10, requestsPerHour: number = 1000) {
    this.requestsPerSecond = requestsPerSecond;
    this.requestsPerHour = requestsPerHour;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 60 * 60 * 1000); // Last hour
    
    // Check hourly limit
    if (this.requests.length >= this.requestsPerHour) {
      const waitTime = 60 * 60 * 1000 - (now - this.requests[0]);
      throw new Error(`Hourly rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // Check per-second limit
    const recentRequests = this.requests.filter(time => now - time < 1000);
    if (recentRequests.length >= this.requestsPerSecond) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.requests.push(now);
  }
}

export class PipedriveService {
  private config: PipedriveConfig;
  private cache: PipedriveCache;
  private rateLimiter: RateLimiter;
  private customFieldMappings: CustomFieldMappings;

  constructor() {
    this.config = {
      apiKey: '', // Not needed on client side
      domain: 'landiq',
      baseUrl: '/api/pipedrive', // Use our API route
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerHour: 1000,
      },
      cache: {
        ttl: 15, // minutes
        maxSize: 100,
      },
    };

    this.cache = new PipedriveCache(this.config.cache.maxSize);
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerSecond,
      this.config.rateLimit.requestsPerHour
    );

    // Custom field mappings for Land iQ
    this.customFieldMappings = {
      deals: {
        source: '72eeb13403477994f5b87d9d436a2df1bbae0133',
        opportunityLeader: '1b304abbca7bb39b8293db9cf9c1018499892c8a',
        category: '7181253bf2d9ddfbd638a885fca2d2bc30956697',
        paymentDue: '445a7485337836c47de4a95f3fd627f0b5a08729',
        invoiceSent: 'bb3eed6ef002960b8112b08c116865683c46a444',
        paymentReceived: 'a111795c53afab3af6785e6ce8e7c9bf7a377136',
      },
      persons: {
        approver: '103bd60f36f4d09c7cd13fff090e2b064c1d4857',
        businessUnit: '3db57366fc3ea38a535490933f45c66848180cf9',
        customerType: '7faba81d32573b4aa224d4ffb56bb053587a1953',
      },
      organisations: {
        locationOfWork: '19465ebd302e779add2017dc03e9bbec7a7ca95c',
        organisationGroup: '6a4f9d0be7c32880786a35507efaacbd98f97bc0',
        network: '800fe076163b519223c56ada1759406a9e48d882',
        licencePool: '5717775ae0069cdb8b421f39e92cd305b73acf3f',
        issuedLicences: 'd85bee9a92da71af7b9f9103ac45a55df4be4f11',
      },
    };
  }

  /**
   * Make HTTP request to Pipedrive API with error handling and rate limiting
   */
  private async makeRequest<T>(endpoint: string, useCache: boolean = true): Promise<PipedriveApiResponse<T>> {
    const cacheKey = `pipedrive_${endpoint}`;
    
    // Check cache first
    if (useCache) {
      const cachedData = this.cache.get<PipedriveApiResponse<T>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Apply rate limiting
    await this.rateLimiter.waitIfNeeded();

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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PipedriveApiResponse<T> = await response.json();

      // Debug logging for unexpected response format
      if (data && typeof data === 'object') {
        if (!('success' in data)) {
          console.warn('Response missing success field:', { keys: Object.keys(data), data });
        }
        if (!('data' in data)) {
          console.warn('Response missing data field:', { keys: Object.keys(data), data });
        }
      }

      // Handle case where response doesn't have success field (direct Pipedrive API response)
      if (!('success' in data)) {
        // This might be a direct Pipedrive API response, let's adapt it
        const adaptedResponse: PipedriveApiResponse<T> = {
          success: true,
          data: (data as any).data || [],
          additional_data: (data as any).additional_data
        };
        
        // Cache successful responses
        if (useCache) {
          this.cache.set(cacheKey, adaptedResponse, this.config.cache.ttl);
        }
        
        return adaptedResponse;
      }

      if (!data.success) {
        const error = data as unknown as PipedriveError;
        throw new Error(`Pipedrive API Error: ${error.error} ${error.error_info || ''}`);
      }

      // Cache successful responses
      if (useCache) {
        this.cache.set(cacheKey, data, this.config.cache.ttl);
      }

      return data;
    } catch (error) {
      console.error(`Pipedrive API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/pipedrive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.connected;
    } catch (error) {
      console.error('Pipedrive connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch all deals with pagination support
   */
  async fetchDeals(limit: number = 500): Promise<PipedriveDeal[]> {
    try {
      const allDeals: PipedriveDeal[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore && allDeals.length < 10000) { // Safety limit
        const response = await this.makeRequest<PipedriveDeal>(`/deals?start=${start}&limit=${limit}`);
        
        // Check if response.data exists and is an array
        if (response.data && Array.isArray(response.data)) {
          allDeals.push(...response.data);
        } else {
          console.warn('Deals response data is not an array:', response);
          break;
        }

        hasMore = response.additional_data?.pagination?.more_items_in_collection || false;
        start = response.additional_data?.pagination?.next_start || start + limit;
      }

      return allDeals;
    } catch (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
  }

  /**
   * Fetch all persons with pagination support
   */
  async fetchPersons(limit: number = 500): Promise<PipedrivePerson[]> {
    try {
      const allPersons: PipedrivePerson[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore && allPersons.length < 10000) {
        const response = await this.makeRequest<PipedrivePerson>(`/persons?start=${start}&limit=${limit}`);
        
        // Check if response.data exists and is an array
        if (response.data && Array.isArray(response.data)) {
          allPersons.push(...response.data);
        } else {
          console.warn('Persons response data is not an array:', response);
          break;
        }

        hasMore = response.additional_data?.pagination?.more_items_in_collection || false;
        start = response.additional_data?.pagination?.next_start || start + limit;
      }

      return allPersons;
    } catch (error) {
      console.error('Error fetching persons:', error);
      return [];
    }
  }

  /**
   * Fetch all organisations with pagination support
   */
  async fetchOrganisations(limit: number = 500): Promise<PipedriveOrganisation[]> {
    try {
      const allOrganisations: PipedriveOrganisation[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore && allOrganisations.length < 10000) {
        const response = await this.makeRequest<PipedriveOrganisation>(`/organizations?start=${start}&limit=${limit}`);
        
        // Check if response.data exists and is an array
        if (response.data && Array.isArray(response.data)) {
          allOrganisations.push(...response.data);
        } else {
          console.warn('Organisations response data is not an array:', response);
          break;
        }

        hasMore = response.additional_data?.pagination?.more_items_in_collection || false;
        start = response.additional_data?.pagination?.next_start || start + limit;
      }

      return allOrganisations;
    } catch (error) {
      console.error('Error fetching organisations:', error);
      return [];
    }
  }

  /**
   * Fetch activities with pagination
   */
  async fetchActivities(limit: number = 500): Promise<PipedriveActivity[]> {
    try {
      const allActivities: PipedriveActivity[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore && allActivities.length < 10000) {
        const response = await this.makeRequest<PipedriveActivity>(`/activities?start=${start}&limit=${limit}`);
        
        // Check if response.data exists and is an array
        if (response.data && Array.isArray(response.data)) {
          allActivities.push(...response.data);
        } else {
          console.warn('Activities response data is not an array:', response);
          break;
        }

        hasMore = response.additional_data?.pagination?.more_items_in_collection || false;
        start = response.additional_data?.pagination?.next_start || start + limit;
      }

      return allActivities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Fetch pipeline stages
   */
  async fetchStages(): Promise<PipedriveStage[]> {
    try {
      const response = await this.makeRequest<PipedriveStage>('/stages');
      return response.data;
    } catch (error) {
      console.error('Error fetching stages:', error);
      return [];
    }
  }

  /**
   * Fetch pipelines
   */
  async fetchPipelines(): Promise<PipedrivePipeline[]> {
    try {
      const response = await this.makeRequest<PipedrivePipeline>('/pipelines');
      return response.data;
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return [];
    }
  }

  /**
   * Fetch users
   */
  async fetchUsers(): Promise<PipedriveUser[]> {
    try {
      const response = await this.makeRequest<PipedriveUser>('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get user distribution analytics data
   */
  async getUserDistributionData(filters?: FilterOptions): Promise<UserDistributionData> {
    try {
      // Fetch persons, organisations and the person field definitions in parallel
      const [persons, organisations, personFields] = await Promise.all([
        this.fetchPersons(),
        this.fetchOrganisations(),
        this.fetchPersonFields(),
      ]);

      // Helper to convert raw field value -> label
      const toCustomerTypeLabel = (raw: any): string =>
        this.mapCustomFieldValue(
          this.customFieldMappings.persons.customerType,
          raw,
          personFields
        ) || "Unknown";

      // Helper function to check if customer type should be excluded from analytics
      const shouldExcludeCustomerType = (customerType: string | undefined): boolean => {
        if (!customerType) return false;
        const excludedTypes = ["Giraffe/WSP", "Land iQ Project Team"];
        return excludedTypes.includes(customerType);
      };

      // Helper function to check if organization should be excluded from analytics
      const shouldExcludeOrganization = (organizationName: string | undefined): boolean => {
        if (!organizationName) return false;
        return organizationName.toLowerCase().includes("wsp");
      };

      // Helper function to check if specific email addresses should be excluded from analytics
      const shouldExcludeEmail = (email: string | undefined): boolean => {
        if (!email) return false;
        const excludedEmails = [
          "justin.mcfeeter@dpie.nsw.gov.au",
          "naishadh.dave@dpie.nsw.gov.au"
        ];
        return excludedEmails.includes(email.toLowerCase());
      };

      // Filter data based on provided filters (which use **labels**)
      // Also exclude internal customer types and WSP organizations
      let filteredPersons = persons.filter((person) => {
        const customerTypeLabel = toCustomerTypeLabel(
          person[this.customFieldMappings.persons.customerType]
        );
        
        // Exclude internal team members
        if (shouldExcludeCustomerType(customerTypeLabel)) {
          return false;
        }

        // Find person's organization and exclude WSP organizations
        const org = organisations.find((o) => o.id === person.org_id);
        if (shouldExcludeOrganization(org?.name)) {
          return false;
        }

        // Exclude specific email addresses
        if (shouldExcludeEmail(person.email)) {
          return false;
        }

        // Apply additional filters if provided
        if (filters) {
          if (
            filters.customerTypes.length > 0 &&
            customerTypeLabel &&
            !filters.customerTypes.includes(customerTypeLabel)
          ) {
            return false;
          }
        }
        return true;
      });

      // Group users by organisation and customer type using labels
      const orgUserCounts = new Map<string, number>();
      const customerTypeCounts = new Map<string, number>();

      filteredPersons.forEach((person) => {
        const org = organisations.find((o) => o.id === person.org_id);
        const orgName = org?.name || "Unknown Organisation";
        
        // Skip if this is a WSP organization (double-check)
        if (!shouldExcludeOrganization(orgName)) {
          orgUserCounts.set(orgName, (orgUserCounts.get(orgName) || 0) + 1);
        }

        const customerTypeLabel = toCustomerTypeLabel(
          person[this.customFieldMappings.persons.customerType]
        );
        customerTypeCounts.set(
          customerTypeLabel,
          (customerTypeCounts.get(customerTypeLabel) || 0) + 1
        );
      });

      const usersByOrganisation: ChartDataPoint[] = Array.from(
        orgUserCounts.entries()
      )
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

      const customerTypeBreakdown: ChartDataPoint[] = Array.from(
        customerTypeCounts.entries()
      ).map(([label, value]) => ({ label, value }));

      // Licence utilisation data (unchanged)
      const licenceUtilisation: ChartDataPoint[] = organisations
        .filter((org) => org[this.customFieldMappings.organisations.issuedLicences])
        .map((org) => ({
          label: org.name,
          value: org[
            this.customFieldMappings.organisations.issuedLicences
          ] as number,
          metadata: {
            licencePool: org[
              this.customFieldMappings.organisations.licencePool
            ],
          },
        }));

      return {
        usersByOrganisation,
        customerTypeBreakdown,
        licenceUtilisation,
      };
    } catch (error) {
      console.error("Error generating user distribution data:", error);
      return {
        usersByOrganisation: [],
        customerTypeBreakdown: [],
        licenceUtilisation: [],
      };
    }
  }

  /**
   * Get deal pipeline analytics data
   */
  async getDealPipelineData(): Promise<DealPipelineData> {
    try {
      const [deals, stages] = await Promise.all([
        this.fetchDeals(),
        this.fetchStages(),
      ]);

      const totalDeals = deals.length;
      const totalValue = deals.reduce((sum, deal) => sum + (deal.weighted_value || 0), 0);
      const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

      // Stage conversion analysis
      const pipelineStages: ChartDataPoint[] = stages.map(stage => {
        const dealsInStage = deals.filter(deal => deal.stage_id === stage.id);
        const stageValue = dealsInStage.reduce((sum, deal) => sum + (deal.weighted_value || 0), 0);
        return {
          label: stage.name,
          value: dealsInStage.length,
          metadata: {
            totalValue: stageValue,
            probability: stage.deal_probability,
          },
        };
      });

      // Payment workflow analysis - simplified structure
      const paymentWorkflow = deals
        .filter(deal => deal[this.customFieldMappings.deals.paymentDue])
        .slice(0, 50) // Limit for performance
        .map(deal => ({
          dealId: deal.id,
          dealTitle: deal.title,
          expectedClose: deal.expected_close_date || '',
          paymentDue: deal[this.customFieldMappings.deals.paymentDue] as string || '',
          value: deal.weighted_value || 0,
          status: deal.status,
        }));

      // Source analysis
      const sourceCounts = new Map<string, number>();
      deals.forEach(deal => {
        const source = deal[this.customFieldMappings.deals.source] || 'Unknown';
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

      const sourceAnalysis: ChartDataPoint[] = Array.from(sourceCounts.entries())
        .map(([label, value]) => ({ label, value }));

      // Category performance
      const categoryCounts = new Map<string, number>();
      deals.forEach(deal => {
        const category = deal[this.customFieldMappings.deals.category] || 'Unknown';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });

      const categoryPerformance: ChartDataPoint[] = Array.from(categoryCounts.entries())
        .map(([label, value]) => ({ label, value }));

      // Calculate overall conversion rate
      const wonDeals = deals.filter(deal => deal.status === 'won').length;
      const overallConversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

      return {
        pipelineStages,
        paymentWorkflow,
        sourceAnalysis,
        categoryPerformance,
        totalDeals,
        totalValue,
        avgDealSize,
        overallConversionRate,
      };
    } catch (error) {
      console.error('Error generating deal pipeline data:', error);
      return {
        pipelineStages: [],
        paymentWorkflow: [],
        sourceAnalysis: [],
        categoryPerformance: [],
        totalDeals: 0,
        totalValue: 0,
        avgDealSize: 0,
        overallConversionRate: 0,
      };
    }
  }

  /**
   * Get activity analytics data
   */
  async getActivityAnalyticsData(): Promise<ActivityAnalyticsData> {
    try {
      const activities = await this.fetchActivities();

      const totalActivities = activities.length;
      const completedActivities = activities.filter(activity => 
        activity.done === 'yes' || activity.done === '1' || (activity.done as any) === true
      );
      const completionRate = totalActivities > 0 ? (completedActivities.length / totalActivities) * 100 : 0;

      // Calculate average response time (simplified)
      const avgResponseTime = activities
        .filter(activity => activity.add_time && activity.due_date)
        .reduce((sum, activity, _, arr) => {
          const addTime = new Date(activity.add_time).getTime();
          const dueTime = new Date(activity.due_date).getTime();
          return sum + Math.max(0, (dueTime - addTime) / (1000 * 60 * 60)); // hours
        }, 0) / Math.max(1, activities.filter(activity => activity.add_time && activity.due_date).length);

      // Activity volume data
      const dailyCounts = new Map<string, number>();
      activities.forEach(activity => {
        const date = activity.add_time.split(' ')[0]; // Extract date part
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      });

      const activityVolume: ChartDataPoint[] = Array.from(dailyCounts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // Activity type distribution
      const typeCounts = new Map<string, number>();
      activities.forEach(activity => {
        const type = activity.type || 'Other';
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      });

      const typeDistribution: ChartDataPoint[] = Array.from(typeCounts.entries())
        .map(([label, value]) => ({ label, value }));

      // User performance (activities per user)
      const userCounts = new Map<number, number>();
      activities.forEach(activity => {
        userCounts.set(activity.user_id, (userCounts.get(activity.user_id) || 0) + 1);
      });

      const userPerformance: ChartDataPoint[] = Array.from(userCounts.entries())
        .map(([userId, value]) => ({
          label: `User ${userId}`,
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 users

      // Trends data (last 30 days)
      const trends: TimeSeriesDataPoint[] = Array.from(dailyCounts.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      return {
        activityVolume,
        typeDistribution,
        userPerformance,
        trends,
        totalActivities,
        completionRate,
        avgResponseTime,
      };
    } catch (error) {
      console.error('Error generating activity analytics data:', error);
      return {
        activityVolume: [],
        typeDistribution: [],
        userPerformance: [],
        trends: [],
        totalActivities: 0,
        completionRate: 0,
        avgResponseTime: 0,
      };
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Fetch custom field definitions for persons
   */
  async fetchPersonFields(): Promise<any[]> {
    const response = await this.makeRequest('/personFields', true);
    return response.data || [];
  }

  /**
   * Fetch custom field definitions for organizations
   */
  async fetchOrganizationFields(): Promise<any[]> {
    const response = await this.makeRequest('/organizationFields', true);
    return response.data || [];
  }

  /**
   * Fetch custom field definitions for deals
   */
  async fetchDealFields(): Promise<any[]> {
    const response = await this.makeRequest('/dealFields', true);
    return response.data || [];
  }

  /**
   * Fetch custom field definitions for activities
   */
  async fetchActivityFields(): Promise<any[]> {
    const response = await this.makeRequest('/activityFields', true);
    return response.data || [];
  }

  /**
   * Get all custom fields with their definitions and options
   */
  async getAllCustomFields(): Promise<{
    personFields: any[];
    organizationFields: any[];
    dealFields: any[];
    activityFields: any[];
  }> {
    const [personFields, organizationFields, dealFields, activityFields] = await Promise.all([
      this.fetchPersonFields(),
      this.fetchOrganizationFields(), 
      this.fetchDealFields(),
      this.fetchActivityFields()
    ]);

    return {
      personFields,
      organizationFields,
      dealFields,
      activityFields
    };
  }

  /**
   * Map custom field values to human-readable labels
   */
  mapCustomFieldValue(fieldKey: string, value: any, fieldDefinitions: any[]): string {
    if (!value) return 'Not Set';
    
    const field = fieldDefinitions.find(f => f.key === fieldKey);
    if (!field) return String(value);
    
    // Handle enum/set fields with options
    if (field.options && Array.isArray(field.options)) {
      // For multiple values (set type)
      if (Array.isArray(value)) {
        const labels = value.map(v => {
          const option = field.options.find((opt: any) => opt.id === v);
          return option ? option.label : v;
        });
        return labels.join(', ');
      }
      
      // For single value (enum type)
      const option = field.options.find((opt: any) => opt.id === value);
      return option ? option.label : String(value);
    }
    
    return String(value);
  }

  /**
   * Extract custom field data for visualization
   */
  extractCustomFieldData(records: any[], fieldKey: string, fieldDefinitions: any[]): {
    field: any;
    values: Array<{ label: string; value: any; count: number }>;
  } {
    const field = fieldDefinitions.find(f => f.key === fieldKey);
    if (!field) {
      throw new Error(`Custom field ${fieldKey} not found`);
    }

    // Count occurrences of each value
    const valueCounts = new Map<string, { originalValue: any; count: number }>();
    
    records.forEach((record: any) => {
      const value = record[fieldKey];
      const label = this.mapCustomFieldValue(fieldKey, value, fieldDefinitions);
      
      if (valueCounts.has(label)) {
        valueCounts.get(label)!.count++;
      } else {
        valueCounts.set(label, { originalValue: value, count: 1 });
      }
    });

    // Convert to array and sort by count
    const values = Array.from(valueCounts.entries())
      .map(([label, data]) => ({
        label,
        value: data.originalValue,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count);

    return { field, values };
  }

  /**
   * Get custom field mappings
   */
  getCustomFieldMappings(): CustomFieldMappings {
    return this.customFieldMappings;
  }
}

// Export singleton instance
export const pipedriveService = new PipedriveService(); 