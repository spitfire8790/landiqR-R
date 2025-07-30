/**
 * Script to explore Jira custom fields and data structure
 * Run with: node scripts/explore-jira-fields.js
 */

require('dotenv').config({ path: '.env.local' });

const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
const JIRA_BASE_URL = `https://${JIRA_DOMAIN}/rest/api/3`;

if (!JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_DOMAIN) {
  console.error('❌ Missing required environment variables!');
  console.error('Please set JIRA_API_TOKEN, JIRA_EMAIL, and JIRA_DOMAIN in your .env.local file');
  process.exit(1);
}

// Create base64 encoded credentials for Basic Auth
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function makeRequest(endpoint) {
  const url = `${JIRA_BASE_URL}${endpoint}`;
  console.log(`\n📡 Fetching: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error.message);
    return null;
  }
}

async function exploreJiraData() {
  console.log('🔍 Exploring Jira Data Structure...\n');
  console.log('Configuration:');
  console.log(`Domain: ${JIRA_DOMAIN}`);
  console.log(`Email: ${JIRA_EMAIL}`);
  console.log(`API Token: ${JIRA_API_TOKEN ? '✓ Set' : '✗ Missing'}`);

  // Test connection
  console.log('\n1️⃣ Testing Connection...');
  const currentUser = await makeRequest('/myself');
  if (currentUser) {
    console.log('✅ Connected as:', currentUser.displayName, `(${currentUser.emailAddress})`);
  } else {
    console.error('❌ Failed to connect to Jira');
    return;
  }

  // Get all fields (including custom fields)
  console.log('\n2️⃣ Fetching All Fields...');
  const fields = await makeRequest('/field');
  if (fields) {
    const customFields = fields.filter(f => f.custom);
    console.log(`Found ${fields.length} total fields (${customFields.length} custom fields)`);
    
    console.log('\n📋 Email-Related Custom Fields:');
    customFields.forEach(field => {
      if (field.name.toLowerCase().includes('email') || 
          field.name.toLowerCase().includes('mail') ||
          field.name.toLowerCase().includes('contact') ||
          field.name.toLowerCase().includes('customer') ||
          field.name.toLowerCase().includes('participant')) {
        console.log(`  - ${field.name} (${field.id}) - Type: ${field.schema?.type || 'unknown'}`);
      }
    });

    console.log('\n📋 User-Related Custom Fields:');
    customFields.forEach(field => {
      if (field.schema?.type === 'user' || 
          field.schema?.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker' ||
          field.schema?.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker') {
        console.log(`  - ${field.name} (${field.id}) - Schema: ${field.schema?.custom || field.schema?.type}`);
      }
    });
  }

  // Get projects (especially service desk projects)
  console.log('\n3️⃣ Fetching Projects...');
  const projects = await makeRequest('/project');
  if (projects) {
    console.log(`Found ${projects.length} projects`);
    const serviceDeskProjects = projects.filter(p => 
      p.projectTypeKey === 'service_desk' || 
      p.projectTypeKey === 'business' ||
      p.name.toLowerCase().includes('help') ||
      p.name.toLowerCase().includes('support') ||
      p.name.toLowerCase().includes('service')
    );
    
    if (serviceDeskProjects.length > 0) {
      console.log('\n🎫 Potential Service Desk Projects:');
      serviceDeskProjects.forEach(p => {
        console.log(`  - ${p.name} (${p.key}) - Type: ${p.projectTypeKey}`);
      });
    }
  }

  // Get issue types
  console.log('\n4️⃣ Fetching Issue Types...');
  const issueTypes = await makeRequest('/issuetype');
  if (issueTypes) {
    const serviceTypes = issueTypes.filter(t => 
      t.name.toLowerCase().includes('service') ||
      t.name.toLowerCase().includes('support') ||
      t.name.toLowerCase().includes('help') ||
      t.name.toLowerCase().includes('incident') ||
      t.name.toLowerCase().includes('request')
    );
    
    console.log('\n🎫 Service Desk Issue Types:');
    serviceTypes.forEach(t => {
      console.log(`  - ${t.name} (${t.id})`);
    });
  }

  // Search for sample helpdesk issues
  console.log('\n5️⃣ Searching for Sample Helpdesk Issues...');
  // For LandiQ, use their specific project and issue type
  const jql = 'project = LL1HD AND issuetype = "General request" ORDER BY created DESC';
  // Fetch with ALL fields by using '*all' in the fields parameter
  const searchResult = await makeRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=5&expand=names,schema&fields=*all`);
  
  if (searchResult && searchResult.issues && searchResult.issues.length > 0) {
    console.log(`\nFound ${searchResult.total} total helpdesk issues`);
    console.log(`Showing ${searchResult.issues.length} sample issues with all fields:\n`);
    
    // Create a field name lookup map
    const fieldNameMap = {};
    if (fields) {
      fields.forEach(field => {
        fieldNameMap[field.id] = field.name;
      });
    }
    
    searchResult.issues.forEach((issue, idx) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Issue ${idx + 1}: ${issue.key}`);
      console.log(`${'='.repeat(80)}`);
      
      // Extract emails for summary
      const emails = new Set();
      
      // Display all fields
      console.log('\n🔍 All Fields and Values:');
      Object.keys(issue.fields).forEach(fieldKey => {
        const value = issue.fields[fieldKey];
        const fieldName = fieldNameMap[fieldKey] || fieldKey;
        
        if (value === null || value === undefined) {
          console.log(`  • ${fieldName} (${fieldKey}): [empty]`);
          return;
        }
        
        // Handle different field types
        if (typeof value === 'string') {
          console.log(`  • ${fieldName} (${fieldKey}): "${value}"`);
          // Check for emails
          if (value.includes('@')) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = value.match(emailRegex);
            if (matches) {
              matches.forEach(email => emails.add(email));
            }
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          console.log(`  • ${fieldName} (${fieldKey}): ${value}`);
        } else if (Array.isArray(value)) {
          console.log(`  • ${fieldName} (${fieldKey}): [Array with ${value.length} items]`);
          value.forEach((item, i) => {
            if (typeof item === 'string') {
              console.log(`      [${i}]: "${item}"`);
            } else if (item && typeof item === 'object') {
              // Handle user objects
              if (item.displayName || item.name || item.emailAddress) {
                const userInfo = [];
                if (item.displayName) userInfo.push(`name: ${item.displayName}`);
                if (item.emailAddress) {
                  userInfo.push(`email: ${item.emailAddress}`);
                  emails.add(item.emailAddress);
                }
                if (item.accountId) userInfo.push(`id: ${item.accountId}`);
                console.log(`      [${i}]: User { ${userInfo.join(', ')} }`);
              } else {
                console.log(`      [${i}]: ${JSON.stringify(item, null, 2).split('\\n').join('\\n      ')}`);
              }
            }
          });
        } else if (value && typeof value === 'object') {
          // Handle object fields
          if (value.displayName || value.name || value.emailAddress) {
            // User object
            const userInfo = [];
            if (value.displayName) userInfo.push(`name: ${value.displayName}`);
            if (value.emailAddress) {
              userInfo.push(`email: ${value.emailAddress}`);
              emails.add(value.emailAddress);
            }
            if (value.accountId) userInfo.push(`id: ${value.accountId}`);
            console.log(`  • ${fieldName} (${fieldKey}): User { ${userInfo.join(', ')} }`);
          } else if (value.name && value.id) {
            // Simple object with name and id
            console.log(`  • ${fieldName} (${fieldKey}): ${value.name} (id: ${value.id})`);
          } else {
            // Complex object - pretty print
            const formatted = JSON.stringify(value, null, 2).split('\\n').join('\\n    ');
            console.log(`  • ${fieldName} (${fieldKey}): ${formatted}`);
          }
        }
      });
      
      console.log(`\n📧 Email Summary for this issue:`);
      console.log(`   Total unique emails found: ${emails.size}`);
      if (emails.size > 0) {
        console.log(`   Emails: ${Array.from(emails).join(', ')}`);
      }
    });
    
    // Summary of all fields found across all issues
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 FIELD USAGE SUMMARY');
    console.log(`${'='.repeat(80)}`);
    
    const fieldUsage = {};
    searchResult.issues.forEach(issue => {
      Object.keys(issue.fields).forEach(fieldKey => {
        const value = issue.fields[fieldKey];
        if (!fieldUsage[fieldKey]) {
          fieldUsage[fieldKey] = {
            name: fieldNameMap[fieldKey] || fieldKey,
            count: 0,
            hasValues: 0,
            sampleValues: []
          };
        }
        fieldUsage[fieldKey].count++;
        
        if (value !== null && value !== undefined && 
            !(Array.isArray(value) && value.length === 0) &&
            !(typeof value === 'string' && value.trim() === '')) {
          fieldUsage[fieldKey].hasValues++;
          
          // Store sample values
          if (fieldUsage[fieldKey].sampleValues.length < 3) {
            if (typeof value === 'string' || typeof value === 'number') {
              fieldUsage[fieldKey].sampleValues.push(value);
            } else if (value.name) {
              fieldUsage[fieldKey].sampleValues.push(value.name);
            } else if (value.displayName) {
              fieldUsage[fieldKey].sampleValues.push(value.displayName);
            }
          }
        }
      });
    });
    
    console.log('\nFields with values:');
    Object.entries(fieldUsage)
      .filter(([_, info]) => info.hasValues > 0)
      .sort((a, b) => b[1].hasValues - a[1].hasValues)
      .forEach(([fieldKey, info]) => {
        console.log(`  • ${info.name} (${fieldKey}): ${info.hasValues}/${info.count} issues have values`);
        if (info.sampleValues.length > 0) {
          console.log(`    Sample values: ${info.sampleValues.map(v => `"${v}"`).join(', ')}`);
        }
      });
      
    console.log('\nEmpty fields:');
    Object.entries(fieldUsage)
      .filter(([_, info]) => info.hasValues === 0)
      .forEach(([fieldKey, info]) => {
        console.log(`  • ${info.name} (${fieldKey}): Always empty`);
      });
  } else {
    console.log('No helpdesk issues found. Try adjusting the JQL query.');
  }

  // Alternative JQL queries to try
  console.log('\n💡 Alternative JQL Queries to Try:');
  console.log('  - "project = LL1HD ORDER BY created DESC"');
  console.log('  - "project = LL1HD AND reporter = currentUser() ORDER BY created DESC"');
  console.log('  - "project = LL1HD AND text ~ email ORDER BY created DESC"');
  console.log('  - "project = LL1HD AND created >= -30d ORDER BY created DESC"');
  
  console.log('\n✅ Exploration complete!');
}

// Run the exploration
exploreJiraData().catch(console.error);