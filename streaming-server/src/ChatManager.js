/**
 * ChatManager - Real-time Live Chat System
 * 
 * Handles:
 * - Real-time chat messaging with WebSocket
 * - Chat moderation and filtering
 * - Emoji and reaction system
 * - Chat commands and bot integration
 * - Chat analytics and metrics
 * - Spam detection and rate limiting
 */

const { v4: uuidv4 } = require('uuid');

class ChatManager {
  constructor(io, redisClient, logger) {
    this.io = io;
    this.redis = redisClient;
    this.logger = logger;
    
    // Active chat rooms (streamId -> room data)
    this.chatRooms = new Map();
    
    // User rate limiting (userId -> last message times)
    this.rateLimits = new Map();
    
    // Moderation settings
    this.moderationConfig = {
      maxMessageLength: 500,
      messagesPerMinute: 30,
      enableProfanityFilter: true,
      enableSpamDetection: true,
      autoModeration: true
    };

    // Emoji and reaction system
    this.emojiList = [
      '😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉',
      '😎', '😢', '😮', '😡', '🙄', '👏', '🤝', '💪', '🎯', '⭐'
    ];

    // Chat commands - will be initialized after methods are defined
    this.chatCommands = {};

    // Profanity filter (basic implementation)
    this.profanityWords = [
      // Add profanity words here - keeping it clean for demo
      'spam', 'scam', 'fake'
    ];
  }

  /**
   * Handle new WebSocket connection for chat
   */
  handleConnection(socket) {
    // Join chat room
    socket.on('chat:join', (data) => {
      this.handleJoinChat(socket, data);
    });

    // Leave chat room
    socket.on('chat:leave', (data) => {
      this.handleLeaveChat(socket, data);
    });

    // Send message
    socket.on('chat:message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Send reaction
    socket.on('chat:reaction', (data) => {
      this.handleChatReaction(socket, data);
    });

    // Moderation actions
    socket.on('chat:moderate', (data) => {
      this.handleModerationAction(socket, data);
    });

    // Get chat history
    socket.on('chat:history', (data) => {
      this.handleChatHistory(socket, data);
    });

    // Typing indicator
    socket.on('chat:typing', (data) => {
      this.handleTypingIndicator(socket, data);
    });
  }

  /**
   * Initialize chat commands after constructor
   */
  initializeCommands() {
    // For now, keep commands simple to avoid binding issues
    this.chatCommands = {
      '/help': (socket, user, streamId, args) => {
        socket.emit('chat:message', {
          id: uuidv4(),
          type: 'system',
          message: 'Available commands: /help, /clear (mods only)',
          timestamp: Date.now()
        });
      }
    };
  }

  /**
   * Handle user joining chat
   */
  async handleJoinChat(socket, data) {
    try {
      const { streamId, userId, username, role } = data;

      if (!streamId) {
        socket.emit('chat:error', { message: 'Stream ID is required' });
        return;
      }

      // Initialize chat room if it doesn't exist
      if (!this.chatRooms.has(streamId)) {
        this.chatRooms.set(streamId, {
          streamId,
          users: new Map(),
          messageCount: 0,
          settings: {
            slowMode: false,
            slowModeDelay: 0,
            followersOnly: false,
            subscribersOnly: false,
            chatEnabled: true
          },
          moderators: new Set(),
          bannedUsers: new Set(),
          mutedUsers: new Map() // userId -> unmute timestamp
        });
      }

      const room = this.chatRooms.get(streamId);

      // Check if user is banned
      if (room.bannedUsers.has(userId)) {
        socket.emit('chat:error', { message: 'You are banned from this chat' });
        return;
      }

      // Add user to room
      room.users.set(socket.id, {
        socketId: socket.id,
        userId,
        username,
        role: role || 'viewer',
        joinedAt: new Date(),
        messageCount: 0
      });

      // Join socket room
      socket.join(`chat:${streamId}`);

      // Send join confirmation
      socket.emit('chat:joined', {
        streamId,
        userCount: room.users.size,
        settings: room.settings,
        emojiList: this.emojiList
      });

      // Notify others about new user
      socket.to(`chat:${streamId}`).emit('chat:user-joined', {
        userId,
        username,
        role
      });

      // Send recent chat history
      await this.sendChatHistory(socket, streamId, 50);

      this.logger.debug(`User ${username} joined chat for stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error handling join chat:', error);
      socket.emit('chat:error', { message: 'Failed to join chat' });
    }
  }

  /**
   * Handle user leaving chat
   */
  handleLeaveChat(socket, data) {
    try {
      const { streamId } = data;
      const room = this.chatRooms.get(streamId);

      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);

        // Leave socket room
        socket.leave(`chat:${streamId}`);

        // Notify others about user leaving
        socket.to(`chat:${streamId}`).emit('chat:user-left', {
          userId: user.userId,
          username: user.username
        });

        this.logger.debug(`User ${user.username} left chat for stream ${streamId}`);
      }
    } catch (error) {
      this.logger.error('Error handling leave chat:', error);
    }
  }

  /**
   * Handle chat message
   */
  async handleChatMessage(socket, data) {
    try {
      const { streamId, message, messageType = 'text' } = data;
      const room = this.chatRooms.get(streamId);

      if (!room || !room.users.has(socket.id)) {
        socket.emit('chat:error', { message: 'Not in chat room' });
        return;
      }

      const user = room.users.get(socket.id);

      // Check if chat is enabled
      if (!room.settings.chatEnabled) {
        socket.emit('chat:error', { message: 'Chat is disabled' });
        return;
      }

      // Check if user is muted
      const muteExpiry = room.mutedUsers.get(user.userId);
      if (muteExpiry && Date.now() < muteExpiry) {
        socket.emit('chat:error', { message: 'You are temporarily muted' });
        return;
      }

      // Rate limiting
      if (!this.checkRateLimit(user.userId)) {
        socket.emit('chat:error', { message: 'You are sending messages too quickly' });
        return;
      }

      // Validate message
      const validationResult = this.validateMessage(message);
      if (!validationResult.valid) {
        socket.emit('chat:error', { message: validationResult.reason });
        return;
      }

      // Check for chat commands
      if (message.startsWith('/')) {
        await this.handleChatCommand(socket, user, streamId, message);
        return;
      }

      // Process message (profanity filter, spam detection)
      const processedMessage = await this.processMessage(message, user);

      // Create message object
      const chatMessage = {
        id: uuidv4(),
        streamId,
        userId: user.userId,
        username: user.username,
        role: user.role,
        message: processedMessage.text,
        messageType,
        timestamp: new Date().toISOString(),
        edited: false,
        deleted: false,
        flagged: processedMessage.flagged
      };

      // Save message to database
      await this.saveChatMessage(chatMessage);

      // Broadcast message to chat room
      this.io.to(`chat:${streamId}`).emit('chat:message', chatMessage);

      // Update user message count
      user.messageCount++;
      room.messageCount++;

      // Update analytics
      await this.updateChatAnalytics(streamId, user.userId);

      this.logger.debug(`Chat message sent in stream ${streamId} by ${user.username}`);
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle chat reaction
   */
  async handleChatReaction(socket, data) {
    try {
      const { streamId, emoji, targetMessageId } = data;
      const room = this.chatRooms.get(streamId);

      if (!room || !room.users.has(socket.id)) {
        return;
      }

      const user = room.users.get(socket.id);

      // Validate emoji
      if (!this.emojiList.includes(emoji)) {
        socket.emit('chat:error', { message: 'Invalid emoji' });
        return;
      }

      const reaction = {
        id: uuidv4(),
        streamId,
        userId: user.userId,
        username: user.username,
        emoji,
        targetMessageId,
        timestamp: new Date().toISOString()
      };

      // Save reaction
      await this.saveChatReaction(reaction);

      // Broadcast reaction
      this.io.to(`chat:${streamId}`).emit('chat:reaction', reaction);

      this.logger.debug(`Reaction ${emoji} sent by ${user.username} in stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error handling chat reaction:', error);
    }
  }

  /**
   * Validate chat message
   */
  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, reason: 'Message is required' };
    }

    if (message.length > this.moderationConfig.maxMessageLength) {
      return { valid: false, reason: 'Message is too long' };
    }

    if (message.trim().length === 0) {
      return { valid: false, reason: 'Message cannot be empty' };
    }

    return { valid: true };
  }

  /**
   * Check rate limiting for user
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimits = this.rateLimits.get(userId) || [];

    // Remove old timestamps (older than 1 minute)
    const recentMessages = userLimits.filter(timestamp => now - timestamp < 60000);

    // Check if user exceeded rate limit
    if (recentMessages.length >= this.moderationConfig.messagesPerMinute) {
      return false;
    }

    // Add current timestamp
    recentMessages.push(now);
    this.rateLimits.set(userId, recentMessages);

    return true;
  }

  /**
   * Process message for moderation
   */
  async processMessage(message, user) {
    let processedText = message;
    let flagged = false;

    // Profanity filter
    if (this.moderationConfig.enableProfanityFilter) {
      for (const word of this.profanityWords) {
        const regex = new RegExp(word, 'gi');
        if (regex.test(processedText)) {
          processedText = processedText.replace(regex, '*'.repeat(word.length));
          flagged = true;
        }
      }
    }

    // Spam detection (basic implementation)
    if (this.moderationConfig.enableSpamDetection) {
      // Check for repeated characters
      if (/(.)\1{4,}/.test(processedText)) {
        flagged = true;
      }

      // Check for excessive caps
      const capsRatio = (processedText.match(/[A-Z]/g) || []).length / processedText.length;
      if (capsRatio > 0.7 && processedText.length > 10) {
        flagged = true;
      }
    }

    return {
      text: processedText,
      flagged
    };
  }

  /**
   * Handle chat commands
   */
  async handleChatCommand(socket, user, streamId, message) {
    const [command, ...args] = message.split(' ');
    const commandHandler = this.chatCommands[command.toLowerCase()];

    if (commandHandler) {
      await commandHandler(socket, user, streamId, args);
    } else {
      socket.emit('chat:error', { message: 'Unknown command' });
    }
  }

  /**
   * Chat command handlers
   */
  async handleHelpCommand(socket, user, streamId, args) {
    const helpText = `
Available commands:
/help - Show this help message
/clear - Clear chat (moderators only)
/timeout <user> <duration> - Timeout user (moderators only)
/ban <user> - Ban user (moderators only)
/unban <user> - Unban user (moderators only)
/slow <seconds> - Enable slow mode (moderators only)
    `;

    socket.emit('chat:system-message', {
      message: helpText,
      type: 'help'
    });
  }

  async handleClearCommand(socket, user, streamId, args) {
    const room = this.chatRooms.get(streamId);
    
    if (!this.isUserModerator(user, room)) {
      socket.emit('chat:error', { message: 'Only moderators can clear chat' });
      return;
    }

    // Broadcast clear chat event
    this.io.to(`chat:${streamId}`).emit('chat:clear');

    // Log moderation action
    this.logger.info(`Chat cleared by ${user.username} in stream ${streamId}`);
  }

  /**
   * Save chat message to database
   */
  async saveChatMessage(message) {
    try {
      // Store in Redis for recent history
      const key = `chat:${message.streamId}:messages`;
      await this.redis.lpush(key, JSON.stringify(message));
      await this.redis.ltrim(key, 0, 999); // Keep last 1000 messages
      await this.redis.expire(key, 86400); // 24 hours TTL

      // TODO: Save to MySQL database for permanent storage
      this.logger.debug(`Chat message saved for stream ${message.streamId}`);
    } catch (error) {
      this.logger.error('Error saving chat message:', error);
    }
  }

  /**
   * Save chat reaction
   */
  async saveChatReaction(reaction) {
    try {
      const key = `chat:${reaction.streamId}:reactions`;
      await this.redis.lpush(key, JSON.stringify(reaction));
      await this.redis.ltrim(key, 0, 499); // Keep last 500 reactions
      await this.redis.expire(key, 86400); // 24 hours TTL
    } catch (error) {
      this.logger.error('Error saving chat reaction:', error);
    }
  }

  /**
   * Send chat history to user
   */
  async sendChatHistory(socket, streamId, limit = 50) {
    try {
      const key = `chat:${streamId}:messages`;
      const messages = await this.redis.lrange(key, 0, limit - 1);
      
      const parsedMessages = messages.reverse().map(msg => JSON.parse(msg));
      
      socket.emit('chat:history', {
        streamId,
        messages: parsedMessages
      });
    } catch (error) {
      this.logger.error('Error sending chat history:', error);
    }
  }

  /**
   * Update chat analytics
   */
  async updateChatAnalytics(streamId, userId) {
    try {
      const analyticsKey = `analytics:chat:${streamId}`;
      const analytics = await this.redis.get(analyticsKey) || '{}';
      const data = JSON.parse(analytics);

      data.totalMessages = (data.totalMessages || 0) + 1;
      data.uniqueUsers = data.uniqueUsers || new Set();
      data.uniqueUsers.add(userId);
      data.lastActivity = Date.now();

      await this.redis.setEx(analyticsKey, 86400, JSON.stringify({
        ...data,
        uniqueUsers: Array.from(data.uniqueUsers)
      }));
    } catch (error) {
      this.logger.error('Error updating chat analytics:', error);
    }
  }

  /**
   * Check if user is moderator
   */
  isUserModerator(user, room) {
    return user.role === 'moderator' || user.role === 'broadcaster' || room.moderators.has(user.userId);
  }

  /**
   * Get chat room statistics
   */
  getChatRoomStats(streamId) {
    const room = this.chatRooms.get(streamId);
    if (!room) {
      return null;
    }

    return {
      streamId,
      userCount: room.users.size,
      messageCount: room.messageCount,
      settings: room.settings,
      moderatorCount: room.moderators.size,
      bannedUserCount: room.bannedUsers.size
    };
  }

  /**
   * Get all active chat rooms
   */
  getAllChatRooms() {
    const rooms = [];
    for (const [streamId, room] of this.chatRooms) {
      rooms.push(this.getChatRoomStats(streamId));
    }
    return rooms;
  }
}

module.exports = ChatManager;
