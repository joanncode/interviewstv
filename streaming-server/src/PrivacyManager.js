/**
 * PrivacyManager - Data Protection and Privacy Compliance
 * 
 * Handles:
 * - GDPR compliance (EU General Data Protection Regulation)
 * - CCPA compliance (California Consumer Privacy Act)
 * - PIPEDA compliance (Personal Information Protection and Electronic Documents Act - Canada)
 * - Data encryption and secure storage
 * - User consent management
 * - Data retention and deletion policies
 * - Privacy controls and user rights
 * - Data portability and export
 * - Cookie and tracking consent
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class PrivacyManager {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Privacy configuration
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16
      },
      dataRetention: {
        userProfiles: 2555, // 7 years in days
        streamData: 1095, // 3 years in days
        chatMessages: 365, // 1 year in days
        analyticsData: 1095, // 3 years in days
        securityLogs: 2190, // 6 years in days
        financialData: 2555 // 7 years in days
      },
      consentTypes: {
        essential: { required: true, description: 'Essential cookies for site functionality' },
        analytics: { required: false, description: 'Analytics and performance tracking' },
        marketing: { required: false, description: 'Marketing and advertising cookies' },
        personalization: { required: false, description: 'Personalized content and recommendations' },
        social: { required: false, description: 'Social media integration' }
      },
      dataCategories: {
        personal: ['name', 'email', 'phone', 'address', 'birth_date'],
        technical: ['ip_address', 'user_agent', 'device_id', 'session_data'],
        behavioral: ['viewing_history', 'search_queries', 'preferences'],
        financial: ['payment_methods', 'transaction_history', 'earnings'],
        content: ['streams', 'chat_messages', 'uploads', 'comments']
      },
      userRights: [
        'access', 'rectification', 'erasure', 'portability', 
        'restriction', 'objection', 'withdraw_consent'
      ]
    };

    // Encryption key (should be stored securely in production)
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  }

  /**
   * Handle user consent management
   */
  async updateUserConsent(userId, consentData) {
    try {
      const consent = {
        userId,
        consentTypes: consentData.consentTypes || {},
        consentDate: new Date(),
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        consentVersion: '1.0'
      };

      // Validate consent types
      for (const [type, given] of Object.entries(consent.consentTypes)) {
        if (!this.config.consentTypes[type]) {
          throw new Error(`Invalid consent type: ${type}`);
        }
        
        // Check if required consent is given
        if (this.config.consentTypes[type].required && !given) {
          throw new Error(`Required consent not given: ${type}`);
        }
      }

      // Update user consent in database
      const query = `
        UPDATE users 
        SET consent_given = ?, consent_date = ?, privacy_settings = ?
        WHERE id = ?
      `;

      await this.db.execute(query, [
        true,
        consent.consentDate,
        JSON.stringify(consent),
        userId
      ]);

      // Log consent for compliance
      await this.logComplianceEvent('consent_updated', userId, {
        consentTypes: consent.consentTypes,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent
      });

      this.logger.info(`User consent updated: ${userId}`);
      return { success: true, consent };
    } catch (error) {
      this.logger.error('Error updating user consent:', error);
      throw error;
    }
  }

  /**
   * Handle data subject access requests (GDPR Article 15)
   */
  async handleDataAccessRequest(userId, requestData) {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        userId,
        requestType: 'access',
        status: 'pending',
        requestedAt: new Date(),
        requestData
      };

      // Save request
      await this.saveDataRequest(request);

      // Generate user data export
      const userData = await this.generateUserDataExport(userId);

      // Update request status
      await this.updateDataRequestStatus(requestId, 'completed', userData);

      // Log compliance event
      await this.logComplianceEvent('data_access_request', userId, {
        requestId,
        dataCategories: Object.keys(userData)
      });

      this.logger.info(`Data access request completed: ${requestId} for user ${userId}`);
      return { success: true, requestId, data: userData };
    } catch (error) {
      this.logger.error('Error handling data access request:', error);
      throw error;
    }
  }

  /**
   * Handle data portability requests (GDPR Article 20)
   */
  async handleDataPortabilityRequest(userId, format = 'json') {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        userId,
        requestType: 'portability',
        status: 'pending',
        requestedAt: new Date(),
        format
      };

      await this.saveDataRequest(request);

      // Generate portable data export
      const portableData = await this.generatePortableDataExport(userId, format);

      // Create download link
      const downloadUrl = await this.createSecureDownloadLink(requestId, portableData);

      await this.updateDataRequestStatus(requestId, 'completed', { downloadUrl });

      await this.logComplianceEvent('data_portability_request', userId, {
        requestId,
        format,
        downloadUrl
      });

      this.logger.info(`Data portability request completed: ${requestId} for user ${userId}`);
      return { success: true, requestId, downloadUrl };
    } catch (error) {
      this.logger.error('Error handling data portability request:', error);
      throw error;
    }
  }

  /**
   * Handle data deletion requests (GDPR Article 17 - Right to Erasure)
   */
  async handleDataDeletionRequest(userId, requestData) {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        userId,
        requestType: 'delete',
        status: 'pending',
        requestedAt: new Date(),
        requestData
      };

      await this.saveDataRequest(request);

      // Check if user has legal obligations that prevent deletion
      const canDelete = await this.checkDeletionEligibility(userId);
      if (!canDelete.eligible) {
        await this.updateDataRequestStatus(requestId, 'rejected', {
          reason: canDelete.reason
        });
        return { success: false, reason: canDelete.reason };
      }

      // Perform data deletion
      const deletionResult = await this.performDataDeletion(userId, requestData.categories);

      await this.updateDataRequestStatus(requestId, 'completed', deletionResult);

      await this.logComplianceEvent('data_deletion_request', userId, {
        requestId,
        deletedCategories: deletionResult.deletedCategories,
        retainedCategories: deletionResult.retainedCategories
      });

      this.logger.info(`Data deletion request completed: ${requestId} for user ${userId}`);
      return { success: true, requestId, result: deletionResult };
    } catch (error) {
      this.logger.error('Error handling data deletion request:', error);
      throw error;
    }
  }

  /**
   * Handle data rectification requests (GDPR Article 16)
   */
  async handleDataRectificationRequest(userId, corrections) {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        userId,
        requestType: 'rectification',
        status: 'pending',
        requestedAt: new Date(),
        corrections
      };

      await this.saveDataRequest(request);

      // Apply corrections
      const rectificationResult = await this.performDataRectification(userId, corrections);

      await this.updateDataRequestStatus(requestId, 'completed', rectificationResult);

      await this.logComplianceEvent('data_rectification_request', userId, {
        requestId,
        corrections: Object.keys(corrections)
      });

      this.logger.info(`Data rectification request completed: ${requestId} for user ${userId}`);
      return { success: true, requestId, result: rectificationResult };
    } catch (error) {
      this.logger.error('Error handling data rectification request:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data) {
    try {
      const iv = crypto.randomBytes(this.config.encryption.ivLength);
      const cipher = crypto.createCipher(this.config.encryption.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('interviews-tv-aad'));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      this.logger.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(this.config.encryption.algorithm, this.encryptionKey);
      
      decipher.setAAD(Buffer.from('interviews-tv-aad'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Error decrypting data:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive user data export
   */
  async generateUserDataExport(userId) {
    try {
      const userData = {
        profile: await this.getUserProfile(userId),
        streams: await this.getUserStreams(userId),
        chatMessages: await this.getUserChatMessages(userId),
        viewingHistory: await this.getUserViewingHistory(userId),
        subscriptions: await this.getUserSubscriptions(userId),
        transactions: await this.getUserTransactions(userId),
        securityEvents: await this.getUserSecurityEvents(userId),
        preferences: await this.getUserPreferences(userId)
      };

      return userData;
    } catch (error) {
      this.logger.error('Error generating user data export:', error);
      throw error;
    }
  }

  /**
   * Generate portable data export in specified format
   */
  async generatePortableDataExport(userId, format) {
    try {
      const userData = await this.generateUserDataExport(userId);
      
      switch (format) {
        case 'json':
          return JSON.stringify(userData, null, 2);
        case 'csv':
          return this.convertToCSV(userData);
        case 'xml':
          return this.convertToXML(userData);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Error generating portable data export:', error);
      throw error;
    }
  }

  /**
   * Check if user data can be deleted
   */
  async checkDeletionEligibility(userId) {
    try {
      // Check for legal obligations
      const hasActiveSubscriptions = await this.hasActiveSubscriptions(userId);
      const hasUnresolvedDisputes = await this.hasUnresolvedDisputes(userId);
      const hasFinancialObligations = await this.hasFinancialObligations(userId);

      if (hasActiveSubscriptions) {
        return {
          eligible: false,
          reason: 'User has active subscriptions. Please cancel all subscriptions before requesting deletion.'
        };
      }

      if (hasUnresolvedDisputes) {
        return {
          eligible: false,
          reason: 'User has unresolved disputes or legal proceedings.'
        };
      }

      if (hasFinancialObligations) {
        return {
          eligible: false,
          reason: 'User has outstanding financial obligations.'
        };
      }

      return { eligible: true };
    } catch (error) {
      this.logger.error('Error checking deletion eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Perform data deletion based on categories
   */
  async performDataDeletion(userId, categories = 'all') {
    try {
      const deletionResult = {
        deletedCategories: [],
        retainedCategories: [],
        deletionDate: new Date()
      };

      if (categories === 'all' || categories.includes('profile')) {
        await this.deleteUserProfile(userId);
        deletionResult.deletedCategories.push('profile');
      }

      if (categories === 'all' || categories.includes('content')) {
        await this.deleteUserContent(userId);
        deletionResult.deletedCategories.push('content');
      }

      if (categories === 'all' || categories.includes('behavioral')) {
        await this.deleteUserBehavioralData(userId);
        deletionResult.deletedCategories.push('behavioral');
      }

      // Some data must be retained for legal compliance
      deletionResult.retainedCategories = ['financial_records', 'security_logs'];

      return deletionResult;
    } catch (error) {
      this.logger.error('Error performing data deletion:', error);
      throw error;
    }
  }

  /**
   * Perform data rectification
   */
  async performDataRectification(userId, corrections) {
    try {
      const rectificationResult = {
        correctedFields: [],
        errors: [],
        rectificationDate: new Date()
      };

      for (const [field, newValue] of Object.entries(corrections)) {
        try {
          await this.updateUserField(userId, field, newValue);
          rectificationResult.correctedFields.push(field);
        } catch (error) {
          rectificationResult.errors.push({
            field,
            error: error.message
          });
        }
      }

      return rectificationResult;
    } catch (error) {
      this.logger.error('Error performing data rectification:', error);
      throw error;
    }
  }

  /**
   * Automated data retention cleanup
   */
  async performDataRetentionCleanup() {
    try {
      const cleanupResults = {
        deletedRecords: 0,
        processedTables: [],
        cleanupDate: new Date()
      };

      // Clean up expired user data
      for (const [category, retentionDays] of Object.entries(this.config.dataRetention)) {
        const deletedCount = await this.cleanupExpiredData(category, retentionDays);
        cleanupResults.deletedRecords += deletedCount;
        cleanupResults.processedTables.push(category);
      }

      // Log cleanup results
      await this.logComplianceEvent('data_retention_cleanup', null, cleanupResults);

      this.logger.info(`Data retention cleanup completed: ${cleanupResults.deletedRecords} records deleted`);
      return cleanupResults;
    } catch (error) {
      this.logger.error('Error performing data retention cleanup:', error);
      throw error;
    }
  }

  /**
   * Helper methods for data operations
   */
  async getUserProfile(userId) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows[0] || null;
  }

  async getUserStreams(userId) {
    const query = 'SELECT * FROM live_streams WHERE user_id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserChatMessages(userId) {
    const query = 'SELECT * FROM stream_chat WHERE user_id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserViewingHistory(userId) {
    const query = 'SELECT * FROM stream_viewers WHERE user_id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserSubscriptions(userId) {
    const query = 'SELECT * FROM subscriptions WHERE user_id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserTransactions(userId) {
    const query = 'SELECT * FROM revenue_logs WHERE user_id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserSecurityEvents(userId) {
    const query = 'SELECT * FROM security_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 100';
    const [rows] = await this.db.execute(query, [userId]);
    return rows;
  }

  async getUserPreferences(userId) {
    const user = await this.getUserProfile(userId);
    return user ? JSON.parse(user.privacy_settings || '{}') : {};
  }

  async hasActiveSubscriptions(userId) {
    const query = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND status = "active"';
    const [rows] = await this.db.execute(query, [userId]);
    return rows[0].count > 0;
  }

  async hasUnresolvedDisputes(userId) {
    const query = 'SELECT COUNT(*) as count FROM content_reports WHERE reported_user_id = ? AND status IN ("pending", "under_review")';
    const [rows] = await this.db.execute(query, [userId]);
    return rows[0].count > 0;
  }

  async hasFinancialObligations(userId) {
    const query = 'SELECT COUNT(*) as count FROM creator_payouts WHERE creator_id = ? AND status = "pending"';
    const [rows] = await this.db.execute(query, [userId]);
    return rows[0].count > 0;
  }

  async deleteUserProfile(userId) {
    // Anonymize user data instead of hard delete for referential integrity
    const query = `
      UPDATE users 
      SET username = ?, email = ?, password_hash = ?, 
          status = 'deleted', data_retention_date = NOW()
      WHERE id = ?
    `;
    await this.db.execute(query, [
      `deleted_user_${userId.substring(0, 8)}`,
      `deleted_${userId.substring(0, 8)}@deleted.local`,
      'deleted',
      userId
    ]);
  }

  async deleteUserContent(userId) {
    // Delete user-generated content
    await this.db.execute('DELETE FROM stream_chat WHERE user_id = ?', [userId]);
    await this.db.execute('UPDATE live_streams SET status = "deleted" WHERE user_id = ?', [userId]);
  }

  async deleteUserBehavioralData(userId) {
    // Delete behavioral and tracking data
    await this.db.execute('DELETE FROM stream_viewers WHERE user_id = ?', [userId]);
    await this.db.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
  }

  async updateUserField(userId, field, value) {
    const allowedFields = ['username', 'email', 'birth_date', 'privacy_settings'];
    if (!allowedFields.includes(field)) {
      throw new Error(`Field ${field} cannot be updated`);
    }

    const query = `UPDATE users SET ${field} = ?, updated_at = NOW() WHERE id = ?`;
    await this.db.execute(query, [value, userId]);
  }

  async cleanupExpiredData(category, retentionDays) {
    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
    
    let query;
    switch (category) {
      case 'chatMessages':
        query = 'DELETE FROM stream_chat WHERE created_at < ?';
        break;
      case 'analyticsData':
        query = 'DELETE FROM stream_analytics WHERE created_at < ?';
        break;
      case 'securityLogs':
        query = 'DELETE FROM security_events WHERE created_at < ?';
        break;
      default:
        return 0;
    }

    const [result] = await this.db.execute(query, [cutoffDate]);
    return result.affectedRows || 0;
  }

  async saveDataRequest(request) {
    const query = `
      INSERT INTO data_requests (
        id, user_id, request_type, status, request_data, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      request.id,
      request.userId,
      request.requestType,
      request.status,
      JSON.stringify(request.requestData || {}),
      request.requestedAt
    ]);
  }

  async updateDataRequestStatus(requestId, status, responseData = null) {
    const query = `
      UPDATE data_requests 
      SET status = ?, response_data = ?, processed_at = NOW()
      WHERE id = ?
    `;

    await this.db.execute(query, [
      status,
      responseData ? JSON.stringify(responseData) : null,
      requestId
    ]);
  }

  async createSecureDownloadLink(requestId, data) {
    // Create secure temporary download link
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const downloadUrl = `/api/privacy/download/${downloadToken}`;
    
    // Store download data temporarily (24 hours)
    await this.redis.setEx(
      `download:${downloadToken}`,
      86400,
      JSON.stringify({ requestId, data })
    );

    return downloadUrl;
  }

  async logComplianceEvent(eventType, userId, metadata) {
    const event = {
      id: uuidv4(),
      complianceType: 'gdpr', // Default to GDPR, can be extended
      action: eventType,
      userId,
      details: metadata,
      createdAt: new Date()
    };

    const query = `
      INSERT INTO compliance_logs (
        id, compliance_type, action, user_id, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      event.id,
      event.complianceType,
      event.action,
      event.userId,
      JSON.stringify(event.details),
      event.createdAt
    ]);
  }

  convertToCSV(data) {
    // Simple CSV conversion - would need more sophisticated implementation
    return 'CSV export not implemented yet';
  }

  convertToXML(data) {
    // Simple XML conversion - would need more sophisticated implementation
    return '<xml>XML export not implemented yet</xml>';
  }
}

module.exports = PrivacyManager;
