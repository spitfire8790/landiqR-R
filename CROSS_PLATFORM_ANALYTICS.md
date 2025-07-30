# Cross-Platform Analytics Integration

## Overview

This implementation provides a unified analytics dashboard that combines data from three sources:
- **Jira**: Helpdesk support tickets
- **Pipedrive**: CRM/Sales data
- **Land iQ**: Product usage events

All data is linked via email addresses to create comprehensive user profiles.

## Features

### 1. Unified User Profiles
- Complete 360° view of each user across all platforms
- Tracks support history, sales status, and product usage
- Calculates engagement scores and churn risk
- Shows timeline of interactions across all systems

### 2. Cross-Platform Visualisations

#### Overview Dashboard
- User journey funnel (Support → Product → Sales → Paying)
- Churn risk distribution
- Multi-platform activity timeline
- Key metrics across all platforms

#### User Profiles
- Individual user cards with all platform data
- Engagement scores and risk indicators
- Support tickets, deal values, usage patterns
- Feature usage tags

#### Organisation Analytics
- Revenue and engagement by organisation
- Support activity correlation with deal value
- Top features used per organisation

#### Conversion Analytics
- Support to sales conversion tracking
- Feature usage patterns: paying vs non-paying users
- Engagement vs revenue scatter plot

#### AI-Powered Insights
- Automated churn risk detection
- Conversion opportunity identification
- Support efficiency metrics
- Revenue leader analysis
- Prioritised action items

## Technical Implementation

### Data Flow
1. **Parallel Data Fetching**: All three APIs are called simultaneously
2. **Email Matching**: Users are matched across platforms by email (case-insensitive)
3. **Profile Enrichment**: Data from each source enriches the unified profile
4. **Metric Calculation**: Engagement scores, churn risk, and other metrics are computed
5. **Visualisation**: Data is presented through interactive charts and tables

### Key Components

#### `JiraAnalytics.tsx`
The main component that:
- Fetches data from all sources
- Creates unified user profiles
- Calculates derived metrics
- Renders visualisations

#### Data Sources
- **Jira API**: `/api/jira` - Fetches helpdesk tickets
- **Pipedrive API**: Uses existing `pipedriveService`
- **Land iQ Events**: Parses CSV from `/landiQSDKeventsDate.csv`

### Metrics Explained

#### Engagement Score (0-100)
- Product usage events (max 30 points)
- Feature diversity (max 20 points)
- Daily activity rate (max 20 points)
- Paying customer status (20 points)
- Support satisfaction (max 10 points)

#### Churn Risk
- **High**: Paying users inactive for 30+ days
- **Medium**: Users inactive for 14+ days or low satisfaction
- **Low**: Active users with good engagement

## Usage

### Accessing the Dashboard
Navigate to `/cross-platform-analytics` to view the full dashboard.

### Environment Variables Required
```env
# Jira
JIRA_DOMAIN=your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# Pipedrive
PIPEDRIVE_API_KEY=your-pipedrive-api-key
PIPEDRIVE_COMPANY_DOMAIN=your-company
```

### Data Requirements
1. **Jira**: Users must have email addresses in reporter field
2. **Pipedrive**: Contacts must have email addresses
3. **Land iQ Events**: CSV must contain userEmail field

## Key Insights Provided

1. **User Journey Tracking**
   - See how users progress from support to sales
   - Identify bottlenecks in conversion

2. **Churn Prevention**
   - Proactively identify at-risk customers
   - Track engagement patterns

3. **Revenue Optimisation**
   - Identify high-value organisations
   - Find upsell opportunities

4. **Support Efficiency**
   - Track resolution times and satisfaction
   - Identify common issues for automation

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Predictive Models**: ML-based churn and conversion predictions
3. **Automated Actions**: Trigger workflows based on insights
4. **Export Capabilities**: Generate reports for stakeholders
5. **Custom Alerts**: Set thresholds for key metrics