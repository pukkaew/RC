// Service for LINE API interactions
const line = require('@line/bot-sdk');
const lineConfig = require('../config/line');
const commandConfig = require('../config/commands');
const logger = require('../utils/Logger');
const { AppError } = require('../utils/ErrorHandler');

class LineService {
  constructor() {
    this.lineConfig = {
      channelAccessToken: lineConfig.channelAccessToken,
      channelSecret: lineConfig.channelSecret
    };
    
    this.client = new line.Client(this.lineConfig);
    this.messageTypes = lineConfig.messageTypes;
    this.userStates = new Map(); // In-memory storage for user states
    this.uploadInfo = new Map(); // Track users upload information
  }

  // Check if a message starts with a specific command prefix
  isCommand(text, commandType) {
    const prefix = commandConfig.prefixes[commandType];
    return text.trim().toLowerCase().startsWith(prefix.toLowerCase());
  }

  // Get user upload info
  getUploadInfo(userId) {
    return this.uploadInfo.get(userId);
  }

  // Set user upload info
  setUploadInfo(userId, info) {
    if (info === null) {
      this.uploadInfo.delete(userId);
      return;
    }
    this.uploadInfo.set(userId, info);
  }

  // Verify LINE webhook signature
  verifySignature(body, signature) {
    return line.validateSignature(JSON.stringify(body), this.lineConfig.channelSecret, signature);
  }

  // Reply to a message
  async replyMessage(replyToken, messages) {
    try {
      if (!Array.isArray(messages)) {
        messages = [messages];
      }
      
      await this.client.replyMessage(replyToken, messages);
      return true;
    } catch (error) {
      logger.error('Error replying to LINE message:', error);
      throw new AppError('Failed to reply to message', 500, { error: error.message });
    }
  }

  // Push a message to a user
  async pushMessage(userId, messages) {
    try {
      if (!Array.isArray(messages)) {
        messages = [messages];
      }
      
      await this.client.pushMessage(userId, messages);
      return true;
    } catch (error) {
      logger.error('Error pushing LINE message:', error);
      throw new AppError('Failed to push message', 500, { error: error.message });
    }
  }

  // Get user profile from LINE
  async getUserProfile(userId) {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      logger.error('Error getting LINE user profile:', error);
      throw new AppError('Failed to get user profile', 500, { error: error.message });
    }
  }

  // Create a text message
  createTextMessage(text) {
    return {
      type: this.messageTypes.text,
      text: text
    };
  }

  // Create an image message
  createImageMessage(originalUrl, previewUrl = null) {
    // Ensure URL uses BASE_URL environment variable for external access
    if (originalUrl.startsWith('/')) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      originalUrl = baseUrl + originalUrl;
      previewUrl = previewUrl ? baseUrl + previewUrl : originalUrl;
    }
    
    return {
      type: this.messageTypes.image,
      originalContentUrl: originalUrl,
      previewImageUrl: previewUrl || originalUrl
    };
  }

  // Create a quick reply message
  createQuickReplyMessage(text, items) {
    return {
      type: this.messageTypes.text,
      text: text,
      quickReply: {
        items: items
      }
    };
  }

  // Set a user's state
  setUserState(userId, state, data = {}) {
    this.userStates.set(userId, { state, data });
  }

  // Get a user's state
  getUserState(userId) {
    return this.userStates.get(userId) || { state: lineConfig.userStates.idle, data: {} };
  }

  // Clear a user's state
  clearUserState(userId) {
    this.userStates.delete(userId);
  }
}

module.exports = new LineService();