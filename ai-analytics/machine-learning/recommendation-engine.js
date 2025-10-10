/**
 * Advanced AI Recommendation Engine for Interviews.tv
 * Machine learning-powered content recommendations and user matching
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const { v4: uuidv4 } = require('uuid');

class RecommendationEngine {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.models = {};
    this.vectorizer = new natural.TfIdf();
    this.userProfiles = new Map();
    this.contentFeatures = new Map();
    this.initializeModels();
  }

  async initializeModels() {
    try {
      // Initialize collaborative filtering model
      this.models.collaborative = await this.loadOrCreateCollaborativeModel();
      
      // Initialize content-based model
      this.models.contentBased = await this.loadOrCreateContentModel();
      
      // Initialize hybrid model
      this.models.hybrid = await this.loadOrCreateHybridModel();

      this.logger.info('Recommendation models initialized successfully');

    } catch (error) {
      this.logger.error('Error initializing recommendation models', { error: error.message });
    }
  }

  // Load or create collaborative filtering model
  async loadOrCreateCollaborativeModel() {
    try {
      // Try to load existing model
      try {
        const model = await tf.loadLayersModel('file://./models/collaborative-filtering/model.json');
        this.logger.info('Loaded existing collaborative filtering model');
        return model;
      } catch (loadError) {
        this.logger.info('Creating new collaborative filtering model');
        return await this.createCollaborativeModel();
      }
    } catch (error) {
      this.logger.error('Error with collaborative filtering model', { error: error.message });
      return null;
    }
  }

  // Create collaborative filtering model
  async createCollaborativeModel() {
    try {
      // Neural collaborative filtering architecture
      const userInput = tf.input({ shape: [1], name: 'user_input' });
      const itemInput = tf.input({ shape: [1], name: 'item_input' });

      // Embedding layers
      const userEmbedding = tf.layers.embedding({
        inputDim: 10000, // Max users
        outputDim: 64,
        name: 'user_embedding'
      }).apply(userInput);

      const itemEmbedding = tf.layers.embedding({
        inputDim: 50000, // Max items
        outputDim: 64,
        name: 'item_embedding'
      }).apply(itemInput);

      // Flatten embeddings
      const userFlat = tf.layers.flatten().apply(userEmbedding);
      const itemFlat = tf.layers.flatten().apply(itemEmbedding);

      // Concatenate user and item embeddings
      const concat = tf.layers.concatenate().apply([userFlat, itemFlat]);

      // Dense layers
      let dense = tf.layers.dense({ units: 128, activation: 'relu' }).apply(concat);
      dense = tf.layers.dropout({ rate: 0.2 }).apply(dense);
      dense = tf.layers.dense({ units: 64, activation: 'relu' }).apply(dense);
      dense = tf.layers.dropout({ rate: 0.2 }).apply(dense);
      
      // Output layer (rating prediction)
      const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense);

      const model = tf.model({ inputs: [userInput, itemInput], outputs: output });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating collaborative model', { error: error.message });
      return null;
    }
  }

  // Load or create content-based model
  async loadOrCreateContentModel() {
    try {
      // Content-based model using TF-IDF and neural networks
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 256, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 128, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating content-based model', { error: error.message });
      return null;
    }
  }

  // Load or create hybrid model
  async loadOrCreateHybridModel() {
    try {
      // Hybrid model combining collaborative and content-based approaches
      const collaborativeInput = tf.input({ shape: [1], name: 'collaborative_score' });
      const contentInput = tf.input({ shape: [1], name: 'content_score' });
      const contextInput = tf.input({ shape: [10], name: 'context_features' });

      // Combine all inputs
      const combined = tf.layers.concatenate().apply([
        collaborativeInput, 
        contentInput, 
        contextInput
      ]);

      // Dense layers for final prediction
      let dense = tf.layers.dense({ units: 64, activation: 'relu' }).apply(combined);
      dense = tf.layers.dropout({ rate: 0.2 }).apply(dense);
      dense = tf.layers.dense({ units: 32, activation: 'relu' }).apply(dense);
      
      const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense);

      const model = tf.model({ 
        inputs: [collaborativeInput, contentInput, contextInput], 
        outputs: output 
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      return model;

    } catch (error) {
      this.logger.error('Error creating hybrid model', { error: error.message });
      return null;
    }
  }

  // Get personalized recommendations for user
  async getPersonalizedRecommendations(userId, limit = 10, context = {}) {
    try {
      const cacheKey = `recommendations_${userId}_${limit}`;
      
      // Check cache first
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);
      
      // Get candidate items
      const candidates = await this.getCandidateItems(userId, userProfile);

      // Score candidates using hybrid approach
      const scoredCandidates = await this.scoreItems(userId, candidates, userProfile, context);

      // Sort by score and take top recommendations
      const recommendations = scoredCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Add explanation for each recommendation
      const explainedRecommendations = await this.addExplanations(recommendations, userProfile);

      // Cache results for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(explainedRecommendations));

      // Log recommendation request
      await this.logRecommendation(userId, explainedRecommendations.map(r => r.id));

      return explainedRecommendations;

    } catch (error) {
      this.logger.error('Error getting personalized recommendations', { error: error.message });
      return [];
    }
  }

  // Get user profile with preferences and behavior
  async getUserProfile(userId) {
    try {
      // Check cache first
      const cacheKey = `user_profile_${userId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user basic info
      const [users] = await this.dbPool.execute(`
        SELECT id, interests, career_level, industry, subscription_tier
        FROM users WHERE id = ?
      `, [userId]);

      if (users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get viewing history
      const [viewHistory] = await this.dbPool.execute(`
        SELECT interview_id, duration_watched, rating, created_at
        FROM user_interactions
        WHERE user_id = ? AND action_type = 'view'
        ORDER BY created_at DESC
        LIMIT 100
      `, [userId]);

      // Get liked content
      const [likedContent] = await this.dbPool.execute(`
        SELECT interview_id, created_at
        FROM user_interactions
        WHERE user_id = ? AND action_type = 'like'
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      // Calculate preferences
      const preferences = await this.calculateUserPreferences(viewHistory, likedContent);

      const profile = {
        ...user,
        viewing_history: viewHistory,
        liked_content: likedContent,
        preferences: preferences,
        profile_strength: this.calculateProfileStrength(viewHistory, likedContent)
      };

      // Cache profile for 30 minutes
      await this.redisClient.setex(cacheKey, 1800, JSON.stringify(profile));

      return profile;

    } catch (error) {
      this.logger.error('Error getting user profile', { error: error.message });
      return null;
    }
  }

  // Calculate user preferences from behavior
  async calculateUserPreferences(viewHistory, likedContent) {
    try {
      const preferences = {
        categories: {},
        creators: {},
        duration_preference: 'medium',
        recency_preference: 0.7,
        popularity_preference: 0.3
      };

      // Analyze category preferences
      for (const view of viewHistory) {
        const [interviews] = await this.dbPool.execute(`
          SELECT category FROM interviews WHERE id = ?
        `, [view.interview_id]);

        if (interviews.length > 0) {
          const category = interviews[0].category;
          preferences.categories[category] = (preferences.categories[category] || 0) + 1;
        }
      }

      // Analyze creator preferences
      for (const like of likedContent) {
        const [interviews] = await this.dbPool.execute(`
          SELECT creator_id FROM interviews WHERE id = ?
        `, [like.interview_id]);

        if (interviews.length > 0) {
          const creatorId = interviews[0].creator_id;
          preferences.creators[creatorId] = (preferences.creators[creatorId] || 0) + 1;
        }
      }

      // Calculate duration preference
      const avgDuration = viewHistory.reduce((sum, view) => sum + view.duration_watched, 0) / viewHistory.length;
      if (avgDuration < 600) { // 10 minutes
        preferences.duration_preference = 'short';
      } else if (avgDuration > 1800) { // 30 minutes
        preferences.duration_preference = 'long';
      }

      return preferences;

    } catch (error) {
      this.logger.error('Error calculating user preferences', { error: error.message });
      return {};
    }
  }

  // Get candidate items for recommendation
  async getCandidateItems(userId, userProfile) {
    try {
      // Get items user hasn't interacted with
      const [candidates] = await this.dbPool.execute(`
        SELECT i.id, i.title, i.category, i.creator_id, i.duration, 
               i.view_count, i.like_count, i.created_at, i.tags
        FROM interviews i
        WHERE i.status = 'published' 
          AND i.is_public = 1
          AND i.id NOT IN (
            SELECT interview_id FROM user_interactions 
            WHERE user_id = ? AND action_type IN ('view', 'dislike')
          )
        ORDER BY i.created_at DESC
        LIMIT 1000
      `, [userId]);

      return candidates;

    } catch (error) {
      this.logger.error('Error getting candidate items', { error: error.message });
      return [];
    }
  }

  // Score items using hybrid approach
  async scoreItems(userId, candidates, userProfile, context) {
    try {
      const scoredItems = [];

      for (const item of candidates) {
        // Collaborative filtering score
        const collaborativeScore = await this.getCollaborativeScore(userId, item.id);
        
        // Content-based score
        const contentScore = await this.getContentScore(item, userProfile);
        
        // Context score (time, device, etc.)
        const contextScore = this.getContextScore(item, context);
        
        // Popularity score
        const popularityScore = this.getPopularityScore(item);
        
        // Recency score
        const recencyScore = this.getRecencyScore(item);

        // Combine scores with weights
        const finalScore = (
          collaborativeScore * 0.3 +
          contentScore * 0.3 +
          contextScore * 0.2 +
          popularityScore * 0.1 +
          recencyScore * 0.1
        );

        scoredItems.push({
          ...item,
          score: finalScore,
          score_breakdown: {
            collaborative: collaborativeScore,
            content: contentScore,
            context: contextScore,
            popularity: popularityScore,
            recency: recencyScore
          }
        });
      }

      return scoredItems;

    } catch (error) {
      this.logger.error('Error scoring items', { error: error.message });
      return [];
    }
  }

  // Get collaborative filtering score
  async getCollaborativeScore(userId, itemId) {
    try {
      if (!this.models.collaborative) {
        return 0.5; // Default score
      }

      // Prepare input tensors
      const userTensor = tf.tensor2d([[userId]], [1, 1]);
      const itemTensor = tf.tensor2d([[itemId]], [1, 1]);

      // Predict score
      const prediction = this.models.collaborative.predict([userTensor, itemTensor]);
      const score = await prediction.data();

      // Cleanup tensors
      userTensor.dispose();
      itemTensor.dispose();
      prediction.dispose();

      return score[0];

    } catch (error) {
      this.logger.error('Error getting collaborative score', { error: error.message });
      return 0.5;
    }
  }

  // Get content-based score
  async getContentScore(item, userProfile) {
    try {
      let score = 0;

      // Category preference
      if (userProfile.preferences.categories[item.category]) {
        score += 0.4 * (userProfile.preferences.categories[item.category] / 10);
      }

      // Creator preference
      if (userProfile.preferences.creators[item.creator_id]) {
        score += 0.3 * (userProfile.preferences.creators[item.creator_id] / 5);
      }

      // Duration preference
      const durationMatch = this.getDurationMatch(item.duration, userProfile.preferences.duration_preference);
      score += 0.2 * durationMatch;

      // Tag similarity
      const tagSimilarity = await this.getTagSimilarity(item.tags, userProfile);
      score += 0.1 * tagSimilarity;

      return Math.min(score, 1.0);

    } catch (error) {
      this.logger.error('Error getting content score', { error: error.message });
      return 0.5;
    }
  }

  // Get context score based on current context
  getContextScore(item, context) {
    let score = 0.5;

    // Time of day preference
    if (context.timeOfDay) {
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17) { // Business hours
        if (item.category === 'business' || item.category === 'career') {
          score += 0.2;
        }
      } else { // Evening/weekend
        if (item.category === 'personal' || item.category === 'lifestyle') {
          score += 0.2;
        }
      }
    }

    // Device type
    if (context.device === 'mobile' && item.duration < 900) { // 15 minutes
      score += 0.1;
    } else if (context.device === 'desktop' && item.duration > 900) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  // Get popularity score
  getPopularityScore(item) {
    const viewCount = item.view_count || 0;
    const likeCount = item.like_count || 0;
    
    // Normalize scores (assuming max views = 100k, max likes = 10k)
    const viewScore = Math.min(viewCount / 100000, 1.0);
    const likeScore = Math.min(likeCount / 10000, 1.0);
    
    return (viewScore * 0.7 + likeScore * 0.3);
  }

  // Get recency score
  getRecencyScore(item) {
    const now = new Date();
    const itemDate = new Date(item.created_at);
    const daysDiff = (now - itemDate) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: newer content gets higher score
    return Math.exp(-daysDiff / 30); // 30-day half-life
  }

  // Get duration match score
  getDurationMatch(itemDuration, preference) {
    switch (preference) {
      case 'short':
        return itemDuration < 600 ? 1.0 : Math.max(0, 1 - (itemDuration - 600) / 1200);
      case 'long':
        return itemDuration > 1800 ? 1.0 : Math.max(0, itemDuration / 1800);
      default: // medium
        return itemDuration >= 600 && itemDuration <= 1800 ? 1.0 : 0.5;
    }
  }

  // Get tag similarity
  async getTagSimilarity(itemTags, userProfile) {
    try {
      if (!itemTags || !userProfile.viewing_history) {
        return 0;
      }

      // Get tags from user's viewed content
      const userTags = new Set();
      for (const view of userProfile.viewing_history.slice(0, 20)) {
        const [interviews] = await this.dbPool.execute(`
          SELECT tags FROM interviews WHERE id = ?
        `, [view.interview_id]);

        if (interviews.length > 0 && interviews[0].tags) {
          const tags = JSON.parse(interviews[0].tags);
          tags.forEach(tag => userTags.add(tag));
        }
      }

      // Calculate Jaccard similarity
      const itemTagSet = new Set(JSON.parse(itemTags));
      const intersection = new Set([...itemTagSet].filter(tag => userTags.has(tag)));
      const union = new Set([...itemTagSet, ...userTags]);

      return union.size > 0 ? intersection.size / union.size : 0;

    } catch (error) {
      this.logger.error('Error calculating tag similarity', { error: error.message });
      return 0;
    }
  }

  // Calculate profile strength
  calculateProfileStrength(viewHistory, likedContent) {
    const viewScore = Math.min(viewHistory.length / 50, 1.0);
    const likeScore = Math.min(likedContent.length / 20, 1.0);
    return (viewScore * 0.7 + likeScore * 0.3);
  }

  // Add explanations to recommendations
  async addExplanations(recommendations, userProfile) {
    try {
      return recommendations.map(rec => {
        const explanations = [];

        // Category-based explanation
        if (userProfile.preferences.categories[rec.category]) {
          explanations.push(`You've shown interest in ${rec.category} content`);
        }

        // Creator-based explanation
        if (userProfile.preferences.creators[rec.creator_id]) {
          explanations.push(`You've liked content from this creator before`);
        }

        // Popularity-based explanation
        if (rec.score_breakdown.popularity > 0.7) {
          explanations.push(`This is trending content`);
        }

        // Recency-based explanation
        if (rec.score_breakdown.recency > 0.8) {
          explanations.push(`This is new content`);
        }

        return {
          ...rec,
          explanation: explanations.length > 0 ? explanations[0] : 'Recommended for you',
          confidence: rec.score
        };
      });

    } catch (error) {
      this.logger.error('Error adding explanations', { error: error.message });
      return recommendations;
    }
  }

  // Log recommendation for analytics
  async logRecommendation(userId, recommendedItems) {
    try {
      const logId = uuidv4();
      
      await this.dbPool.execute(`
        INSERT INTO recommendation_logs (
          id, user_id, recommended_items, algorithm_version, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [logId, userId, JSON.stringify(recommendedItems), '1.0']);

    } catch (error) {
      this.logger.error('Error logging recommendation', { error: error.message });
    }
  }

  // Train models with new data
  async trainModels() {
    try {
      this.logger.info('Starting model training...');

      // Train collaborative filtering model
      await this.trainCollaborativeModel();

      // Train content-based model
      await this.trainContentModel();

      // Save models
      await this.saveModels();

      this.logger.info('Model training completed successfully');

    } catch (error) {
      this.logger.error('Error training models', { error: error.message });
    }
  }

  // Train collaborative filtering model
  async trainCollaborativeModel() {
    try {
      // Get training data
      const [interactions] = await this.dbPool.execute(`
        SELECT user_id, interview_id, 
               CASE 
                 WHEN action_type = 'like' THEN 1.0
                 WHEN action_type = 'view' AND duration_watched > 300 THEN 0.8
                 WHEN action_type = 'view' THEN 0.5
                 WHEN action_type = 'dislike' THEN 0.0
                 ELSE 0.3
               END as rating
        FROM user_interactions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        LIMIT 100000
      `);

      if (interactions.length < 1000) {
        this.logger.warn('Insufficient training data for collaborative filtering');
        return;
      }

      // Prepare training data
      const userIds = interactions.map(i => [i.user_id]);
      const itemIds = interactions.map(i => [i.interview_id]);
      const ratings = interactions.map(i => [i.rating]);

      const userTensor = tf.tensor2d(userIds);
      const itemTensor = tf.tensor2d(itemIds);
      const ratingTensor = tf.tensor2d(ratings);

      // Train model
      await this.models.collaborative.fit(
        [userTensor, itemTensor], 
        ratingTensor,
        {
          epochs: 10,
          batchSize: 32,
          validationSplit: 0.2,
          verbose: 0
        }
      );

      // Cleanup tensors
      userTensor.dispose();
      itemTensor.dispose();
      ratingTensor.dispose();

      this.logger.info('Collaborative filtering model trained successfully');

    } catch (error) {
      this.logger.error('Error training collaborative model', { error: error.message });
    }
  }

  // Save trained models
  async saveModels() {
    try {
      if (this.models.collaborative) {
        await this.models.collaborative.save('file://./models/collaborative-filtering');
      }

      if (this.models.contentBased) {
        await this.models.contentBased.save('file://./models/content-based');
      }

      if (this.models.hybrid) {
        await this.models.hybrid.save('file://./models/hybrid');
      }

      this.logger.info('Models saved successfully');

    } catch (error) {
      this.logger.error('Error saving models', { error: error.message });
    }
  }
}

module.exports = RecommendationEngine;
