import { startOfMonth, format, subMonths, parseISO, differenceInDays, differenceInMonths } from 'date-fns';
import { UserEngagementData, UserActivityPoint, CohortData, TrendIndicator } from '../types/engagement.types';

export class EngagementTrajectoryService {
  
  /**
   * Generate monthly activity points for the last 6 months
   */
  static generateMonthlyPoints(giraffeDays: number, landiqDays: number): UserActivityPoint[] {
    const points: UserActivityPoint[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      
      // Calculate simulated usage for each month based on current recency
      // More recent activity = higher usage in recent months
      const monthWeight = 1 - (i * 0.15); // Recent months weighted higher
      
      const giraffeUsage = giraffeDays <= 240 ? 
        Math.max(0, Math.floor((240 - giraffeDays) * monthWeight / 10)) : 0;
      const landiqUsage = landiqDays <= 240 ? 
        Math.max(0, Math.floor((240 - landiqDays) * monthWeight / 10)) : 0;
      
      points.push({
        date: format(monthStart, 'yyyy-MM-dd'),
        giraffe_usage: giraffeUsage,
        landiq_usage: landiqUsage,
        total_usage: giraffeUsage + landiqUsage
      });
    }
    
    return points;
  }

  /**
   * Build monthly activity points from raw activity event dates for the previous `months` months.
   * Accepts ISO date strings (yyyy-mm-dd). Each appearance counts as 1 usage event.
   */
  static generateMonthlyCounts(
    landiqEvents: string[] = [],
  ): UserActivityPoint[] {
    const points: UserActivityPoint[] = [];
    const now = new Date();

    // Group events by year-month key e.g. "2025-03"
    const toMonthKey = (iso: string) => iso.slice(0, 7); // yyyy-mm

    const lMap = new Map<string, number>();

    landiqEvents.forEach((iso) => {
      const key = toMonthKey(iso);
      lMap.set(key, (lMap.get(key) || 0) + 1);
    });

    const START_DATE = new Date("2025-01-01");
    const totalMonths = differenceInMonths(now, START_DATE) + 1;

    for (let i = totalMonths - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthKey = format(monthStart, "yyyy-MM");

      const giraffe_usage = 0;
      const landiq_usage = lMap.get(monthKey) || 0;

      points.push({
        date: format(monthStart, "yyyy-MM-dd"),
        giraffe_usage,
        landiq_usage,
        total_usage: giraffe_usage + landiq_usage,
      });
    }

    return points;
  }

  /**
   * Calculate trend direction and magnitude
   */
  static calculateTrend(activityPoints: UserActivityPoint[], platform: 'giraffe' | 'landiq' | 'total'): TrendIndicator {
    if (activityPoints.length < 2) {
      return { direction: 'stable', magnitude: 'weak', percentage_change: 0 };
    }

    const values = activityPoints.map(point => {
      switch (platform) {
        case 'giraffe': return point.giraffe_usage;
        case 'landiq': return point.landiq_usage;
        default: return point.total_usage;
      }
    });

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const percentageChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    let magnitude: 'strong' | 'moderate' | 'weak' = 'weak';
    
    if (Math.abs(percentageChange) > 5) {
      direction = percentageChange > 0 ? 'up' : 'down';
      
      if (Math.abs(percentageChange) > 50) magnitude = 'strong';
      else if (Math.abs(percentageChange) > 20) magnitude = 'moderate';
      else magnitude = 'weak';
    }
    
    return { direction, magnitude, percentage_change: percentageChange };
  }

  /**
   * Calculate engagement score (0-100)
   */
  static calculateEngagementScore(activityPoints: UserActivityPoint[]): number {
    if (activityPoints.length === 0) return 0;
    
    const totalActivity = activityPoints.reduce((sum, point) => sum + point.total_usage, 0);
    const maxPossibleActivity = activityPoints.length * 50; // Assuming max 50 activities per month
    
    return Math.min(100, (totalActivity / maxPossibleActivity) * 100);
  }

  /**
   * Determine onboarding month (simulated based on activity pattern)
   */
  static determineOnboardingMonth(activityPoints: UserActivityPoint[]): string {
    // Find first month with significant activity
    const activeMonth = activityPoints.find(point => point.total_usage > 0);
    return activeMonth ? format(parseISO(activeMonth.date), 'yyyy-MM') : format(new Date(), 'yyyy-MM');
  }

  /**
   * Process user points into engagement data
   */
  static processUserEngagementData(
    userPoints: Array<{ email: string; org: string; g_days: number; l_days: number }>
  ): UserEngagementData[] {
    
    return userPoints.map((user, index) => {
      // If event arrays are provided use them, otherwise fall back to recency-based simulation.
      const anyUser: any = user as any;
      const activityPoints = Array.isArray(anyUser.g_events)
        ? this.generateMonthlyCounts(anyUser.l_events)
        : this.generateMonthlyPoints(anyUser.g_days, anyUser.l_days);
      
      const giraffeTrend = this.calculateTrend(activityPoints, 'giraffe');
      const landiqTrend = this.calculateTrend(activityPoints, 'landiq');
      const overallTrend = this.calculateTrend(activityPoints, 'total');
      
      const engagementScore = this.calculateEngagementScore(activityPoints);
      const onboardingMonth = this.determineOnboardingMonth(activityPoints);
      
      return {
        user_id: `user_${index}`,
        email: user.email,
        organisation: user.org,
        onboarding_month: onboardingMonth,
        activity_points: activityPoints,
        giraffe_trend:
          giraffeTrend.direction === "up"
            ? "increasing"
            : giraffeTrend.direction === "down"
            ? "decreasing"
            : "stable",
        landiq_trend:
          landiqTrend.direction === "up"
            ? "increasing"
            : landiqTrend.direction === "down"
            ? "decreasing"
            : "stable",
        overall_trend:
          overallTrend.direction === "up"
            ? "increasing"
            : overallTrend.direction === "down"
            ? "decreasing"
            : "stable",
        engagement_score: engagementScore,
      };
    });
  }

  /**
   * Group users by cohort (onboarding month)
   */
  static generateCohortData(engagementData: UserEngagementData[]): CohortData[] {
    const cohortMap = new Map<string, UserEngagementData[]>();
    
    engagementData.forEach(user => {
      const cohort = user.onboarding_month;
      if (!cohortMap.has(cohort)) {
        cohortMap.set(cohort, []);
      }
      cohortMap.get(cohort)!.push(user);
    });
    
    return Array.from(cohortMap.entries()).map(([cohortMonth, users]) => {
      const avgEngagementScore = users.reduce((sum, user) => sum + user.engagement_score, 0) / users.length;
      const retentionRate = users.filter(user => user.engagement_score > 20).length / users.length * 100;
      
      return {
        cohort_month: cohortMonth,
        user_count: users.length,
        avg_engagement_score: avgEngagementScore,
        retention_rate: retentionRate,
        users
      };
    }).sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));
  }

  /**
   * Filter engagement data by various criteria
   */
  static filterEngagementData(
    data: UserEngagementData[],
    filters: {
      organisations?: string[];
      users?: string[];
      minEngagementScore?: number;
      trends?: Array<'increasing' | 'decreasing' | 'stable'>;
    }
  ): UserEngagementData[] {
    return data.filter(user => {
      if (filters.organisations && !filters.organisations.includes(user.organisation)) {
        return false;
      }
      
      if (filters.users && !filters.users.includes(user.email)) {
        return false;
      }
      
      if (filters.minEngagementScore && user.engagement_score < filters.minEngagementScore) {
        return false;
      }
      
      if (filters.trends && !filters.trends.includes(user.overall_trend)) {
        return false;
      }
      
      return true;
    });
  }
} 