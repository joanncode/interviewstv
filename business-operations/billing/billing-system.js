/**
 * Advanced Billing System for Interviews.tv
 * Handles subscriptions, payments, invoicing, and revenue analytics
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

class BillingSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.emailTransporter = this.initializeEmailTransporter();
    this.subscriptionPlans = this.initializeSubscriptionPlans();
    this.taxRates = this.initializeTaxRates();
  }

  initializeEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.BILLING_EMAIL,
        pass: process.env.BILLING_EMAIL_PASSWORD
      }
    });
  }

  initializeSubscriptionPlans() {
    return {
      'basic': {
        id: 'basic',
        name: 'Basic Plan',
        price: 4.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'Ad-free viewing',
          'Chat privileges',
          'Mobile streaming',
          'Basic analytics'
        ],
        stripe_price_id: process.env.STRIPE_BASIC_PRICE_ID
      },
      'premium': {
        id: 'premium',
        name: 'Premium Plan',
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'All Basic features',
          'HD streaming',
          'Exclusive content',
          'Priority support',
          'Advanced analytics'
        ],
        stripe_price_id: process.env.STRIPE_PREMIUM_PRICE_ID
      },
      'creator': {
        id: 'creator',
        name: 'Creator Plan',
        price: 19.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'All Premium features',
          'Monetization tools',
          'Advanced streaming features',
          'Revenue analytics',
          'Priority support',
          'Custom branding'
        ],
        stripe_price_id: process.env.STRIPE_CREATOR_PRICE_ID
      }
    };
  }

  initializeTaxRates() {
    return {
      'US': 0.08,  // Average US sales tax
      'CA': 0.13,  // Canadian GST/HST
      'GB': 0.20,  // UK VAT
      'EU': 0.21,  // EU VAT average
      'default': 0.00
    };
  }

  // Create Stripe customer
  async createCustomer(userData) {
    try {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          user_id: userData.userId,
          platform: 'interviews-tv'
        }
      });

      // Store customer ID in database
      await this.dbPool.execute(`
        UPDATE users 
        SET stripe_customer_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [customer.id, userData.userId]);

      this.logger.info('Stripe customer created', {
        userId: userData.userId,
        customerId: customer.id
      });

      return { success: true, customerId: customer.id };

    } catch (error) {
      this.logger.error('Error creating Stripe customer', { error: error.message });
      throw error;
    }
  }

  // Create subscription
  async createSubscription(userId, planId, paymentMethodId) {
    try {
      // Get user and customer info
      const [users] = await this.dbPool.execute(`
        SELECT id, email, name, stripe_customer_id, country
        FROM users WHERE id = ?
      `, [userId]);

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      let customerId = user.stripe_customer_id;

      // Create customer if doesn't exist
      if (!customerId) {
        const customerResult = await this.createCustomer({
          userId: user.id,
          email: user.email,
          name: user.name
        });
        customerId = customerResult.customerId;
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      const plan = this.subscriptionPlans[planId];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      // Calculate tax
      const taxRate = this.taxRates[user.country] || this.taxRates.default;
      const subtotal = plan.price;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: plan.stripe_price_id,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId,
          plan_id: planId
        }
      });

      // Store subscription in database
      const subscriptionId = uuidv4();
      await this.dbPool.execute(`
        INSERT INTO user_subscriptions (
          id, user_id, stripe_subscription_id, plan_id, status,
          current_period_start, current_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        subscriptionId,
        userId,
        subscription.id,
        planId,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000)
      ]);

      // Create initial invoice record
      await this.createInvoiceRecord(subscription.latest_invoice, userId, subscriptionId);

      this.logger.info('Subscription created', {
        userId,
        subscriptionId,
        planId,
        stripeSubscriptionId: subscription.id
      });

      return {
        success: true,
        subscriptionId,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status
      };

    } catch (error) {
      this.logger.error('Error creating subscription', { error: error.message });
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId, subscriptionId, cancelAtPeriodEnd = true) {
    try {
      // Get subscription from database
      const [subscriptions] = await this.dbPool.execute(`
        SELECT stripe_subscription_id, status
        FROM user_subscriptions
        WHERE id = ? AND user_id = ?
      `, [subscriptionId, userId]);

      if (subscriptions.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = subscriptions[0];

      if (subscription.status === 'canceled') {
        throw new Error('Subscription already canceled');
      }

      // Cancel in Stripe
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
          metadata: {
            canceled_by: 'user',
            canceled_at: new Date().toISOString()
          }
        }
      );

      // Update database
      const newStatus = cancelAtPeriodEnd ? 'cancel_at_period_end' : 'canceled';
      await this.dbPool.execute(`
        UPDATE user_subscriptions
        SET status = ?, canceled_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [newStatus, subscriptionId]);

      // Send cancellation email
      await this.sendCancellationEmail(userId, subscriptionId);

      this.logger.info('Subscription canceled', {
        userId,
        subscriptionId,
        cancelAtPeriodEnd
      });

      return { success: true, message: 'Subscription canceled successfully' };

    } catch (error) {
      this.logger.error('Error canceling subscription', { error: error.message });
      throw error;
    }
  }

  // Process one-time payment (donations, pay-per-view)
  async processOneTimePayment(paymentData) {
    try {
      const { userId, amount, currency, description, paymentMethodId, metadata } = paymentData;

      // Get user's Stripe customer ID
      const [users] = await this.dbPool.execute(`
        SELECT stripe_customer_id, email, name
        FROM users WHERE id = ?
      `, [userId]);

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      let customerId = user.stripe_customer_id;

      // Create customer if doesn't exist
      if (!customerId) {
        const customerResult = await this.createCustomer({
          userId: user.id,
          email: user.email,
          name: user.name
        });
        customerId = customerResult.customerId;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        description: description,
        metadata: {
          user_id: userId,
          ...metadata
        }
      });

      // Store payment record
      const paymentId = uuidv4();
      await this.dbPool.execute(`
        INSERT INTO payments (
          id, user_id, stripe_payment_intent_id, amount, currency,
          description, status, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        paymentId,
        userId,
        paymentIntent.id,
        amount,
        currency,
        description,
        paymentIntent.status,
        JSON.stringify(metadata)
      ]);

      this.logger.info('One-time payment processed', {
        userId,
        paymentId,
        amount,
        status: paymentIntent.status
      });

      return {
        success: true,
        paymentId,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      };

    } catch (error) {
      this.logger.error('Error processing one-time payment', { error: error.message });
      throw error;
    }
  }

  // Create invoice record
  async createInvoiceRecord(stripeInvoice, userId, subscriptionId) {
    try {
      const invoiceId = uuidv4();

      await this.dbPool.execute(`
        INSERT INTO invoices (
          id, user_id, subscription_id, stripe_invoice_id, amount_due,
          amount_paid, currency, status, invoice_pdf, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        invoiceId,
        userId,
        subscriptionId,
        stripeInvoice.id,
        stripeInvoice.amount_due / 100,
        stripeInvoice.amount_paid / 100,
        stripeInvoice.currency,
        stripeInvoice.status,
        stripeInvoice.invoice_pdf
      ]);

      return invoiceId;

    } catch (error) {
      this.logger.error('Error creating invoice record', { error: error.message });
      throw error;
    }
  }

  // Get user's billing history
  async getBillingHistory(userId, limit = 20, offset = 0) {
    try {
      const [invoices] = await this.dbPool.execute(`
        SELECT i.*, s.plan_id
        FROM invoices i
        LEFT JOIN user_subscriptions s ON i.subscription_id = s.id
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      const [payments] = await this.dbPool.execute(`
        SELECT * FROM payments
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      return {
        success: true,
        invoices,
        payments
      };

    } catch (error) {
      this.logger.error('Error getting billing history', { error: error.message });
      throw error;
    }
  }

  // Generate revenue analytics
  async getRevenueAnalytics(startDate, endDate) {
    try {
      // Subscription revenue
      const [subscriptionRevenue] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount_paid) as revenue,
          COUNT(*) as transactions
        FROM invoices
        WHERE status = 'paid' AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate, endDate]);

      // One-time payment revenue
      const [paymentRevenue] = await this.dbPool.execute(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payments
        WHERE status = 'succeeded' AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate, endDate]);

      // Plan breakdown
      const [planBreakdown] = await this.dbPool.execute(`
        SELECT 
          s.plan_id,
          COUNT(*) as active_subscriptions,
          SUM(i.amount_paid) as revenue
        FROM user_subscriptions s
        JOIN invoices i ON s.id = i.subscription_id
        WHERE s.status = 'active' AND i.created_at BETWEEN ? AND ?
        GROUP BY s.plan_id
      `, [startDate, endDate]);

      // Monthly recurring revenue (MRR)
      const [mrrData] = await this.dbPool.execute(`
        SELECT 
          s.plan_id,
          COUNT(*) as subscribers,
          COUNT(*) * (
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

      return {
        success: true,
        analytics: {
          subscriptionRevenue,
          paymentRevenue,
          planBreakdown,
          mrr: mrrData
        }
      };

    } catch (error) {
      this.logger.error('Error getting revenue analytics', { error: error.message });
      throw error;
    }
  }

  // Handle Stripe webhooks
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        default:
          this.logger.info('Unhandled webhook event', { type: event.type });
      }

    } catch (error) {
      this.logger.error('Error handling Stripe webhook', { error: error.message });
      throw error;
    }
  }

  // Handle successful invoice payment
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      // Update invoice status
      await this.dbPool.execute(`
        UPDATE invoices
        SET status = 'paid', amount_paid = ?, updated_at = NOW()
        WHERE stripe_invoice_id = ?
      `, [invoice.amount_paid / 100, invoice.id]);

      // Update subscription status if applicable
      if (invoice.subscription) {
        await this.dbPool.execute(`
          UPDATE user_subscriptions
          SET status = 'active', updated_at = NOW()
          WHERE stripe_subscription_id = ?
        `, [invoice.subscription]);
      }

      this.logger.info('Invoice payment succeeded', { invoiceId: invoice.id });

    } catch (error) {
      this.logger.error('Error handling invoice payment succeeded', { error: error.message });
    }
  }

  // Send cancellation email
  async sendCancellationEmail(userId, subscriptionId) {
    try {
      const [users] = await this.dbPool.execute(`
        SELECT email, name FROM users WHERE id = ?
      `, [userId]);

      if (users.length === 0) return;

      const user = users[0];

      const mailOptions = {
        from: process.env.BILLING_EMAIL,
        to: user.email,
        subject: 'Subscription Cancellation Confirmation',
        html: `
          <h2>Subscription Canceled</h2>
          <p>Dear ${user.name},</p>
          <p>Your subscription has been successfully canceled. You will continue to have access to premium features until the end of your current billing period.</p>
          <p>We're sorry to see you go! If you have any feedback, please let us know.</p>
          <p>Best regards,<br>Interviews.tv Team</p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);

    } catch (error) {
      this.logger.error('Error sending cancellation email', { error: error.message });
    }
  }
}

module.exports = BillingSystem;
