/**
 * Customer Support System for Interviews.tv
 * Comprehensive support ticket management, live chat, and knowledge base
 */

const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

class CustomerSupportSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.emailTransporter = this.initializeEmailTransporter();
    this.supportCategories = this.initializeSupportCategories();
    this.priorityLevels = this.initializePriorityLevels();
  }

  initializeEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SUPPORT_EMAIL,
        pass: process.env.SUPPORT_EMAIL_PASSWORD
      }
    });
  }

  initializeSupportCategories() {
    return {
      'technical': {
        name: 'Technical Issues',
        description: 'Streaming problems, app crashes, login issues',
        sla_hours: 4,
        auto_assign_team: 'technical'
      },
      'billing': {
        name: 'Billing & Payments',
        description: 'Subscription issues, payment problems, refunds',
        sla_hours: 2,
        auto_assign_team: 'billing'
      },
      'content': {
        name: 'Content & Moderation',
        description: 'Content violations, DMCA claims, moderation appeals',
        sla_hours: 8,
        auto_assign_team: 'moderation'
      },
      'account': {
        name: 'Account Management',
        description: 'Profile issues, verification, account recovery',
        sla_hours: 6,
        auto_assign_team: 'account'
      },
      'feature': {
        name: 'Feature Requests',
        description: 'New feature suggestions, improvements',
        sla_hours: 24,
        auto_assign_team: 'product'
      },
      'general': {
        name: 'General Inquiry',
        description: 'General questions and information requests',
        sla_hours: 12,
        auto_assign_team: 'general'
      }
    };
  }

  initializePriorityLevels() {
    return {
      'critical': {
        name: 'Critical',
        description: 'Service outage, security breach, payment failures',
        sla_hours: 1,
        escalation_hours: 2,
        notify_management: true
      },
      'high': {
        name: 'High',
        description: 'Major functionality broken, revenue impact',
        sla_hours: 4,
        escalation_hours: 8,
        notify_management: false
      },
      'medium': {
        name: 'Medium',
        description: 'Minor issues, feature problems',
        sla_hours: 12,
        escalation_hours: 24,
        notify_management: false
      },
      'low': {
        name: 'Low',
        description: 'General questions, minor improvements',
        sla_hours: 48,
        escalation_hours: 72,
        notify_management: false
      }
    };
  }

  // Create Support Ticket
  async createTicket(ticketData) {
    try {
      const ticketId = uuidv4();
      const priority = this.determinePriority(ticketData);
      const category = ticketData.category || 'general';
      const assignedTeam = this.supportCategories[category]?.auto_assign_team || 'general';
      
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + this.supportCategories[category]?.sla_hours || 24);

      const [result] = await this.dbPool.execute(`
        INSERT INTO support_tickets (
          id, user_id, subject, description, category, priority, 
          status, assigned_team, assigned_agent, sla_deadline,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, NULL, ?, NOW(), NOW())
      `, [
        ticketId, ticketData.userId, ticketData.subject, 
        ticketData.description, category, priority,
        assignedTeam, slaDeadline
      ]);

      // Auto-assign to available agent
      await this.autoAssignTicket(ticketId, assignedTeam);

      // Send confirmation email
      await this.sendTicketConfirmationEmail(ticketId, ticketData);

      // Log ticket creation
      this.logger.info('Support ticket created', {
        ticketId,
        userId: ticketData.userId,
        category,
        priority
      });

      return {
        success: true,
        ticketId,
        priority,
        slaDeadline,
        message: 'Support ticket created successfully'
      };

    } catch (error) {
      this.logger.error('Error creating support ticket', { error: error.message });
      throw error;
    }
  }

  // Determine ticket priority based on content and user tier
  determinePriority(ticketData) {
    const description = ticketData.description.toLowerCase();
    const subject = ticketData.subject.toLowerCase();
    
    // Critical keywords
    const criticalKeywords = ['outage', 'down', 'security', 'hack', 'payment failed', 'can\'t login'];
    if (criticalKeywords.some(keyword => description.includes(keyword) || subject.includes(keyword))) {
      return 'critical';
    }

    // High priority keywords
    const highKeywords = ['broken', 'error', 'bug', 'not working', 'refund'];
    if (highKeywords.some(keyword => description.includes(keyword) || subject.includes(keyword))) {
      return 'high';
    }

    // Check user subscription tier
    if (ticketData.userTier === 'creator' || ticketData.userTier === 'premium') {
      return 'medium';
    }

    return 'low';
  }

  // Auto-assign ticket to available agent
  async autoAssignTicket(ticketId, team) {
    try {
      // Get available agents for the team
      const [agents] = await this.dbPool.execute(`
        SELECT id, name, current_ticket_count 
        FROM support_agents 
        WHERE team = ? AND status = 'available' AND current_ticket_count < max_tickets
        ORDER BY current_ticket_count ASC, last_assigned ASC
        LIMIT 1
      `, [team]);

      if (agents.length > 0) {
        const agent = agents[0];
        
        // Assign ticket to agent
        await this.dbPool.execute(`
          UPDATE support_tickets 
          SET assigned_agent = ?, updated_at = NOW()
          WHERE id = ?
        `, [agent.id, ticketId]);

        // Update agent ticket count
        await this.dbPool.execute(`
          UPDATE support_agents 
          SET current_ticket_count = current_ticket_count + 1, last_assigned = NOW()
          WHERE id = ?
        `, [agent.id]);

        this.logger.info('Ticket auto-assigned', {
          ticketId,
          agentId: agent.id,
          agentName: agent.name
        });
      }
    } catch (error) {
      this.logger.error('Error auto-assigning ticket', { error: error.message });
    }
  }

  // Update ticket status and add response
  async updateTicket(ticketId, updateData, agentId) {
    try {
      const updates = [];
      const values = [];

      if (updateData.status) {
        updates.push('status = ?');
        values.push(updateData.status);
      }

      if (updateData.priority) {
        updates.push('priority = ?');
        values.push(updateData.priority);
      }

      if (updateData.assignedAgent) {
        updates.push('assigned_agent = ?');
        values.push(updateData.assignedAgent);
      }

      updates.push('updated_at = NOW()');
      values.push(ticketId);

      await this.dbPool.execute(`
        UPDATE support_tickets 
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      // Add response if provided
      if (updateData.response) {
        await this.addTicketResponse(ticketId, updateData.response, agentId, 'agent');
      }

      // Send notification to user if ticket is resolved
      if (updateData.status === 'resolved') {
        await this.sendTicketResolutionEmail(ticketId);
      }

      return { success: true, message: 'Ticket updated successfully' };

    } catch (error) {
      this.logger.error('Error updating ticket', { error: error.message });
      throw error;
    }
  }

  // Add response to ticket
  async addTicketResponse(ticketId, message, userId, userType = 'user') {
    try {
      const responseId = uuidv4();

      await this.dbPool.execute(`
        INSERT INTO support_ticket_responses (
          id, ticket_id, user_id, user_type, message, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [responseId, ticketId, userId, userType, message]);

      // Update ticket's last activity
      await this.dbPool.execute(`
        UPDATE support_tickets 
        SET updated_at = NOW()
        WHERE id = ?
      `, [ticketId]);

      // Send notification to relevant parties
      if (userType === 'user') {
        await this.notifyAgentOfUserResponse(ticketId);
      } else {
        await this.notifyUserOfAgentResponse(ticketId);
      }

      return { success: true, responseId };

    } catch (error) {
      this.logger.error('Error adding ticket response', { error: error.message });
      throw error;
    }
  }

  // Get ticket details with responses
  async getTicketDetails(ticketId, userId = null) {
    try {
      // Get ticket information
      const [tickets] = await this.dbPool.execute(`
        SELECT t.*, u.username, u.email, a.name as agent_name
        FROM support_tickets t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN support_agents a ON t.assigned_agent = a.id
        WHERE t.id = ? ${userId ? 'AND t.user_id = ?' : ''}
      `, userId ? [ticketId, userId] : [ticketId]);

      if (tickets.length === 0) {
        return { success: false, message: 'Ticket not found' };
      }

      const ticket = tickets[0];

      // Get ticket responses
      const [responses] = await this.dbPool.execute(`
        SELECT r.*, u.username, a.name as agent_name
        FROM support_ticket_responses r
        LEFT JOIN users u ON r.user_id = u.id AND r.user_type = 'user'
        LEFT JOIN support_agents a ON r.user_id = a.id AND r.user_type = 'agent'
        WHERE r.ticket_id = ?
        ORDER BY r.created_at ASC
      `, [ticketId]);

      return {
        success: true,
        ticket: {
          ...ticket,
          responses: responses
        }
      };

    } catch (error) {
      this.logger.error('Error getting ticket details', { error: error.message });
      throw error;
    }
  }

  // Get user's tickets
  async getUserTickets(userId, status = null, limit = 20, offset = 0) {
    try {
      let query = `
        SELECT t.*, a.name as agent_name
        FROM support_tickets t
        LEFT JOIN support_agents a ON t.assigned_agent = a.id
        WHERE t.user_id = ?
      `;
      const params = [userId];

      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }

      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [tickets] = await this.dbPool.execute(query, params);

      return { success: true, tickets };

    } catch (error) {
      this.logger.error('Error getting user tickets', { error: error.message });
      throw error;
    }
  }

  // Send ticket confirmation email
  async sendTicketConfirmationEmail(ticketId, ticketData) {
    try {
      const mailOptions = {
        from: process.env.SUPPORT_EMAIL,
        to: ticketData.userEmail,
        subject: `Support Ticket Created - #${ticketId.substring(0, 8)}`,
        html: `
          <h2>Support Ticket Confirmation</h2>
          <p>Dear ${ticketData.userName || 'User'},</p>
          <p>Your support ticket has been created successfully.</p>
          
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <strong>Ticket ID:</strong> #${ticketId.substring(0, 8)}<br>
            <strong>Subject:</strong> ${ticketData.subject}<br>
            <strong>Category:</strong> ${this.supportCategories[ticketData.category]?.name || 'General'}<br>
            <strong>Priority:</strong> ${this.determinePriority(ticketData)}
          </div>
          
          <p>Our support team will respond within the SLA timeframe. You can track your ticket status in your account dashboard.</p>
          
          <p>Best regards,<br>Interviews.tv Support Team</p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      this.logger.info('Ticket confirmation email sent', { ticketId });

    } catch (error) {
      this.logger.error('Error sending confirmation email', { error: error.message });
    }
  }

  // Send ticket resolution email
  async sendTicketResolutionEmail(ticketId) {
    try {
      const ticketDetails = await this.getTicketDetails(ticketId);
      if (!ticketDetails.success) return;

      const ticket = ticketDetails.ticket;

      const mailOptions = {
        from: process.env.SUPPORT_EMAIL,
        to: ticket.email,
        subject: `Support Ticket Resolved - #${ticketId.substring(0, 8)}`,
        html: `
          <h2>Support Ticket Resolved</h2>
          <p>Dear ${ticket.username},</p>
          <p>Your support ticket has been resolved.</p>
          
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <strong>Ticket ID:</strong> #${ticketId.substring(0, 8)}<br>
            <strong>Subject:</strong> ${ticket.subject}<br>
            <strong>Resolved by:</strong> ${ticket.agent_name || 'Support Team'}
          </div>
          
          <p>If you need further assistance, please don't hesitate to create a new support ticket.</p>
          
          <p>Best regards,<br>Interviews.tv Support Team</p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      this.logger.info('Ticket resolution email sent', { ticketId });

    } catch (error) {
      this.logger.error('Error sending resolution email', { error: error.message });
    }
  }

  // Get support analytics
  async getSupportAnalytics(startDate, endDate) {
    try {
      const [stats] = await this.dbPool.execute(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_tickets,
          AVG(TIMESTAMPDIFF(HOUR, created_at, 
            CASE WHEN status = 'resolved' THEN updated_at ELSE NULL END)) as avg_resolution_time,
          COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as tickets_24h
        FROM support_tickets
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      const [categoryStats] = await this.dbPool.execute(`
        SELECT category, COUNT(*) as count
        FROM support_tickets
        WHERE created_at BETWEEN ? AND ?
        GROUP BY category
        ORDER BY count DESC
      `, [startDate, endDate]);

      return {
        success: true,
        analytics: {
          overview: stats[0],
          categoryBreakdown: categoryStats
        }
      };

    } catch (error) {
      this.logger.error('Error getting support analytics', { error: error.message });
      throw error;
    }
  }
}

module.exports = CustomerSupportSystem;
