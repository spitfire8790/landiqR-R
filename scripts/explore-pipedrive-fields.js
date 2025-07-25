#!/usr/bin/env node

/**
 * Pipedrive Field Explorer
 * Run this script to discover all available fields in your Pipedrive instance
 * 
 * Usage: node scripts/explore-pipedrive-fields.js
 */

const https = require('https');

// Your Pipedrive credentials
const API_TOKEN = 'ece41b5436243dca354d33190b560b60d8725269';
const DOMAIN = 'landiq';

// Field endpoints to explore
const FIELD_ENDPOINTS = [
  { name: 'Deal Fields', endpoint: 'dealFields' },
  { name: 'Person Fields', endpoint: 'personFields' },
  { name: 'Organization Fields', endpoint: 'organizationFields' },
  { name: 'Activity Fields', endpoint: 'activityFields' },
  { name: 'Product Fields', endpoint: 'productFields' },
];

// Helper function to make API requests
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://${DOMAIN}.pipedrive.com/api/v1/${endpoint}?api_token=${API_TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Main function to explore all fields
async function exploreFields() {
  console.log('🔍 Exploring Pipedrive Fields...\n');
  console.log(`API Token: ${API_TOKEN.substring(0, 8)}...`);
  console.log(`Domain: ${DOMAIN}\n`);
  
  try {
    // Test connection first
    console.log('Testing API connection...');
    const testResponse = await makeRequest('users');
    if (testResponse.success) {
      console.log('✅ API connection successful!\n');
    } else {
      console.log('❌ API connection failed');
      return;
    }

    // Explore all field types
    for (const fieldType of FIELD_ENDPOINTS) {
      try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📋 ${fieldType.name.toUpperCase()}`);
        console.log(`${'='.repeat(50)}`);
        
        const response = await makeRequest(fieldType.endpoint);
        
        if (response.success && response.data) {
          console.log(`Found ${response.data.length} fields:\n`);
          
          response.data.forEach((field, index) => {
            const required = field.mandatory_flag ? ' (REQUIRED)' : '';
            const options = field.options && field.options.length > 0 ? 
              ` [Options: ${field.options.map(opt => opt.label).join(', ')}]` : '';
            
            console.log(`${index + 1}. ${field.key}`);
            console.log(`   Name: ${field.name}`);
            console.log(`   Type: ${field.field_type}${required}${options}`);
            console.log(`   ID: ${field.id}`);
            console.log('');
          });
          
          // Generate TypeScript interface suggestion
          console.log('\n📝 TypeScript Interface Suggestion:');
          console.log('```typescript');
          console.log(`interface ${fieldType.name.replace(' Fields', '')} {`);
          response.data.forEach(field => {
            const tsType = getTypeScriptType(field.field_type);
            const optional = field.mandatory_flag ? '' : '?';
            console.log(`  ${field.key}${optional}: ${tsType}; // ${field.name}`);
          });
          console.log('}');
          console.log('```\n');
        } else {
          console.log('❌ No data returned or request failed');
        }
      } catch (error) {
        console.log(`❌ Error fetching ${fieldType.name}:`, error.message);
      }
    }
    
    // Get additional endpoint information
    console.log('\n' + '='.repeat(50));
    console.log('📊 ADDITIONAL ENDPOINTS TO EXPLORE');
    console.log('='.repeat(50));
    
    const additionalEndpoints = [
      'stages',
      'pipelines', 
      'currencies',
      'users',
      'goals',
      'filters'
    ];
    
    console.log('You can also explore these endpoints:');
    additionalEndpoints.forEach(endpoint => {
      console.log(`• https://${DOMAIN}.pipedrive.com/api/v1/${endpoint}?api_token=${API_TOKEN}`);
    });
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Helper function to convert Pipedrive field types to TypeScript types
function getTypeScriptType(fieldType) {
  const typeMap = {
    'varchar': 'string',
    'text': 'string',
    'double': 'number',
    'monetary': 'number',
    'int': 'number',
    'date': 'string', // ISO date string
    'datetime': 'string', // ISO datetime string
    'time': 'string',
    'timerange': 'string',
    'daterange': 'string',
    'enum': 'string',
    'set': 'string[]',
    'boolean': 'boolean',
    'phone': 'string',
    'user': 'number', // User ID
    'org': 'number', // Organization ID
    'people': 'number', // Person ID
    'picture': 'string', // URL
    'address': 'string',
    'status': 'string'
  };
  
  return typeMap[fieldType] || 'any';
}

// Run the script
if (require.main === module) {
  exploreFields().catch(console.error);
}

module.exports = { exploreFields, makeRequest }; 