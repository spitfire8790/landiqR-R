export interface UserActivityPoint {
  date: string;
  giraffe_usage: number;
  landiq_usage: number;
  total_usage: number;
}

export interface UserEngagementData {
  user_id: string;
  email: string;
  organisation: string;
  onboarding_month: string;
  activity_points: UserActivityPoint[];
  giraffe_trend: 'increasing' | 'decreasing' | 'stable';
  landiq_trend: 'increasing' | 'decreasing' | 'stable';
  overall_trend: 'increasing' | 'decreasing' | 'stable';
  engagement_score: number;
}

export interface CohortData {
  cohort_month: string;
  user_count: number;
  avg_engagement_score: number;
  retention_rate: number;
  users: UserEngagementData[];
}

export interface EngagementTrajectoryProps {
  timeframe?: 'last_3_months' | 'last_6_months' | 'last_12_months';
  selectedUsers?: string[];
  selectedOrganisations?: string[];
  showTrendArrows?: boolean;
  showCohortAnalysis?: boolean;
  height?: number;
}

export interface TrendIndicator {
  direction: 'up' | 'down' | 'stable';
  magnitude: 'strong' | 'moderate' | 'weak';
  percentage_change: number;
} 