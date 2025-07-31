import { createClient } from "@supabase/supabase-js";

// Create a separate Supabase client for analytics events
const analyticsSupabaseUrl = process.env.NEXT_PUBLIC_ANALYTICS_SUPABASE_URL;
const analyticsSupabaseKey = process.env.NEXT_PUBLIC_ANALYTICS_SUPABASE_ANON_KEY;

if (!analyticsSupabaseUrl) {
  console.warn("Missing NEXT_PUBLIC_ANALYTICS_SUPABASE_URL - analytics events will not be available");
}

if (!analyticsSupabaseKey) {
  console.warn("Missing NEXT_PUBLIC_ANALYTICS_SUPABASE_ANON_KEY - analytics events will not be available");
}

// Create analytics client only if both URL and key are available
export const analyticsSupabase = analyticsSupabaseUrl && analyticsSupabaseKey 
  ? createClient(analyticsSupabaseUrl, analyticsSupabaseKey, {
      auth: {
        persistSession: false, // No auth needed for analytics data
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));
        },
      },
    })
  : null;

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_name: string;
  user_email: string;
  user_id: string | null;
  properties: string; // JSON string
  created_at: string;
  session_id: string;
  session_event_number: number | null;
  session_duration_ms: number | null;
  user_agent: string | null;
  screen_resolution: string | null;
  viewport_size: string | null;
  timezone: string | null;
  page_url: string | null;
  page_title: string | null;
  referrer: string | null;
  page_load_time_ms: number | null;
  timestamp_precise: number | null;
}

export interface DailyAnalyticsEvents {
  date: string; // yyyy-mm-dd
  count: number;
  uniqueUsers: number;
}

/**
 * Fetch analytics events from the analytics_events table
 * @param daysBack Number of days to look back from today
 * @returns Array of analytics events
 */
export async function fetchAnalyticsEvents(daysBack: number = 90): Promise<AnalyticsEvent[]> {
  try {
    // Check if analytics Supabase client is available
    if (!analyticsSupabase) {
      console.warn('Analytics Supabase client not configured - skipping analytics events');
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    cutoffDate.setHours(0, 0, 0, 0);

    console.log(`🔍 Fetching analytics events from ${cutoffDate.toISOString()}`);
    console.log(`🚫 Excluding events from: james.strutt@dpie.nsw.gov.au`);

    // Fetch all data using pagination to overcome 1000 row limit
    let allData: AnalyticsEvent[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 Fetching page ${Math.floor(from / pageSize) + 1} (rows ${from} to ${from + pageSize - 1})`);
      
      const { data, error, count } = await analyticsSupabase
        .from('analytics_events')
        .select('id, event_type, event_name, user_email, user_id, properties, created_at, session_id', { count: 'exact' })
        .gte('created_at', cutoffDate.toISOString())
        .neq('user_email', 'james.strutt@dpie.nsw.gov.au')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching analytics events page:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData = allData.concat(data);
      from += pageSize;
      
      // Check if we've fetched all available data
      if (data.length < pageSize) {
        hasMore = false;
      }

      // Log progress
      if (count !== null) {
        console.log(`📊 Fetched ${allData.length} of ~${count} total events`);
      }
    }

    console.log(`✅ Completed fetching ${allData.length} analytics events total`);
    return allData;
  } catch (error) {
    console.error('Error in fetchAnalyticsEvents:', error);
    return [];
  }
}

/**
 * Process analytics events into daily aggregated counts
 * @param events Array of analytics events
 * @returns Array of daily counts with unique user tracking
 */
export function processAnalyticsEventsByDay(events: AnalyticsEvent[]): DailyAnalyticsEvents[] {
  const dailyMap = new Map<string, { count: number; users: Set<string> }>();
  
  console.log(`📅 Processing ${events.length} analytics events by day`);
  if (events.length > 0) {
    console.log('Sample event timestamp:', events[0].created_at);
  }

  events.forEach(event => {
    if (!event.user_email || !event.created_at) return;

    // Extract date in yyyy-mm-dd format
    // Handle Supabase timestamp format: "2025-07-17 03:36:07.947437+00"
    const eventDate = new Date(event.created_at);
    
    // Ensure we have a valid date
    if (isNaN(eventDate.getTime())) {
      console.warn('Invalid date format in analytics event:', event.created_at);
      return;
    }
    
    // Extract date in yyyy-mm-dd format (local timezone to match other data sources)
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { count: 0, users: new Set() });
    }

    const dayData = dailyMap.get(dateKey)!;
    dayData.count++;
    dayData.users.add(event.user_email.toLowerCase());
  });

  // Convert map to array and sort by date
  const result = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      uniqueUsers: data.users.size
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
    
  console.log(`📊 Processed analytics events into ${result.length} daily buckets`);
  if (result.length > 0) {
    console.log('Date range:', result[0].date, 'to', result[result.length - 1].date);
    console.log('Sample daily data:', result.slice(0, 3));
  }
  
  return result;
}

/**
 * Get analytics events aggregated by organisation using email mapping
 * @param events Array of analytics events
 * @param emailToOrgMap Map of email addresses to organisation names
 * @returns Map of organisation names to event counts and unique users
 */
export function getAnalyticsEventsByOrganisation(
  events: AnalyticsEvent[],
  emailToOrgMap: Map<string, string>
): Map<string, { events: number; users: Set<string> }> {
  const orgMap = new Map<string, { events: number; users: Set<string> }>();

  events.forEach(event => {
    if (!event.user_email) return;

    const email = event.user_email.toLowerCase();
    let orgName = emailToOrgMap.get(email) || "Unknown Organisation";

    // Fallback to domain extraction if no mapping exists
    if (orgName === "Unknown Organisation") {
      const domain = email.split("@")[1];
      if (domain) {
        orgName = domain
          .replace(/\.(com|org|net|gov|edu)$/, "")
          .replace(/\./g, " ");
        orgName = orgName.charAt(0).toUpperCase() + orgName.slice(1);
      }
    }

    if (!orgMap.has(orgName)) {
      orgMap.set(orgName, { events: 0, users: new Set() });
    }

    const orgData = orgMap.get(orgName)!;
    orgData.events++;
    orgData.users.add(email);
  });

  return orgMap;
}