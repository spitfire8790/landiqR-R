import { NextRequest, NextResponse } from 'next/server';

// Pipedrive API configuration
const PIPEDRIVE_API_KEY = process.env.PIPEDRIVE_API_KEY;
const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_COMPANY_DOMAIN || 'landiq';
const PIPEDRIVE_BASE_URL = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`;

// Environment validation logging
console.log('Pipedrive API Configuration:', {
  hasApiKey: !!PIPEDRIVE_API_KEY,
  apiKeyLength: PIPEDRIVE_API_KEY ? PIPEDRIVE_API_KEY.length : 0,
  domain: PIPEDRIVE_DOMAIN,
  baseUrl: PIPEDRIVE_BASE_URL,
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

async function makePipedriveRequest(endpoint: string) {
  if (!PIPEDRIVE_API_KEY) {
    const error = 'Pipedrive API key not configured. Please set PIPEDRIVE_API_KEY environment variable.';
    console.error('Configuration Error:', {
      error,
      availableEnvVars: Object.keys(process.env).filter(key => key.includes('PIPEDRIVE')),
      nodeEnv: process.env.NODE_ENV
    });
    throw new Error(error);
  }

  await rateLimit();

  const url = `${PIPEDRIVE_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_token=${PIPEDRIVE_API_KEY}`;
  
  console.log('Making Pipedrive request:', {
    endpoint,
    domain: PIPEDRIVE_DOMAIN,
    urlLength: url.length,
    hasApiKey: !!PIPEDRIVE_API_KEY
  });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Land-iQ-Dashboard/1.0'
      },
    });

    console.log('Pipedrive response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pipedrive API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        endpoint
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Pipedrive success response:', {
      success: data.success,
      dataLength: data.data ? data.data.length : 'no data array',
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
      '/deals',
      '/persons',
      '/organizations',
      '/activities',
      '/stages',
      '/pipelines',
      '/users',
      '/dealFields',
      '/personFields',
      '/organizationFields',
      '/activityFields',
      '/productFields',
    ];

    const isAllowed = allowedEndpoints.some(allowed => 
      endpoint === allowed || endpoint.startsWith(allowed + '?')
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not allowed' },
        { status: 403 }
      );
    }

    console.log(`Pipedrive API call: ${endpoint}`);
    const data = await makePipedriveRequest(endpoint);
    
    // Enhanced debugging for persons and organizations endpoints
    if (endpoint.includes('/persons') || endpoint.includes('/organizations')) {
      console.log(`${endpoint} response:`, {
        success: data.success,
        dataLength: data.data ? data.data.length : 'no data array',
        additionalData: data.additional_data,
        sampleData: data.data ? data.data.slice(0, 2) : 'no data to sample'
      });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Pipedrive API Error:', error);
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
            hasApiKey: !!PIPEDRIVE_API_KEY,
            apiKeyLength: PIPEDRIVE_API_KEY ? PIPEDRIVE_API_KEY.length : 0,
            domain: PIPEDRIVE_DOMAIN,
            baseUrl: PIPEDRIVE_BASE_URL,
            nodeEnv: process.env.NODE_ENV,
            availablePipedriveEnvVars: Object.keys(process.env).filter(key => key.includes('PIPEDRIVE'))
          }
        });

      case 'test-connection':
        try {
          console.log('Testing Pipedrive connection...');
          const result = await makePipedriveRequest('/users');
          console.log('Connection test successful:', { 
            success: result.success, 
            dataLength: result.data ? result.data.length : 'no data' 
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

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Pipedrive API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 