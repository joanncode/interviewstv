/**
 * Business Intelligence & Analytics System for Interviews.tv
 * Advanced analytics, reporting, and business insights
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class BusinessIntelligenceSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.reportCache = new Map();
    this.kpiTargets = this.initializeKPITargets();
  }

  initializeKPITargets() {
    return {
      monthly_active_users: 10000,
      user_retention_rate: 0.75,
      average_session_duration: 1800, // 30 minutes
      conversion_rate: 0.05, // 5%
      monthly_recurring_revenue: 50000,
      customer_acquisition_cost: 25,
      lifetime_value: 150,
      churn_rate: 0.05 // 5% monthly
    };
  }

  // Generate comprehensive dashboard analytics
  async getDashboardAnalytics(timeframe = '30d') {
    try {
      const cacheKey = `dashboard_analytics_${timeframe}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const analytics = await Promise.all([
        this.getUserAnalytics(startDate, endDate),
        this.getRevenueAnalytics(startDate, endDate),
        this.getContentAnalytics(startDate, endDate),
        this.getEngagementAnalytics(startDate, endDate),
        this.getPerformanceMetrics(startDate, endDate)
      ]);

      const result = {
        timeframe,
        generated_at: new Date(),
        user_analytics: analytics[0],
        revenue_analytics: analytics[1],
        content_analytics: analytics[2],
        engagement_analytics: analytics[3],
        performance_metrics: analytics[4],
        kpi_status: await this.getKPIStatus()
      };

      // Cache for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(result));

      return result;

    } catch (error) {
      this.logger.error('Error generating dashboard analytics', { error: error.message });
      throw error;
    }
  }

  // User Analytics
  async getUserAnalytics(startDate, endDate) {
    try {
      // Total users and growth
      const [userStats] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users,
          COUNT(CASE WHEN last_login >= ? THEN 1 END) as active_users,
          COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) as premium_users
        FROM users
        WHERE created_at <= ?
      `, [startDate, startDate, endDate]);

      // Daily active users trend
      const [dauTrend] = await this.dbPool.execute(`
        SELECT 
          DATE(last_login) as date,
          COUNT(DISTINCT user_id) as daily_active_users
        FROM user_sessions
        WHERE last_login BETWEEN ? AND ?
        GROUP BY DATE(last_login)
        ORDER BY date
      `, [startDate, endDate]);

      // User acquisition channels
      const [acquisitionChannels] = await this.dbPool.execute(`
        SELECT 
          acquisition_channel,
          COUNT(*) as users,
          COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?) as percentage
        FROM users
        WHERE created_at BETWEEN ? AND ?
        GROUP BY acquisition_channel
        ORDER BY users DESC
      `, [startDate, endDate, startDate, endDate]);

      // User retention cohorts
      const retentionData = await this.calculateRetentionCohorts(startDate, endDate);

      // Geographic distribution
      const [geoDistribution] = await this.dbPool.execute(`
        SELECT 
          country,
          COUNT(*) as users,
          COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) as premium_users
        FROM users
        WHERE created_at BETWEEN ? AND ?
        GROUP BY country
        ORDER BY users DESC
        LIMIT 10
      `, [startDate, endDate]);

      return {
        overview: userStats[0],
        dau_trend: dauTrend,
        acquisition_channels: acquisitionChannels,
        retention_cohorts: retentionData,
        geographic_distribution: geoDistribution
      };

    } catch (error) {
      this.logger.error('Error getting user analytics', { error: error.message });
      throw error;
    }
  }

  // Revenue Analytics
  async getRevenueAnalytics(startDate, endDate) {
    try {
      // Revenue overview
      const [revenueOverview] = await this.dbPool.execute(`
        SELECT 
          SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
          SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END) as donation_revenue,
          SUM(CASE WHEN type = 'pay_per_view' THEN amount ELSE 0 END) as ppv_revenue,
          SUM(amount) as total_revenue,
          COUNT(DISTINCT user_id) as paying_users
        FROM payments
        WHERE status = 'completed' AND created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      // Monthly Recurring Revenue (MRR)
      const [mrrData] = await this.dbPool.execute(`
        SELECT 
          s.plan_id,
          COUNT(*) as subscribers,
          SUM(
            CASE 
              WHEN s.plan_id = 'basic' THEN 4.99
              WHEN s.plan_id = 'premium' THEN 9.99
              WHEN s.plan_id = 'creator' THEN 19.99
              ELSE 0
            END
          ) as mrr
        FROM user_subscriptions s
        WHERE s.status = 'active'
        GROUP BY s.plan_id
      `);

      // Revenue trend
      const [revenueTrend] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as daily_revenue,
          COUNT(*) as transactions
        FROM payments
        WHERE status = 'completed' AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate, endDate]);

      // Customer Lifetime Value (CLV)
      const [clvData] = await this.dbPool.execute(`
        SELECT 
          AVG(total_spent) as average_clv,
          AVG(months_active) as average_lifetime_months
        FROM (
          SELECT 
            user_id,
            SUM(amount) as total_spent,
            DATEDIFF(MAX(created_at), MIN(created_at)) / 30 as months_active
          FROM payments
          WHERE status = 'completed'
          GROUP BY user_id
        ) user_clv
      `);

      // Churn analysis
      const churnRate = await this.calculateChurnRate(startDate, endDate);

      return {
        overview: revenueOverview[0],
        mrr: mrrData,
        trend: revenueTrend,
        clv: clvData[0],
        churn_rate: churnRate
      };

    } catch (error) {
      this.logger.error('Error getting revenue analytics', { error: error.message });
      throw error;
    }
  }

  // Content Analytics
  async getContentAnalytics(startDate, endDate) {
    try {
      // Content overview
      const [contentOverview] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as total_interviews,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_interviews,
          COUNT(CASE WHEN is_live = 1 THEN 1 END) as live_interviews,
          AVG(duration) as average_duration,
          SUM(view_count) as total_views
        FROM interviews
        WHERE created_at <= ?
      `, [startDate, endDate]);

      // Top performing content
      const [topContent] = await this.dbPool.execute(`
        SELECT 
          i.id,
          i.title,
          i.view_count,
          i.like_count,
          i.comment_count,
          u.username as creator,
          (i.like_count * 100.0 / NULLIF(i.view_count, 0)) as engagement_rate
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.created_at BETWEEN ? AND ?
        ORDER BY i.view_count DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Content categories performance
      const [categoryPerformance] = await this.dbPool.execute(`
        SELECT 
          category,
          COUNT(*) as interview_count,
          AVG(view_count) as avg_views,
          AVG(duration) as avg_duration,
          SUM(view_count) as total_views
        FROM interviews
        WHERE created_at BETWEEN ? AND ?
        GROUP BY category
        ORDER BY total_views DESC
      `, [startDate, endDate]);

      // Creator performance
      const [creatorStats] = await this.dbPool.execute(`
        SELECT 
          u.username,
          COUNT(i.id) as interview_count,
          SUM(i.view_count) as total_views,
          AVG(i.view_count) as avg_views_per_interview,
          SUM(p.amount) as total_earnings
        FROM users u
        JOIN interviews i ON u.id = i.creator_id
        LEFT JOIN payments p ON u.id = p.creator_id AND p.created_at BETWEEN ? AND ?
        WHERE i.created_at BETWEEN ? AND ?
        GROUP BY u.id, u.username
        ORDER BY total_views DESC
        LIMIT 10
      `, [startDate, endDate, startDate, endDate]);

      return {
        overview: contentOverview[0],
        top_content: topContent,
        category_performance: categoryPerformance,
        creator_stats: creatorStats
      };

    } catch (error) {
      this.logger.error('Error getting content analytics', { error: error.message });
      throw error;
    }
  }

  // Engagement Analytics
  async getEngagementAnalytics(startDate, endDate) {
    try {
      // Engagement overview
      const [engagementOverview] = await this.dbPool.execute(`
        SELECT 
          AVG(session_duration) as avg_session_duration,
          AVG(pages_per_session) as avg_pages_per_session,
          COUNT(DISTINCT user_id) as engaged_users,
          SUM(CASE WHEN action_type = 'like' THEN 1 ELSE 0 END) as total_likes,
          SUM(CASE WHEN action_type = 'comment' THEN 1 ELSE 0 END) as total_comments,
          SUM(CASE WHEN action_type = 'share' THEN 1 ELSE 0 END) as total_shares
        FROM user_activities
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      // Engagement by time of day
      const [hourlyEngagement] = await this.dbPool.execute(`
        SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as activity_count,
          COUNT(DISTINCT user_id) as active_users
        FROM user_activities
        WHERE created_at BETWEEN ? AND ?
        GROUP BY HOUR(created_at)
        ORDER BY hour
      `, [startDate, endDate]);

      // Feature usage
      const [featureUsage] = await this.dbPool.execute(`
        SELECT 
          feature_name,
          COUNT(*) as usage_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM feature_usage_logs
        WHERE created_at BETWEEN ? AND ?
        GROUP BY feature_name
        ORDER BY usage_count DESC
      `, [startDate, endDate]);

      return {
        overview: engagementOverview[0],
        hourly_pattern: hourlyEngagement,
        feature_usage: featureUsage
      };

    } catch (error) {
      this.logger.error('Error getting engagement analytics', { error: error.message });
      throw error;
    }
  }

  // Performance Metrics
  async getPerformanceMetrics(startDate, endDate) {
    try {
      // System performance
      const [performanceStats] = await this.dbPool.execute(`
        SELECT 
          AVG(response_time) as avg_response_time,
          AVG(cpu_usage) as avg_cpu_usage,
          AVG(memory_usage) as avg_memory_usage,
          COUNT(CASE WHEN status_code >= 500 THEN 1 END) as error_count,
          COUNT(*) as total_requests
        FROM system_metrics
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      // Streaming performance
      const [streamingStats] = await this.dbPool.execute(`
        SELECT 
          AVG(latency) as avg_latency,
          AVG(bitrate) as avg_bitrate,
          COUNT(CASE WHEN quality = '1080p' THEN 1 END) as hd_streams,
          COUNT(*) as total_streams,
          SUM(duration) as total_streaming_hours
        FROM stream_sessions
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      return {
        system_performance: performanceStats[0],
        streaming_performance: streamingStats[0]
      };

    } catch (error) {
      this.logger.error('Error getting performance metrics', { error: error.message });
      throw error;
    }
  }

  // Calculate retention cohorts
  async calculateRetentionCohorts(startDate, endDate) {
    try {
      const [cohortData] = await this.dbPool.execute(`
        WITH user_cohorts AS (
          SELECT 
            user_id,
            DATE_FORMAT(created_at, '%Y-%m') as cohort_month,
            created_at
          FROM users
          WHERE created_at BETWEEN ? AND ?
        ),
        user_activities AS (
          SELECT 
            user_id,
            DATE_FORMAT(last_login, '%Y-%m') as activity_month
          FROM user_sessions
          WHERE last_login BETWEEN ? AND ?
        )
        SELECT 
          uc.cohort_month,
          ua.activity_month,
          COUNT(DISTINCT uc.user_id) as cohort_size,
          COUNT(DISTINCT ua.user_id) as retained_users,
          COUNT(DISTINCT ua.user_id) * 100.0 / COUNT(DISTINCT uc.user_id) as retention_rate
        FROM user_cohorts uc
        LEFT JOIN user_activities ua ON uc.user_id = ua.user_id
        GROUP BY uc.cohort_month, ua.activity_month
        ORDER BY uc.cohort_month, ua.activity_month
      `, [startDate, endDate, startDate, endDate]);

      return cohortData;

    } catch (error) {
      this.logger.error('Error calculating retention cohorts', { error: error.message });
      throw error;
    }
  }

  // Calculate churn rate
  async calculateChurnRate(startDate, endDate) {
    try {
      const [churnData] = await this.dbPool.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'canceled' AND canceled_at BETWEEN ? AND ? THEN 1 END) as churned_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
        FROM user_subscriptions
      `, [startDate, endDate]);

      const churnRate = churnData[0].churned_users / (churnData[0].active_users + churnData[0].churned_users);
      return Math.round(churnRate * 10000) / 100; // Return as percentage with 2 decimal places

    } catch (error) {
      this.logger.error('Error calculating churn rate', { error: error.message });
      throw error;
    }
  }

  // Get KPI status vs targets
  async getKPIStatus() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Calculate current KPIs
      const [mauData] = await this.dbPool.execute(`
        SELECT COUNT(DISTINCT user_id) as mau
        FROM user_sessions
        WHERE last_login >= ?
      `, [startDate]);

      const [mrrData] = await this.dbPool.execute(`
        SELECT SUM(
          CASE 
            WHEN plan_id = 'basic' THEN 4.99
            WHEN plan_id = 'premium' THEN 9.99
            WHEN plan_id = 'creator' THEN 19.99
            ELSE 0
          END
        ) as mrr
        FROM user_subscriptions
        WHERE status = 'active'
      `);

      const currentKPIs = {
        monthly_active_users: mauData[0].mau,
        monthly_recurring_revenue: mrrData[0].mrr || 0,
        churn_rate: await this.calculateChurnRate(startDate, endDate)
      };

      // Compare with targets
      const kpiStatus = {};
      for (const [kpi, target] of Object.entries(this.kpiTargets)) {
        if (currentKPIs[kpi] !== undefined) {
          kpiStatus[kpi] = {
            current: currentKPIs[kpi],
            target: target,
            achievement: (currentKPIs[kpi] / target) * 100,
            status: currentKPIs[kpi] >= target ? 'on_track' : 'below_target'
          };
        }
      }

      return kpiStatus;

    } catch (error) {
      this.logger.error('Error getting KPI status', { error: error.message });
      throw error;
    }
  }

  // Generate custom report
  async generateCustomReport(reportConfig) {
    try {
      const reportId = uuidv4();
      const { name, metrics, filters, timeframe } = reportConfig;

      // Build dynamic query based on configuration
      let query = this.buildCustomQuery(metrics, filters, timeframe);
      
      const [results] = await this.dbPool.execute(query.sql, query.params);

      const report = {
        id: reportId,
        name,
        generated_at: new Date(),
        timeframe,
        metrics,
        filters,
        data: results
      };

      // Cache report for future access
      await this.redisClient.setex(`custom_report_${reportId}`, 86400, JSON.stringify(report));

      this.logger.info('Custom report generated', { reportId, name });

      return { success: true, report };

    } catch (error) {
      this.logger.error('Error generating custom report', { error: error.message });
      throw error;
    }
  }

  // Build custom query for reports
  buildCustomQuery(metrics, filters, timeframe) {
    // This would be a complex query builder
    // For brevity, returning a simple example
    return {
      sql: `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM payments
        WHERE created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      params: [timeframe.start, timeframe.end]
    };
  }
}

module.exports = BusinessIntelligenceSystem;
