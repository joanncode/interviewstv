/**
 * User Acquisition & Marketing Campaign System for Interviews.tv
 * Advanced campaign management, A/B testing, and conversion optimization
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

class UserAcquisitionSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.emailTransporter = this.initializeEmailTransporter();
    this.campaignTypes = this.initializeCampaignTypes();
    this.acquisitionChannels = this.initializeAcquisitionChannels();
    this.conversionFunnels = this.initializeConversionFunnels();
  }

  initializeEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.MARKETING_EMAIL,
        pass: process.env.MARKETING_EMAIL_PASSWORD
      }
    });
  }

  initializeCampaignTypes() {
    return {
      'email_marketing': {
        name: 'Email Marketing',
        description: 'Targeted email campaigns to prospects and users',
        channels: ['email'],
        metrics: ['open_rate', 'click_rate', 'conversion_rate']
      },
      'social_media': {
        name: 'Social Media Marketing',
        description: 'Campaigns across social media platforms',
        channels: ['facebook', 'twitter', 'linkedin', 'instagram'],
        metrics: ['impressions', 'engagement_rate', 'click_rate', 'conversion_rate']
      },
      'content_marketing': {
        name: 'Content Marketing',
        description: 'Blog posts, videos, and educational content',
        channels: ['blog', 'youtube', 'podcast'],
        metrics: ['views', 'engagement_time', 'shares', 'conversion_rate']
      },
      'paid_advertising': {
        name: 'Paid Advertising',
        description: 'Google Ads, Facebook Ads, and other paid channels',
        channels: ['google_ads', 'facebook_ads', 'linkedin_ads'],
        metrics: ['impressions', 'clicks', 'cpc', 'conversion_rate', 'roas']
      },
      'referral_program': {
        name: 'Referral Program',
        description: 'User referral and affiliate marketing',
        channels: ['referral', 'affiliate'],
        metrics: ['referrals', 'conversion_rate', 'lifetime_value']
      },
      'influencer_marketing': {
        name: 'Influencer Marketing',
        description: 'Partnerships with industry influencers',
        channels: ['influencer'],
        metrics: ['reach', 'engagement_rate', 'conversion_rate']
      }
    };
  }

  initializeAcquisitionChannels() {
    return {
      'organic_search': {
        name: 'Organic Search',
        cost_per_acquisition: 15,
        conversion_rate: 0.08,
        lifetime_value: 180
      },
      'paid_search': {
        name: 'Paid Search',
        cost_per_acquisition: 35,
        conversion_rate: 0.12,
        lifetime_value: 160
      },
      'social_media': {
        name: 'Social Media',
        cost_per_acquisition: 25,
        conversion_rate: 0.06,
        lifetime_value: 140
      },
      'email_marketing': {
        name: 'Email Marketing',
        cost_per_acquisition: 8,
        conversion_rate: 0.15,
        lifetime_value: 200
      },
      'referral': {
        name: 'Referral',
        cost_per_acquisition: 12,
        conversion_rate: 0.25,
        lifetime_value: 220
      },
      'content_marketing': {
        name: 'Content Marketing',
        cost_per_acquisition: 20,
        conversion_rate: 0.10,
        lifetime_value: 190
      },
      'influencer': {
        name: 'Influencer Marketing',
        cost_per_acquisition: 45,
        conversion_rate: 0.18,
        lifetime_value: 170
      },
      'direct': {
        name: 'Direct Traffic',
        cost_per_acquisition: 5,
        conversion_rate: 0.20,
        lifetime_value: 250
      }
    };
  }

  initializeConversionFunnels() {
    return {
      'creator_onboarding': {
        name: 'Creator Onboarding Funnel',
        stages: [
          { name: 'landing_page_visit', conversion_rate: 1.0 },
          { name: 'signup_form_view', conversion_rate: 0.35 },
          { name: 'account_creation', conversion_rate: 0.60 },
          { name: 'profile_completion', conversion_rate: 0.80 },
          { name: 'first_interview_creation', conversion_rate: 0.45 },
          { name: 'subscription_upgrade', conversion_rate: 0.25 }
        ]
      },
      'viewer_engagement': {
        name: 'Viewer Engagement Funnel',
        stages: [
          { name: 'homepage_visit', conversion_rate: 1.0 },
          { name: 'interview_view', conversion_rate: 0.45 },
          { name: 'account_signup', conversion_rate: 0.15 },
          { name: 'profile_completion', conversion_rate: 0.70 },
          { name: 'subscription_purchase', conversion_rate: 0.12 }
        ]
      },
      'business_acquisition': {
        name: 'Business Customer Funnel',
        stages: [
          { name: 'business_page_visit', conversion_rate: 1.0 },
          { name: 'demo_request', conversion_rate: 0.08 },
          { name: 'demo_completion', conversion_rate: 0.75 },
          { name: 'trial_signup', conversion_rate: 0.60 },
          { name: 'paid_subscription', conversion_rate: 0.40 }
        ]
      }
    };
  }

  // Create marketing campaign
  async createCampaign(campaignData) {
    try {
      const campaignId = uuidv4();
      const {
        name, type, description, target_audience, budget,
        start_date, end_date, channels, goals, creative_assets
      } = campaignData;

      await this.dbPool.execute(`
        INSERT INTO marketing_campaigns (
          id, name, type, description, target_audience, budget,
          start_date, end_date, channels, goals, creative_assets,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW(), NOW())
      `, [
        campaignId, name, type, description, JSON.stringify(target_audience),
        budget, start_date, end_date, JSON.stringify(channels),
        JSON.stringify(goals), JSON.stringify(creative_assets)
      ]);

      // Initialize campaign tracking
      await this.initializeCampaignTracking(campaignId);

      this.logger.info('Marketing campaign created', {
        campaignId, name, type, budget
      });

      return { success: true, campaignId };

    } catch (error) {
      this.logger.error('Error creating campaign', { error: error.message });
      throw error;
    }
  }

  // Initialize campaign tracking
  async initializeCampaignTracking(campaignId) {
    try {
      const trackingCode = `utm_campaign=${campaignId}&utm_source=interviews_tv`;
      
      await this.dbPool.execute(`
        INSERT INTO campaign_tracking (
          campaign_id, tracking_code, impressions, clicks, conversions,
          cost, revenue, created_at
        ) VALUES (?, ?, 0, 0, 0, 0, 0, NOW())
      `, [campaignId, trackingCode]);

    } catch (error) {
      this.logger.error('Error initializing campaign tracking', { error: error.message });
    }
  }

  // Track user acquisition
  async trackUserAcquisition(userId, acquisitionData) {
    try {
      const {
        source, medium, campaign, content, term,
        referrer, landing_page, user_agent, ip_address
      } = acquisitionData;

      await this.dbPool.execute(`
        INSERT INTO user_acquisition (
          user_id, source, medium, campaign, content, term,
          referrer, landing_page, user_agent, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId, source, medium, campaign, content, term,
        referrer, landing_page, user_agent, ip_address
      ]);

      // Update campaign metrics if applicable
      if (campaign) {
        await this.updateCampaignMetrics(campaign, 'conversion');
      }

      // Calculate acquisition cost
      const acquisitionCost = this.calculateAcquisitionCost(source, medium);
      
      await this.dbPool.execute(`
        UPDATE user_acquisition 
        SET acquisition_cost = ?
        WHERE user_id = ?
      `, [acquisitionCost, userId]);

      this.logger.info('User acquisition tracked', {
        userId, source, medium, campaign, acquisitionCost
      });

    } catch (error) {
      this.logger.error('Error tracking user acquisition', { error: error.message });
    }
  }

  // Calculate acquisition cost
  calculateAcquisitionCost(source, medium) {
    const channelKey = `${source}_${medium}`.toLowerCase();
    const channel = this.acquisitionChannels[channelKey] || this.acquisitionChannels[source];
    
    return channel ? channel.cost_per_acquisition : 25; // Default cost
  }

  // Track conversion funnel
  async trackFunnelStep(userId, funnelType, step, metadata = {}) {
    try {
      await this.dbPool.execute(`
        INSERT INTO funnel_tracking (
          user_id, funnel_type, step, metadata, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [userId, funnelType, step, JSON.stringify(metadata)]);

      // Update funnel analytics
      await this.updateFunnelAnalytics(funnelType, step);

      this.logger.info('Funnel step tracked', {
        userId, funnelType, step
      });

    } catch (error) {
      this.logger.error('Error tracking funnel step', { error: error.message });
    }
  }

  // Update funnel analytics
  async updateFunnelAnalytics(funnelType, step) {
    try {
      const cacheKey = `funnel_analytics_${funnelType}`;
      
      // Get current analytics
      let analytics = await this.redisClient.get(cacheKey);
      analytics = analytics ? JSON.parse(analytics) : {};

      // Update step count
      if (!analytics[step]) {
        analytics[step] = 0;
      }
      analytics[step]++;

      // Cache updated analytics
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(analytics));

    } catch (error) {
      this.logger.error('Error updating funnel analytics', { error: error.message });
    }
  }

  // Run A/B test
  async runABTest(testConfig) {
    try {
      const testId = uuidv4();
      const {
        name, description, variants, traffic_split,
        success_metric, duration_days
      } = testConfig;

      await this.dbPool.execute(`
        INSERT INTO ab_tests (
          id, name, description, variants, traffic_split,
          success_metric, duration_days, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
      `, [
        testId, name, description, JSON.stringify(variants),
        JSON.stringify(traffic_split), success_metric, duration_days
      ]);

      // Initialize variant tracking
      for (const variant of variants) {
        await this.dbPool.execute(`
          INSERT INTO ab_test_results (
            test_id, variant_id, impressions, conversions,
            conversion_rate, statistical_significance, created_at
          ) VALUES (?, ?, 0, 0, 0, 0, NOW())
        `, [testId, variant.id]);
      }

      this.logger.info('A/B test created', { testId, name });

      return { success: true, testId };

    } catch (error) {
      this.logger.error('Error creating A/B test', { error: error.message });
      throw error;
    }
  }

  // Assign user to A/B test variant
  async assignABTestVariant(userId, testId) {
    try {
      // Get test configuration
      const [tests] = await this.dbPool.execute(`
        SELECT variants, traffic_split FROM ab_tests WHERE id = ? AND status = 'active'
      `, [testId]);

      if (tests.length === 0) {
        return null;
      }

      const test = tests[0];
      const variants = JSON.parse(test.variants);
      const trafficSplit = JSON.parse(test.traffic_split);

      // Determine variant based on user ID hash
      const userHash = this.hashUserId(userId);
      let cumulativeWeight = 0;
      let assignedVariant = null;

      for (let i = 0; i < variants.length; i++) {
        cumulativeWeight += trafficSplit[i];
        if (userHash <= cumulativeWeight) {
          assignedVariant = variants[i];
          break;
        }
      }

      if (assignedVariant) {
        // Record assignment
        await this.dbPool.execute(`
          INSERT INTO ab_test_assignments (
            test_id, user_id, variant_id, created_at
          ) VALUES (?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE variant_id = VALUES(variant_id)
        `, [testId, userId, assignedVariant.id]);

        // Update impressions
        await this.dbPool.execute(`
          UPDATE ab_test_results 
          SET impressions = impressions + 1
          WHERE test_id = ? AND variant_id = ?
        `, [testId, assignedVariant.id]);
      }

      return assignedVariant;

    } catch (error) {
      this.logger.error('Error assigning A/B test variant', { error: error.message });
      return null;
    }
  }

  // Hash user ID for consistent variant assignment
  hashUserId(userId) {
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100; // Return 0-99
  }

  // Track A/B test conversion
  async trackABTestConversion(userId, testId, conversionValue = 1) {
    try {
      // Get user's variant assignment
      const [assignments] = await this.dbPool.execute(`
        SELECT variant_id FROM ab_test_assignments
        WHERE test_id = ? AND user_id = ?
      `, [testId, userId]);

      if (assignments.length === 0) {
        return;
      }

      const variantId = assignments[0].variant_id;

      // Record conversion
      await this.dbPool.execute(`
        INSERT INTO ab_test_conversions (
          test_id, user_id, variant_id, conversion_value, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [testId, userId, variantId, conversionValue]);

      // Update conversion metrics
      await this.dbPool.execute(`
        UPDATE ab_test_results 
        SET conversions = conversions + 1,
            conversion_rate = (conversions + 1) / impressions * 100
        WHERE test_id = ? AND variant_id = ?
      `, [testId, variantId]);

      this.logger.info('A/B test conversion tracked', {
        userId, testId, variantId, conversionValue
      });

    } catch (error) {
      this.logger.error('Error tracking A/B test conversion', { error: error.message });
    }
  }

  // Get campaign performance
  async getCampaignPerformance(campaignId, timeframe = '30d') {
    try {
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
      }

      // Get campaign metrics
      const [campaignMetrics] = await this.dbPool.execute(`
        SELECT 
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(conversions) as total_conversions,
          SUM(cost) as total_cost,
          SUM(revenue) as total_revenue,
          AVG(clicks / NULLIF(impressions, 0) * 100) as avg_ctr,
          AVG(conversions / NULLIF(clicks, 0) * 100) as avg_conversion_rate,
          AVG(revenue / NULLIF(cost, 0)) as avg_roas
        FROM campaign_tracking
        WHERE campaign_id = ? AND created_at BETWEEN ? AND ?
      `, [campaignId, startDate, endDate]);

      // Get daily performance trend
      const [dailyTrend] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(cost) as cost,
          SUM(revenue) as revenue
        FROM campaign_tracking
        WHERE campaign_id = ? AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [campaignId, startDate, endDate]);

      // Get acquisition breakdown
      const [acquisitionBreakdown] = await this.dbPool.execute(`
        SELECT 
          source,
          medium,
          COUNT(*) as users,
          AVG(acquisition_cost) as avg_cost
        FROM user_acquisition
        WHERE campaign = ? AND created_at BETWEEN ? AND ?
        GROUP BY source, medium
        ORDER BY users DESC
      `, [campaignId, startDate, endDate]);

      return {
        success: true,
        performance: {
          overview: campaignMetrics[0],
          daily_trend: dailyTrend,
          acquisition_breakdown: acquisitionBreakdown
        }
      };

    } catch (error) {
      this.logger.error('Error getting campaign performance', { error: error.message });
      throw error;
    }
  }

  // Send marketing email
  async sendMarketingEmail(emailData) {
    try {
      const { to, subject, template, data, campaignId } = emailData;

      const mailOptions = {
        from: process.env.MARKETING_EMAIL,
        to: to,
        subject: subject,
        html: this.renderEmailTemplate(template, data)
      };

      await this.emailTransporter.sendMail(mailOptions);

      // Track email sent
      if (campaignId) {
        await this.trackEmailSent(campaignId, to);
      }

      this.logger.info('Marketing email sent', { to, subject, campaignId });

      return { success: true };

    } catch (error) {
      this.logger.error('Error sending marketing email', { error: error.message });
      throw error;
    }
  }

  // Render email template
  renderEmailTemplate(template, data) {
    // Simple template rendering - in production, use a proper template engine
    let html = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), value);
    }

    return html;
  }

  // Track email sent
  async trackEmailSent(campaignId, recipient) {
    try {
      await this.dbPool.execute(`
        INSERT INTO email_tracking (
          campaign_id, recipient, status, sent_at
        ) VALUES (?, ?, 'sent', NOW())
      `, [campaignId, recipient]);

    } catch (error) {
      this.logger.error('Error tracking email sent', { error: error.message });
    }
  }

  // Get acquisition analytics
  async getAcquisitionAnalytics(timeframe = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeframe));

      // Channel performance
      const [channelPerformance] = await this.dbPool.execute(`
        SELECT 
          source,
          COUNT(*) as users,
          AVG(acquisition_cost) as avg_cost,
          COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) as conversions,
          COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) / COUNT(*) * 100 as conversion_rate
        FROM user_acquisition ua
        LEFT JOIN users u ON ua.user_id = u.id
        WHERE ua.created_at BETWEEN ? AND ?
        GROUP BY source
        ORDER BY users DESC
      `, [startDate, endDate]);

      // Cost efficiency
      const [costEfficiency] = await this.dbPool.execute(`
        SELECT 
          source,
          SUM(acquisition_cost) as total_cost,
          COUNT(*) as total_users,
          SUM(acquisition_cost) / COUNT(*) as cost_per_user,
          COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) as paying_users,
          SUM(acquisition_cost) / NULLIF(COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END), 0) as cost_per_conversion
        FROM user_acquisition ua
        LEFT JOIN users u ON ua.user_id = u.id
        WHERE ua.created_at BETWEEN ? AND ?
        GROUP BY source
        ORDER BY cost_per_conversion ASC
      `, [startDate, endDate]);

      return {
        success: true,
        analytics: {
          channel_performance: channelPerformance,
          cost_efficiency: costEfficiency
        }
      };

    } catch (error) {
      this.logger.error('Error getting acquisition analytics', { error: error.message });
      throw error;
    }
  }
}

module.exports = UserAcquisitionSystem;
