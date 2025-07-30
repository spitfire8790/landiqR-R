import { NextRequest, NextResponse } from 'next/server';

// Jira API configuration
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN; // e.g., 'your-domain.atlassian.net'
const JIRA_BASE_URL = `https://${JIRA_DOMAIN}/rest/api/3`;

// Environment validation logging
console.log('Jira API Configuration:', {
  hasApiToken: !!JIRA_API_TOKEN,
  hasEmail: !!JIRA_EMAIL,
  domain: JIRA_DOMAIN,
  baseUrl: JIRA_BASE_URL,
  nodeEnv: process.env.NODE_ENV
});

// Rate limiting (simple in-memory implementation)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests (10 requests per second)

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
}

async function makeJiraRequest(endpoint: string, method: string = 'GET', body?: any) {
  if (!JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_DOMAIN) {
    const error = 'Jira API configuration incomplete. Please set JIRA_API_TOKEN, JIRA_EMAIL, and JIRA_DOMAIN environment variables.';
    console.error('Configuration Error:', {
      error,
      hasApiToken: !!JIRA_API_TOKEN,
      hasEmail: !!JIRA_EMAIL,
      hasDomain: !!JIRA_DOMAIN,
      availableEnvVars: Object.keys(process.env).filter(key => key.includes('JIRA')),
      nodeEnv: process.env.NODE_ENV
    });
    throw new Error(error);
  }

  await rateLimit();

  const url = `${JIRA_BASE_URL}${endpoint}`;
  
  // Create base64 encoded credentials for Basic Auth
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  
  console.log('Making Jira request:', {
    endpoint,
    method,
    domain: JIRA_DOMAIN,
    urlLength: url.length,
    hasAuth: !!auth
  });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) })
    });

    console.log('Jira response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        endpoint
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Jira success response:', {
      hasData: !!data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'not an array',
      endpoint
    });

    return data;
  } catch (fetchError) {
    console.error('Fetch Error Details:', {
      error: fetchError,
      endpoint,
      message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
    });
    throw fetchError;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    // Security: Only allow specific endpoints
    const allowedEndpoints = [
      '/issue',           // Get issues
      '/search',          // Search issues (JQL)
      '/project',         // Get projects
      '/user',            // Get users
      '/field',           // Get fields
      '/priority',        // Get priorities
      '/status',          // Get statuses
      '/issuetype',       // Get issue types
      '/servicedesk',     // Service desk endpoints
      '/customer',        // Customer endpoints
    ];

    const isAllowed = allowedEndpoints.some(allowed => 
      endpoint === allowed || endpoint.startsWith(allowed + '/') || endpoint.startsWith(allowed + '?')
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not allowed' },
        { status: 403 }
      );
    }

    console.log(`Jira API call: ${endpoint}`);
    const data = await makeJiraRequest(endpoint);
    
    // Enhanced debugging for common endpoints
    if (endpoint.includes('/search') || endpoint.includes('/issue')) {
      console.log(`${endpoint} response:`, {
        issues: data.issues ? data.issues.length : 'no issues array',
        total: data.total,
        startAt: data.startAt,
        maxResults: data.maxResults,
        sampleData: data.issues ? data.issues.slice(0, 2) : 'no data to sample'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Jira API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'health-check':
        return NextResponse.json({
          success: true,
          config: {
            hasApiToken: !!JIRA_API_TOKEN,
            hasEmail: !!JIRA_EMAIL,
            hasDomain: !!JIRA_DOMAIN,
            domain: JIRA_DOMAIN,
            baseUrl: JIRA_BASE_URL,
            nodeEnv: process.env.NODE_ENV,
            availableJiraEnvVars: Object.keys(process.env).filter(key => key.includes('JIRA'))
          }
        });

      case 'test-connection':
        try {
          console.log('Testing Jira connection...');
          // Try to get current user to test authentication
          const result = await makeJiraRequest('/myself');
          console.log('Connection test successful:', { 
            displayName: result.displayName,
            emailAddress: result.emailAddress,
            accountId: result.accountId
          });
          return NextResponse.json({ success: true, connected: true, result });
        } catch (error) {
          console.error('Connection test failed:', error);
          return NextResponse.json({ 
            success: false, 
            connected: false, 
            error: error instanceof Error ? error.message : 'Connection failed',
            details: error instanceof Error ? error.stack : undefined
          });
        }

      case 'explore-helpdesk':
        try {
          console.log('Exploring helpdesk data structure...');
          
          // Get service desk projects
          const projects = await makeJiraRequest('/project?typeKey=service_desk');
          
          // Get sample issues from helpdesk (using JQL)
          // For LandiQ, we use their specific project key and issue type
          const jql = 'project = LL1HD AND issuetype = "General request" ORDER BY created DESC';
          const issues = await makeJiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=10&expand=names,schema&fields=summary,description,issuetype,project,assignee,reporter,priority,status,created,updated,resolved,customfield_10032,customfield_10133,customfield_10171,customfield_10202,customfield_10172,customfield_10232`);
          
          // Get available fields
          const fields = await makeJiraRequest('/field');
          
          return NextResponse.json({ 
            success: true, 
            data: {
              projects,
              sampleIssues: issues,
              availableFields: fields
            }
          });
        } catch (error) {
          console.error('Helpdesk exploration failed:', error);
          return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Exploration failed' 
          });
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Jira API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}