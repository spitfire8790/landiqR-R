import { NextRequest, NextResponse } from 'next/server';

// Pipedrive API configuration
const PIPEDRIVE_API_KEY = process.env.PIPEDRIVE_API_KEY;
const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_COMPANY_DOMAIN || 'landiq';
const PIPEDRIVE_BASE_URL = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`;

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
    throw new Error('Pipedrive API key not configured');
  }

  await rateLimit();

  const url = `${PIPEDRIVE_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_token=${PIPEDRIVE_API_KEY}`;
  
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

  return response.json();
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
      case 'test-connection':
        try {
          await makePipedriveRequest('/users');
          return NextResponse.json({ success: true, connected: true });
        } catch (error) {
          return NextResponse.json({ 
            success: false, 
            connected: false, 
            error: error instanceof Error ? error.message : 'Connection failed' 
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