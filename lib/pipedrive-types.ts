/**
 * Pipedrive API Type Definitions for Land iQ Integration
 * Using British English terminology throughout
 */

// Core Deal interface based on discovered fields
export interface PipedriveDeal {
  // Required core fields
  id: number;                           // ID
  title: string;                        // Title
  creator_user_id: number;              // Creator
  user_id: number;                      // Owner
  weighted_value: number;               // Weighted value
  weighted_value_currency: string;      // Currency of weighted value
  pipeline: number;                     // Pipeline
  stage_id: number;                     // Stage
  status: string;                       // Status
  add_time: string;                     // Deal created
  update_time: string;                  // Update time
  stage_change_time: string;            // Last stage change
  next_activity_date: string;           // Next activity date
  last_activity_date: string;           // Last activity date
  won_time: string;                     // Won time
  lost_time: string;                    // Lost time
  close_time: string;                   // Deal closed on
  lost_reason: string;                  // Lost reason
  visible_to: string;                   // Visible to
  activities_count: number;             // Total activities
  done_activities_count: number;        // Done activities
  undone_activities_count: number;      // Activities to do
  email_messages_count: number;         // Email messages count
  
  // Optional/nullable fields
  person_id?: number;                   // Contact person
  org_id?: number;                      // Organisation
  expected_close_date?: string;         // Expected close date
  value?: number;                       // Value
  currency?: string;                    // Currency
  probability?: number;                 // Probability
  label?: string[];                     // Label
  
  // Custom fields (Land iQ specific)
  "72eeb13403477994f5b87d9d436a2df1bbae0133"?: string; // Source
  "1b304abbca7bb39b8293db9cf9c1018499892c8a"?: number; // Opportunity Leader
  "7181253bf2d9ddfbd638a885fca2d2bc30956697"?: string; // Category
  "445a7485337836c47de4a95f3fd627f0b5a08729"?: string; // Payment Due
  "bb3eed6ef002960b8112b08c116865683c46a444"?: string; // Invoice Sent
  "a111795c53afab3af6785e6ce8e7c9bf7a377136"?: string; // Payment Received
  
  // Allow dynamic custom field access
  [key: string]: any;
}

// Person/Contact interface
export interface PipedrivePerson {
  // Required core fields
  id: number;                           // ID
  name: string;                         // Name
  add_time: string;                     // Person created
  update_time: string;                  // Update time
  owner_id: number;                     // Owner
  open_deals_count: number;             // Open deals
  visible_to: string;                   // Visible to
  
  // Optional contact details
  org_id?: number;                      // Organisation
  email?: string;                       // Email
  phone?: string;                       // Phone
  first_name?: string;                  // First name
  last_name?: string;                   // Last name
  job_title?: string;                   // Job title
  notes?: string;                       // Notes
  
  // Activity metrics
  next_activity_date?: string;          // Next activity date
  last_activity_date?: string;          // Last activity date
  won_deals_count: number;              // Won deals
  lost_deals_count: number;             // Lost deals
  closed_deals_count: number;           // Closed deals
  activities_count: number;             // Total activities
  done_activities_count: number;        // Done activities
  undone_activities_count: number;      // Activities to do
  
  // Custom fields (Land iQ specific)
  "103bd60f36f4d09c7cd13fff090e2b064c1d4857"?: number; // Approver
  "3db57366fc3ea38a535490933f45c66848180cf9"?: string; // Business Unit
  "7faba81d32573b4aa224d4ffb56bb053587a1953"?: string; // Customer Type
  
  // Allow dynamic custom field access
  [key: string]: any;
}

// Organisation interface (British spelling)
export interface PipedriveOrganisation {
  // Required core fields
  id: number;                           // ID
  name: string;                         // Name
  owner_id: number;                     // Owner
  people_count: number;                 // People
  open_deals_count: number;             // Open deals
  add_time: string;                     // Organisation created
  update_time: string;                  // Update time
  
  // Optional fields
  label?: string;                       // Label
  address?: string;                     // Address
  address_locality?: string;            // City/town/village/locality
  address_country?: string;             // Country
  
  // Metrics
  won_deals_count: number;              // Won deals
  lost_deals_count: number;             // Lost deals
  closed_deals_count: number;           // Closed deals
  activities_count: number;             // Total activities
  
  // Custom fields (Land iQ specific)
  "19465ebd302e779add2017dc03e9bbec7a7ca95c"?: string[]; // Location of Work
  "6a4f9d0be7c32880786a35507efaacbd98f97bc0"?: string;   // Organisation Group
  "800fe076163b519223c56ada1759406a9e48d882"?: string;   // Network
  "5717775ae0069cdb8b421f39e92cd305b73acf3f"?: string;   // Licence Pool
  "d85bee9a92da71af7b9f9103ac45a55df4be4f11"?: number;   // Issued Licences
  
  // Allow dynamic custom field access
  [key: string]: any;
}

// Activity interface
export interface PipedriveActivity {
  // Required core fields
  id: number;                           // ID
  subject: string;                      // Subject
  type: string;                         // Type
  done: string;                         // Done
  due_date: string;                     // Due date
  note: string;                         // Note
  add_time: string;                     // Add time
  user_id: number;                      // Assigned to user
  created_by_user_id: number;           // Creator
  update_time: string;                  // Update time
  priority: string;                     // Priority
  
  // Optional associations
  org_id?: number;                      // Organisation
  person_id?: number;                   // Contact person
  deal_id?: number;                     // Deal
  
  // Optional details
  due_time?: string;                    // Due time
  duration?: string;                    // Duration
  location?: string;                    // Location
  public_description?: string;          // Public description
  busy_flag?: string;                   // Free/busy
}

// Pipeline stage interface
export interface PipedriveStage {
  id: number;
  name: string;
  pipeline_id: number;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number;
  add_time: string;
  update_time: string;
}

// Pipeline interface
export interface PipedrivePipeline {
  id: number;
  name: string;
  url_title: string;
  order_nr: number;
  active: boolean;
  deal_probability: number;
  add_time: string;
  update_time: string;
}

// User interface
export interface PipedriveUser {
  id: number;
  name: string;
  email: string;
  activated: boolean;
  created: string;
  modified: string;
  signup_flow_variation: string;
  has_created_company: boolean;
  is_admin: number;
  active_flag: boolean;
  timezone_name: string;
  timezone_offset: string;
  role_id: number;
}

// API Response interfaces
export interface PipedriveApiResponse<T> {
  success: boolean;
  data: T[];
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
  };
}

// Custom field mappings for Land iQ
export interface CustomFieldMappings {
  deals: {
    source: string;
    opportunityLeader: string;
    category: string;
    paymentDue: string;
    invoiceSent: string;
    paymentReceived: string;
  };
  persons: {
    approver: string;
    businessUnit: string;
    customerType: string;
  };
  organisations: {
    locationOfWork: string;
    organisationGroup: string;
    network: string;
    licencePool: string;
    issuedLicences: string;
  };
}

// Reference: Available values for Pipedrive custom fields (extracted from live data)
// Note: These mappings allow conversion between Pipedrive's internal IDs and human-readable labels
export interface PipedriveCustomFieldValues {
  persons: {
    /**
     * Customer Type field mappings (field key: customerType)
     * Maps Pipedrive option IDs to human-readable labels (zero-indexed)
     */
    customerType: {
      labels: [
        '2 Week Trial Licence',
        'Access Revoked', 
        'Admin',
        'Centrally Funded Licence',
        'Contact Register',
        'Extended Trial Licence',
        'Giraffe/WSP',
        'Land iQ Project Team',
        'Paid Subscription',
        'Potential User'
      ];
      mappings: {
        "0": "2 Week Trial Licence",
        "1": "Access Revoked",
        "2": "Admin",
        "3": "Centrally Funded Licence",
        "4": "Contact Register",
        "5": "Extended Trial Licence",
        "6": "Giraffe/WSP",
        "7": "Land iQ Project Team",
        "8": "Paid Subscription",
        "9": "Potential User"
      };
    };
  };
  organisations: {
    /**
     * Network field mappings (field key: network)
     * Government departments, private sector, and other organizational networks (zero-indexed)
     */
    network: {
      labels: [
        'Climate Change, Energy, the Environment and Water',
        'Communities & Justice',
        'Customer Service',
        'Education',
        'External Government',
        'Health',
        'Jobs & Tourism',
        'LALC',
        'Land iQ Supplier',
        'N/A',
        'NSW Local Government',
        'Planning',
        'Private Sector',
        'Regional NSW',
        'Transport',
        'Treasury',
        'Universities'
      ];
      mappings: {
        "0": "Climate Change, Energy, the Environment and Water",
        "1": "Communities & Justice",
        "2": "Customer Service",
        "3": "Education",
        "4": "External Government",
        "5": "Health",
        "6": "Jobs & Tourism",
        "7": "LALC",
        "8": "Land iQ Supplier",
        "9": "N/A",
        "10": "NSW Local Government",
        "11": "Planning",
        "12": "Private Sector",
        "13": "Regional NSW",
        "14": "Transport",
        "15": "Treasury",
        "16": "Universities"
      };
    };
    /**
     * Licence Pool field mappings (field key: licencePool)
     * Categories for different licensing arrangements (zero-indexed)
     */
    licencePool: {
      labels: [
        'LGNSW',
        'Local Aboriginal Land Councils',
        'N/A',
        'NSW Government',
        'Universities'
      ];
      mappings: {
        "0": "LGNSW",
        "1": "Local Aboriginal Land Councils",
        "2": "N/A",
        "3": "NSW Government",
        "4": "Universities"
      };
    };
  };
}

/**
 * Runtime mappings interface for actual Pipedrive ID to label conversion
 * This should be populated when field definitions are fetched from Pipedrive API
 */
export interface PipedriveCustomFieldMappings {
  persons: {
    customerType: Record<string, string>; // { "id": "label" }
  };
  organisations: {
    network: Record<string, string>;
    licencePool: Record<string, string>;
  };
}

// Chart data interfaces for visualisations
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
}

export interface FilterOptions {
  customerTypes: string[];
  licencePools: string[];
  organisationGroups: string[];
  networks: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Analytics interfaces
export interface UserDistributionData {
  usersByOrganisation: ChartDataPoint[];
  customerTypeBreakdown: ChartDataPoint[];
  licenceUtilisation: ChartDataPoint[];
}

export interface DealPipelineData {
  pipelineStages: ChartDataPoint[];
  paymentWorkflow: Array<{
    dealId: number;
    dealTitle: string;
    expectedClose: string;
    paymentDue: string;
    value: number;
    status: string;
  }>;
  sourceAnalysis: ChartDataPoint[];
  categoryPerformance: ChartDataPoint[];
  totalDeals: number;
  totalValue: number;
  avgDealSize: number;
  overallConversionRate: number;
}

export interface ActivityAnalyticsData {
  activityVolume: ChartDataPoint[];
  typeDistribution: ChartDataPoint[];
  userPerformance: ChartDataPoint[];
  trends: TimeSeriesDataPoint[];
  totalActivities: number;
  completionRate: number;
  avgResponseTime: number;
}

export interface RevenueAnalysisData {
  timeline: TimeSeriesDataPoint[];
  byOrganisationGroup: ChartDataPoint[];
  valueDistribution: ChartDataPoint[];
  paymentCycle: Array<{
    organisation: string;
    averageDays: number;
    customerType: string;
  }>;
}

export interface LicenceManagementData {
  poolUtilisation: Array<{
    pool: string;
    used: number;
    capacity: number;
    utilisation: number;
  }>;
  organisationMatrix: Array<{
    organisation: string;
    licenceTypes: Record<string, number>;
  }>;
  trialConversion: ChartDataPoint[];
  trends: TimeSeriesDataPoint[];
}

// Error handling
export interface PipedriveError {
  error: string;
  error_info?: string;
  data?: any;
}

// Service configuration
export interface PipedriveConfig {
  apiKey: string;
  domain: string;
  baseUrl: string;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };
  cache: {
    ttl: number; // Time to live in minutes
    maxSize: number;
  };
} 