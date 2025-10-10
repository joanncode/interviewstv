/**
 * Predictive Analytics System for Interviews.tv
 * Advanced user behavior prediction, churn analysis, and business forecasting
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const tf = require('@tensorflow/tfjs-node');
const { v4: uuidv4 } = require('uuid');

class PredictiveAnalyticsSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.models = {};
    this.featureExtractors = {};
    this.initializeModels();
  }

  async initializeModels() {
    try {
      // Initialize churn prediction model
      this.models.churnPrediction = await this.loadOrCreateChurnModel();
      
      // Initialize engagement prediction model
      this.models.engagementPrediction = await this.loadOrCreateEngagementModel();
      
      // Initialize revenue forecasting model
      this.models.revenueForecast = await this.loadOrCreateRevenueModel();
      
      // Initialize content performance prediction
      this.models.contentPerformance = await this.loadOrCreateContentModel();

      this.logger.info('Predictive analytics models initialized successfully');

    } catch (error) {
      this.logger.error('Error initializing predictive models', { error: error.message });
    }
  }

  // Load or create churn prediction model
  async loadOrCreateChurnModel() {
    try {
      try {
        const model = await tf.loadLayersModel('file://./models/churn-prediction/model.json');
        this.logger.info('Loaded existing churn prediction model');
        return model;
      } catch (loadError) {
        this.logger.info('Creating new churn prediction model');
        return await this.createChurnModel();
      }
    } catch (error) {
      this.logger.error('Error with churn prediction model', { error: error.message });
      return null;
    }
  }

  // Create churn prediction model
  async createChurnModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ 
            inputShape: [20], // 20 features
            units: 64, 
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Binary classification
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating churn model', { error: error.message });
      return null;
    }
  }

  // Load or create engagement prediction model
  async loadOrCreateEngagementModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [15], units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 3, activation: 'softmax' }) // Low, Medium, High engagement
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating engagement model', { error: error.message });
      return null;
    }
  }

  // Load or create revenue forecasting model
  async loadOrCreateRevenueModel() {
    try {
      // LSTM model for time series forecasting
      const model = tf.sequential({
        layers: [
          tf.layers.lstm({ 
            units: 50, 
            returnSequences: true, 
            inputShape: [30, 5] // 30 days, 5 features
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({ units: 50, returnSequences: false }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 25, activation: 'relu' }),
          tf.layers.dense({ units: 1 }) // Revenue prediction
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating revenue model', { error: error.message });
      return null;
    }
  }

  // Load or create content performance model
  async loadOrCreateContentModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [25], units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' }) // View count prediction
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating content model', { error: error.message });
      return null;
    }
  }

  // Predict user churn probability
  async predictUserChurn(userId) {
    try {
      if (!this.models.churnPrediction) {
        return { probability: 0.5, risk_level: 'unknown' };
      }

      // Extract user features
      const features = await this.extractChurnFeatures(userId);
      if (!features) {
        return { probability: 0.5, risk_level: 'unknown' };
      }

      // Normalize features
      const normalizedFeatures = this.normalizeFeatures(features, 'churn');

      // Make prediction
      const inputTensor = tf.tensor2d([normalizedFeatures], [1, normalizedFeatures.length]);
      const prediction = this.models.churnPrediction.predict(inputTensor);
      const probability = await prediction.data();

      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();

      const churnProbability = probability[0];
      const riskLevel = this.getRiskLevel(churnProbability);

      // Store prediction for tracking
      await this.storePrediction(userId, 'churn', churnProbability, features);

      return {
        probability: churnProbability,
        risk_level: riskLevel,
        features_used: Object.keys(features),
        prediction_date: new Date()
      };

    } catch (error) {
      this.logger.error('Error predicting user churn', { error: error.message });
      return { probability: 0.5, risk_level: 'unknown' };
    }
  }

  // Extract features for churn prediction
  async extractChurnFeatures(userId) {
    try {
      const features = {};

      // Get user basic info
      const [users] = await this.dbPool.execute(`
        SELECT 
          DATEDIFF(NOW(), created_at) as days_since_signup,
          DATEDIFF(NOW(), last_login) as days_since_last_login,
          subscription_tier,
          CASE WHEN subscription_tier != 'free' THEN 1 ELSE 0 END as is_premium
        FROM users 
        WHERE id = ?
      `, [userId]);

      if (users.length === 0) return null;

      const user = users[0];
      features.days_since_signup = user.days_since_signup;
      features.days_since_last_login = user.days_since_last_login;
      features.is_premium = user.is_premium;

      // Get activity metrics (last 30 days)
      const [activity] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as total_sessions,
          AVG(session_duration) as avg_session_duration,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          SUM(CASE WHEN action_type = 'view' THEN 1 ELSE 0 END) as views,
          SUM(CASE WHEN action_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN action_type = 'comment' THEN 1 ELSE 0 END) as comments,
          SUM(CASE WHEN action_type = 'share' THEN 1 ELSE 0 END) as shares
        FROM user_interactions 
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [userId]);

      const activityData = activity[0];
      features.total_sessions = activityData.total_sessions || 0;
      features.avg_session_duration = activityData.avg_session_duration || 0;
      features.active_days = activityData.active_days || 0;
      features.views = activityData.views || 0;
      features.likes = activityData.likes || 0;
      features.comments = activityData.comments || 0;
      features.shares = activityData.shares || 0;

      // Get support ticket metrics
      const [support] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as support_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets
        FROM support_tickets 
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      `, [userId]);

      const supportData = support[0];
      features.support_tickets = supportData.support_tickets || 0;
      features.resolved_tickets = supportData.resolved_tickets || 0;

      // Get payment history
      const [payments] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_spent,
          DATEDIFF(NOW(), MAX(created_at)) as days_since_last_payment
        FROM payments 
        WHERE user_id = ? AND status = 'completed'
      `, [userId]);

      const paymentData = payments[0];
      features.total_payments = paymentData.total_payments || 0;
      features.total_spent = paymentData.total_spent || 0;
      features.days_since_last_payment = paymentData.days_since_last_payment || 999;

      // Calculate derived features
      features.engagement_score = this.calculateEngagementScore(features);
      features.activity_trend = await this.calculateActivityTrend(userId);
      features.session_frequency = features.total_sessions / Math.max(features.active_days, 1);
      features.interaction_rate = (features.likes + features.comments + features.shares) / Math.max(features.views, 1);

      return features;

    } catch (error) {
      this.logger.error('Error extracting churn features', { error: error.message });
      return null;
    }
  }

  // Calculate engagement score
  calculateEngagementScore(features) {
    const weights = {
      views: 0.3,
      likes: 0.25,
      comments: 0.25,
      shares: 0.2
    };

    const maxValues = {
      views: 100,
      likes: 50,
      comments: 20,
      shares: 10
    };

    let score = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      const normalizedValue = Math.min(features[metric] / maxValues[metric], 1);
      score += normalizedValue * weight;
    }

    return score;
  }

  // Calculate activity trend
  async calculateActivityTrend(userId) {
    try {
      const [weeklyActivity] = await this.dbPool.execute(`
        SELECT 
          WEEK(created_at) as week,
          COUNT(*) as activity_count
        FROM user_interactions 
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 4 WEEK)
        GROUP BY WEEK(created_at)
        ORDER BY week
      `, [userId]);

      if (weeklyActivity.length < 2) return 0;

      // Calculate trend (simple linear regression slope)
      const n = weeklyActivity.length;
      const sumX = weeklyActivity.reduce((sum, item, index) => sum + index, 0);
      const sumY = weeklyActivity.reduce((sum, item) => sum + item.activity_count, 0);
      const sumXY = weeklyActivity.reduce((sum, item, index) => sum + index * item.activity_count, 0);
      const sumX2 = weeklyActivity.reduce((sum, item, index) => sum + index * index, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return slope;

    } catch (error) {
      this.logger.error('Error calculating activity trend', { error: error.message });
      return 0;
    }
  }

  // Predict user engagement level
  async predictUserEngagement(userId) {
    try {
      if (!this.models.engagementPrediction) {
        return { level: 'medium', probability: 0.33 };
      }

      const features = await this.extractEngagementFeatures(userId);
      if (!features) {
        return { level: 'medium', probability: 0.33 };
      }

      const normalizedFeatures = this.normalizeFeatures(features, 'engagement');
      const inputTensor = tf.tensor2d([normalizedFeatures], [1, normalizedFeatures.length]);
      const prediction = this.models.engagementPrediction.predict(inputTensor);
      const probabilities = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      const levels = ['low', 'medium', 'high'];
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));

      return {
        level: levels[maxIndex],
        probability: probabilities[maxIndex],
        all_probabilities: {
          low: probabilities[0],
          medium: probabilities[1],
          high: probabilities[2]
        }
      };

    } catch (error) {
      this.logger.error('Error predicting user engagement', { error: error.message });
      return { level: 'medium', probability: 0.33 };
    }
  }

  // Extract features for engagement prediction
  async extractEngagementFeatures(userId) {
    try {
      const features = {};

      // Get recent activity (last 7 days)
      const [recentActivity] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as sessions,
          AVG(session_duration) as avg_duration,
          SUM(CASE WHEN action_type = 'view' THEN 1 ELSE 0 END) as views,
          SUM(CASE WHEN action_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN action_type = 'comment' THEN 1 ELSE 0 END) as comments,
          SUM(CASE WHEN action_type = 'share' THEN 1 ELSE 0 END) as shares
        FROM user_interactions 
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [userId]);

      const activity = recentActivity[0];
      features.recent_sessions = activity.sessions || 0;
      features.recent_avg_duration = activity.avg_duration || 0;
      features.recent_views = activity.views || 0;
      features.recent_likes = activity.likes || 0;
      features.recent_comments = activity.comments || 0;
      features.recent_shares = activity.shares || 0;

      // Get user profile strength
      const [profile] = await this.dbPool.execute(`
        SELECT 
          CASE WHEN avatar IS NOT NULL THEN 1 ELSE 0 END as has_avatar,
          CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 50 THEN 1 ELSE 0 END as has_bio,
          CASE WHEN interests IS NOT NULL THEN 1 ELSE 0 END as has_interests,
          subscription_tier
        FROM users 
        WHERE id = ?
      `, [userId]);

      const profileData = profile[0];
      features.has_avatar = profileData.has_avatar;
      features.has_bio = profileData.has_bio;
      features.has_interests = profileData.has_interests;
      features.is_premium = profileData.subscription_tier !== 'free' ? 1 : 0;

      // Calculate derived features
      features.interaction_rate = (features.recent_likes + features.recent_comments + features.recent_shares) / 
                                 Math.max(features.recent_views, 1);
      features.profile_completeness = (features.has_avatar + features.has_bio + features.has_interests) / 3;
      features.daily_activity = features.recent_sessions / 7;

      return features;

    } catch (error) {
      this.logger.error('Error extracting engagement features', { error: error.message });
      return null;
    }
  }

  // Predict content performance
  async predictContentPerformance(contentData) {
    try {
      if (!this.models.contentPerformance) {
        return { predicted_views: 1000, confidence: 0.5 };
      }

      const features = await this.extractContentFeatures(contentData);
      if (!features) {
        return { predicted_views: 1000, confidence: 0.5 };
      }

      const normalizedFeatures = this.normalizeFeatures(features, 'content');
      const inputTensor = tf.tensor2d([normalizedFeatures], [1, normalizedFeatures.length]);
      const prediction = this.models.contentPerformance.predict(inputTensor);
      const predictedViews = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      return {
        predicted_views: Math.max(0, predictedViews[0]),
        confidence: this.calculatePredictionConfidence(features),
        factors: this.identifyPerformanceFactors(features)
      };

    } catch (error) {
      this.logger.error('Error predicting content performance', { error: error.message });
      return { predicted_views: 1000, confidence: 0.5 };
    }
  }

  // Extract features for content performance prediction
  async extractContentFeatures(contentData) {
    try {
      const features = {};

      // Basic content features
      features.title_length = contentData.title ? contentData.title.length : 0;
      features.description_length = contentData.description ? contentData.description.length : 0;
      features.duration = contentData.duration || 0;
      features.has_thumbnail = contentData.thumbnail ? 1 : 0;

      // Creator features
      const [creator] = await this.dbPool.execute(`
        SELECT 
          follower_count,
          DATEDIFF(NOW(), created_at) as creator_age_days,
          (SELECT COUNT(*) FROM interviews WHERE creator_id = ?) as total_content,
          (SELECT AVG(view_count) FROM interviews WHERE creator_id = ?) as avg_views
        FROM users 
        WHERE id = ?
      `, [contentData.creator_id, contentData.creator_id, contentData.creator_id]);

      if (creator.length > 0) {
        const creatorData = creator[0];
        features.creator_followers = creatorData.follower_count || 0;
        features.creator_age = creatorData.creator_age_days || 0;
        features.creator_content_count = creatorData.total_content || 0;
        features.creator_avg_views = creatorData.avg_views || 0;
      }

      // Category features
      const [categoryStats] = await this.dbPool.execute(`
        SELECT 
          AVG(view_count) as category_avg_views,
          COUNT(*) as category_content_count
        FROM interviews 
        WHERE category = ?
      `, [contentData.category]);

      if (categoryStats.length > 0) {
        features.category_avg_views = categoryStats[0].category_avg_views || 0;
        features.category_popularity = categoryStats[0].category_content_count || 0;
      }

      // Timing features
      const publishTime = new Date(contentData.publish_time || Date.now());
      features.publish_hour = publishTime.getHours();
      features.publish_day = publishTime.getDay(); // 0 = Sunday
      features.is_weekend = features.publish_day === 0 || features.publish_day === 6 ? 1 : 0;

      // Tag features
      if (contentData.tags) {
        const tags = Array.isArray(contentData.tags) ? contentData.tags : JSON.parse(contentData.tags);
        features.tag_count = tags.length;
        features.has_trending_tags = await this.hasTrendingTags(tags) ? 1 : 0;
      }

      return features;

    } catch (error) {
      this.logger.error('Error extracting content features', { error: error.message });
      return null;
    }
  }

  // Check if content has trending tags
  async hasTrendingTags(tags) {
    try {
      const [trendingTags] = await this.dbPool.execute(`
        SELECT tag_name 
        FROM trending_tags 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      const trending = trendingTags.map(t => t.tag_name);
      return tags.some(tag => trending.includes(tag));

    } catch (error) {
      return false;
    }
  }

  // Normalize features for model input
  normalizeFeatures(features, modelType) {
    const featureArray = Object.values(features);
    
    // Simple min-max normalization
    // In production, use proper feature scaling based on training data statistics
    return featureArray.map(value => {
      if (typeof value !== 'number') return 0;
      return Math.max(0, Math.min(1, value / 1000)); // Simple normalization
    });
  }

  // Get risk level from churn probability
  getRiskLevel(probability) {
    if (probability < 0.3) return 'low';
    if (probability < 0.7) return 'medium';
    return 'high';
  }

  // Store prediction for tracking and analysis
  async storePrediction(userId, predictionType, value, features) {
    try {
      const predictionId = uuidv4();
      
      await this.dbPool.execute(`
        INSERT INTO prediction_logs (
          id, user_id, prediction_type, predicted_value, 
          features_used, model_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        predictionId, userId, predictionType, value,
        JSON.stringify(features), '1.0'
      ]);

    } catch (error) {
      this.logger.error('Error storing prediction', { error: error.message });
    }
  }

  // Calculate prediction confidence
  calculatePredictionConfidence(features) {
    // Simple confidence calculation based on feature completeness
    const totalFeatures = Object.keys(features).length;
    const nonZeroFeatures = Object.values(features).filter(v => v > 0).length;
    return nonZeroFeatures / totalFeatures;
  }

  // Identify key performance factors
  identifyPerformanceFactors(features) {
    const factors = [];
    
    if (features.creator_followers > 1000) {
      factors.push('Popular creator');
    }
    
    if (features.category_avg_views > 5000) {
      factors.push('Popular category');
    }
    
    if (features.has_trending_tags) {
      factors.push('Trending tags');
    }
    
    if (features.title_length >= 30 && features.title_length <= 60) {
      factors.push('Optimal title length');
    }

    return factors;
  }

  // Generate business forecasts
  async generateBusinessForecasts(timeframe = 30) {
    try {
      const forecasts = {};

      // User growth forecast
      forecasts.user_growth = await this.forecastUserGrowth(timeframe);
      
      // Revenue forecast
      forecasts.revenue = await this.forecastRevenue(timeframe);
      
      // Engagement forecast
      forecasts.engagement = await this.forecastEngagement(timeframe);
      
      // Content performance forecast
      forecasts.content_performance = await this.forecastContentPerformance(timeframe);

      return {
        success: true,
        timeframe_days: timeframe,
        forecasts: forecasts,
        generated_at: new Date()
      };

    } catch (error) {
      this.logger.error('Error generating business forecasts', { error: error.message });
      throw error;
    }
  }

  // Forecast user growth
  async forecastUserGrowth(days) {
    try {
      // Get historical user growth data
      const [growthData] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // Simple linear trend extrapolation
      const recentGrowth = growthData.slice(-30);
      const avgDailyGrowth = recentGrowth.reduce((sum, day) => sum + day.new_users, 0) / recentGrowth.length;
      
      const forecast = [];
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          predicted_new_users: Math.round(avgDailyGrowth * (1 + Math.random() * 0.2 - 0.1)) // Add some variance
        });
      }

      return forecast;

    } catch (error) {
      this.logger.error('Error forecasting user growth', { error: error.message });
      return [];
    }
  }

  // Forecast revenue
  async forecastRevenue(days) {
    try {
      const [revenueData] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as daily_revenue
        FROM payments 
        WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      const recentRevenue = revenueData.slice(-30);
      const avgDailyRevenue = recentRevenue.reduce((sum, day) => sum + day.daily_revenue, 0) / recentRevenue.length;
      
      const forecast = [];
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        // Add seasonal factors (weekends typically lower)
        const dayOfWeek = date.getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          predicted_revenue: Math.round(avgDailyRevenue * weekendFactor * (1 + Math.random() * 0.3 - 0.15))
        });
      }

      return forecast;

    } catch (error) {
      this.logger.error('Error forecasting revenue', { error: error.message });
      return [];
    }
  }

  // Forecast engagement
  async forecastEngagement(days) {
    try {
      const [engagementData] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as daily_interactions
        FROM user_interactions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      const recentEngagement = engagementData.slice(-30);
      const avgDailyEngagement = recentEngagement.reduce((sum, day) => sum + day.daily_interactions, 0) / recentEngagement.length;
      
      const forecast = [];
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          predicted_interactions: Math.round(avgDailyEngagement * (1 + Math.random() * 0.25 - 0.125))
        });
      }

      return forecast;

    } catch (error) {
      this.logger.error('Error forecasting engagement', { error: error.message });
      return [];
    }
  }

  // Forecast content performance
  async forecastContentPerformance(days) {
    try {
      const [contentData] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_content,
          AVG(view_count) as avg_views
        FROM interviews 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      const recentContent = contentData.slice(-30);
      const avgDailyContent = recentContent.reduce((sum, day) => sum + day.new_content, 0) / recentContent.length;
      const avgViewsPerContent = recentContent.reduce((sum, day) => sum + (day.avg_views || 0), 0) / recentContent.length;
      
      const forecast = [];
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          predicted_new_content: Math.round(avgDailyContent * (1 + Math.random() * 0.2 - 0.1)),
          predicted_avg_views: Math.round(avgViewsPerContent * (1 + Math.random() * 0.3 - 0.15))
        });
      }

      return forecast;

    } catch (error) {
      this.logger.error('Error forecasting content performance', { error: error.message });
      return [];
    }
  }
}

module.exports = PredictiveAnalyticsSystem;
