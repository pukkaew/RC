// Controller for handling LINE webhook events - Updated for Multi-Chat Support
const line = require('@line/bot-sdk');
const lineConfig = require('../config/line');
const commandConfig = require('../config/commands');
const lineService = require('../services/LineService');
const uploadController = require('./UploadController');
const imageController = require('./ImageController');
const userController = require('./UserController');
const deleteController = require('./DeleteController');
const correctController = require('./CorrectController');
const logger = require('../utils/Logger');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');

class WebhookController {
  constructor() {
    // คำสั่งและ aliases ทั้งหมด (รวมภาษาไทยและอังกฤษ)
    this.allCommandAliases = this.buildCommandAliases();
  }

  // สร้างรายการคำสั่งและ aliases ทั้งหมด
  buildCommandAliases() {
    const allAliases = {};
    
    // เพิ่มคำสั่งหลัก
    Object.entries(commandConfig.prefixes).forEach(([key, prefix]) => {
      allAliases[prefix.toLowerCase()] = key;
    });
    
    // เพิ่ม English aliases
    Object.entries(commandConfig.englishAliases).forEach(([command, aliases]) => {
      aliases.forEach(alias => {
        allAliases[alias.toLowerCase()] = Object.keys(commandConfig.prefixes).find(
          key => commandConfig.prefixes[key] === command
        );
      });
    });
    
    // เพิ่ม Thai aliases
    Object.entries(commandConfig.thaiAliases).forEach(([command, aliases]) => {
      aliases.forEach(alias => {
        allAliases[alias.toLowerCase()] = Object.keys(commandConfig.prefixes).find(
          key => commandConfig.prefixes[key] === command
        );
      });
    });
    
    return allAliases;
  }

  // ตรวจสอบและระบุคำสั่ง
  identifyCommand(text) {
    if (!text) return { isCommand: false };
    
    const parts = text.trim().split(/\s+/);
    const firstWord = parts[0].toLowerCase();
    const commandKey = this.allCommandAliases[firstWord];
    
    if (!commandKey) return { isCommand: false };
    
    return {
      isCommand: true,
      commandKey: commandKey,
      commandPrefix: firstWord,
      args: parts.slice(1),
      originalText: text
    };
  }

  // Handle webhook verification
  verifyWebhook(req, res) {
    const signature = req.headers['x-line-signature'];
    
    if (!signature) {
      throw new AppError('Missing signature', 401);
    }
    
    try {
      const body = req.body;
      const isValid = lineService.verifySignature(body, signature);
      
      if (!isValid) {
        throw new AppError('Invalid signature', 401);
      }
      
      return true;
    } catch (error) {
      logger.error('Webhook verification failed:', error);
      throw new AppError('Webhook verification failed', 401);
    }
  }

  // Handle webhook events
  handleWebhook = asyncHandler(async (req, res) => {
    try {
      // Verify webhook
      this.verifyWebhook(req, res);
      
      const events = req.body.events;
      
      if (!events || events.length === 0) {
        return res.status(200).send('No events');
      }
      
      // Process each event
      for (const event of events) {
        await this.processEvent(event);
      }
      
      return res.status(200).send('OK');
    } catch (error) {
      logger.error('Error handling webhook:', error);
      
      // Send 200 even on error to avoid LINE retries
      return res.status(200).send('Error handled');
    }
  });

  // Process an individual event
  async processEvent(event) {
    try {
      const { type, source, message, postback, replyToken } = event;
      const userId = source.userId;
      
      // Extract chat context for multi-chat support
      const chatContext = lineService.getChatContext(source);
      
      // Skip processing if this is a group message and not a command
      if (source.type === 'group' || source.type === 'room') {
        // Only process messages that are commands
        if (type === 'message' && message.type === 'text') {
          const commandInfo = this.identifyCommand(message.text);
          if (!commandInfo.isCommand) {
            // Ignore non-command messages in groups
            return;
          }
        } else if (type === 'message' && message.type === 'image') {
          // Process images only if user is in upload mode for this specific chat
          const userUploadInfo = lineService.getUploadInfo(userId, chatContext.chatId);
          if (!userUploadInfo || !userUploadInfo.isActive) {
            // Ignore images in groups if not in upload mode
            return;
          }
        } else if (type !== 'postback') {
          // Ignore other types of messages in groups
          return;
        }
      }
      
      // Register or update user
      await userController.registerUser(userId);
      
      // Handle different event types
      switch (type) {
        case 'message':
          await this.handleMessageEvent(userId, message, replyToken, chatContext);
          break;
          
        case 'postback':
          await this.handlePostbackEvent(userId, postback, replyToken, chatContext);
          break;
          
        case 'follow':
          await this.handleFollowEvent(userId, replyToken);
          break;
          
        case 'unfollow':
          await this.handleUnfollowEvent(userId);
          break;
          
        default:
          logger.info(`Unhandled event type: ${type}`);
          break;
      }
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  // Handle message events
  async handleMessageEvent(userId, message, replyToken, chatContext) {
    try {
      const { type, id } = message;
      
      // Get current user state with chat context
      const userState = lineService.getUserState(userId, chatContext.chatId);
      
      // Handle message based on type
      switch (type) {
        case 'text':
          await this.handleTextMessage(userId, message, replyToken, userState, chatContext);
          break;
          
        case 'image':
          // Process images only if user is in upload mode for this specific chat
          const userUploadInfo = lineService.getUploadInfo(userId, chatContext.chatId);
          if (userUploadInfo && userUploadInfo.isActive) {
            await this.handleImageMessage(userId, message, replyToken, userState, userUploadInfo, chatContext);
          }
          break;
          
        default:
          // Don't reply with unsupported message type to avoid spam
          // Only reply if it's a direct message to the bot
          if (!chatContext.isGroupChat) {
            const unsupportedMessage = `ขออภัย ไม่รองรับข้อความประเภท "${type}"`;
            await lineService.replyMessage(replyToken, lineService.createTextMessage(unsupportedMessage));
          }
          break;
      }
    } catch (error) {
      logger.error('Error handling message event:', error);
      throw error;
    }
  }

  // Handle text messages
  async handleTextMessage(userId, message, replyToken, userState, chatContext) {
    try {
      const { text } = message;
      const { state, data } = userState;
      const chatId = chatContext.chatId;
      
      // ตรวจสอบว่าเป็นคำสั่งหรือไม่
      const commandInfo = this.identifyCommand(text);
      
      // ถ้าอยู่ในสถานะรอข้อมูล (ไม่ใช่ idle) และไม่ใช่คำสั่ง #cancel
      if (state !== lineConfig.userStates.idle && 
          (!commandInfo.isCommand || commandInfo.commandKey !== 'cancel')) {
        // ถ้าอยู่ในสถานะรอ Lot
        if (state === lineConfig.userStates.waitingForLot) {
          const lotNumber = text.trim();
          
          // ตรวจสอบ Lot
          if (!lotNumber) {
            await lineService.replyMessage(
              replyToken,
              lineService.createTextMessage('กรุณาระบุเลข Lot ที่ถูกต้อง')
            );
            return;
          }
          
          // จัดการตาม action
          if (data.action === lineConfig.userActions.upload) {
            await uploadController.processLotNumber(userId, lotNumber, replyToken, chatContext);
          } else if (data.action === lineConfig.userActions.view) {
            await imageController.processLotNumber(userId, lotNumber, replyToken, chatContext);
          } else if (data.action === 'delete') {
            await deleteController.processLotNumber(userId, lotNumber, replyToken, chatContext);
          } else if (data.action === 'correct') {
            await correctController.processOldLot(userId, lotNumber, replyToken, chatContext);
          }
          return;
        }
        
        // ถ้าอยู่ในสถานะรอ Lot ใหม่ (สำหรับการแก้ไข)
        if (state === lineConfig.userStates.waitingForNewLot) {
          const newLotNumber = text.trim();
          
          // ตรวจสอบ Lot ใหม่
          if (!newLotNumber) {
            await lineService.replyMessage(
              replyToken,
              lineService.createTextMessage('กรุณาระบุเลข Lot ใหม่ที่ถูกต้อง')
            );
            return;
          }
          
          // จัดการการแก้ไข Lot
          await correctController.processNewLot(userId, data.oldLot, newLotNumber, replyToken, chatContext);
          return;
        }
      }
      
      // คำสั่ง #cancel มีความสำคัญสูงสุด
      if (commandInfo.isCommand && commandInfo.commandKey === 'cancel') {
        // ยกเลิกการทำงานปัจจุบัน
        lineService.clearUserState(userId, chatId);
        lineService.setUploadInfo(userId, null, chatId);
        
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ยกเลิกการทำงานปัจจุบันแล้ว')
        );
        return;
      }
      
      // จัดการคำสั่งต่างๆ
      if (commandInfo.isCommand) {
        switch (commandInfo.commandKey) {
          case 'upload':
          case 'uploadShort':
            // กรณีระบุ Lot มาพร้อมกับคำสั่ง (เช่น #up ABC123)
            if (commandInfo.args.length > 0) {
              const lotNumber = commandInfo.args[0];
              await uploadController.setupUploadWithLot(userId, lotNumber, replyToken, chatContext);
            } else {
              // กรณีไม่ระบุ Lot
              await uploadController.requestLotNumber(userId, replyToken, 0, chatContext);
            }
            break;
            
          case 'view':
          case 'viewShort':
            // กรณีระบุ Lot มาพร้อมกับคำสั่ง (เช่น #view ABC123)
            if (commandInfo.args.length > 0) {
              const lotNumber = commandInfo.args[0];
              await imageController.processLotNumber(userId, lotNumber, replyToken, chatContext);
            } else {
              // กรณีไม่ระบุ Lot
              await imageController.requestLotNumber(userId, replyToken, chatContext);
            }
            break;
            
          case 'delete':
          case 'deleteShort':
            // กรณีระบุ Lot มาพร้อมกับคำสั่ง (เช่น #del ABC123)
            if (commandInfo.args.length > 0) {
              const lotNumber = commandInfo.args[0];
              await deleteController.processLotNumber(userId, lotNumber, replyToken, chatContext);
            } else {
              // กรณีไม่ระบุ Lot
              await deleteController.requestLotNumber(userId, replyToken, chatContext);
            }
            break;
            
          case 'correct':
          case 'correctShort':
            // กรณีระบุ Lot เก่าและใหม่มาพร้อมกับคำสั่ง (เช่น #correct ABC123 XYZ789)
            if (commandInfo.args.length >= 2) {
              const oldLot = commandInfo.args[0];
              const newLot = commandInfo.args[1];
              await correctController.correctLot(userId, oldLot, newLot, replyToken, chatContext);
            } 
            // กรณีระบุเฉพาะ Lot เก่า (เช่น #correct ABC123)
            else if (commandInfo.args.length === 1) {
              const oldLot = commandInfo.args[0];
              await correctController.requestNewLot(userId, oldLot, replyToken, chatContext);
            }
            // กรณีไม่ระบุ Lot
            else {
              await correctController.requestOldLot(userId, replyToken, chatContext);
            }
            break;
            
          case 'help':
          case 'helpShort':
            // แสดงวิธีใช้งานตามที่ระบุ
            if (commandInfo.args.length > 0) {
              const helpType = commandInfo.args[0].toLowerCase();
              if (helpType === 'upload' || helpType === 'up' || helpType === 'อัปโหลด') {
                await lineService.replyMessage(
                  replyToken,
                  lineService.createTextMessage(commandConfig.helpText.upload)
                );
              } else if (helpType === 'view' || helpType === 'ดู') {
                await lineService.replyMessage(
                  replyToken,
                  lineService.createTextMessage(commandConfig.helpText.view)
                );
              } else if (helpType === 'delete' || helpType === 'del' || helpType === 'ลบ') {
                await lineService.replyMessage(
                  replyToken,
                  lineService.createTextMessage(commandConfig.helpText.delete)
                );
              } else if (helpType === 'correct' || helpType === 'cor' || helpType === 'แก้ไข') {
                await lineService.replyMessage(
                  replyToken,
                  lineService.createTextMessage(commandConfig.helpText.correct)
                );
              } else {
                await lineService.replyMessage(
                  replyToken,
                  lineService.createTextMessage(commandConfig.helpText.general)
                );
              }
            } else {
              // แสดงวิธีใช้งานทั่วไป
              await lineService.replyMessage(
                replyToken,
                lineService.createTextMessage(commandConfig.helpText.general)
              );
            }
            break;
            
          default:
            logger.warn(`Unknown command: ${commandInfo.commandPrefix}`);
            break;
        }
      }
    } catch (error) {
      logger.error('Error handling text message:', error);
      throw error;
    }
  }

  // Handle image messages
  async handleImageMessage(userId, message, replyToken, userState, uploadInfo, chatContext) {
    try {
      // ถ้ามี Lot กำหนดไว้แล้ว ให้อัปโหลดทันที
      if (uploadInfo.lotNumber) {
        await uploadController.handleImageUploadWithLot(
          userId, 
          message, 
          replyToken, 
          uploadInfo.lotNumber,
          chatContext
        );
      } else {
        // ถ้ายังไม่มี Lot ให้ทำงานแบบเดิม
        await uploadController.handleImageUpload(userId, message, replyToken, chatContext);
      }
    } catch (error) {
      logger.error('Error handling image message:', error);
      throw error;
    }
  }

  // Handle postback events (from buttons, date picker, advanced actions)
  async handlePostbackEvent(userId, postback, replyToken, chatContext) {
    try {
      const { data } = postback;
      
      // Parse postback data
      const params = new URLSearchParams(data);
      const action = params.get('action');
      const lotNumber = params.get('lot');
      const date = params.get('date');
      
      // Handle based on action
      if (action === lineConfig.userActions.upload) {
        // Forward to upload controller
        await uploadController.processDateSelection(userId, lotNumber, date, replyToken, chatContext);
        // Reset upload mode after completion
        lineService.setUploadInfo(userId, null, chatContext.chatId);
      } else if (action === lineConfig.userActions.view) {
        // This should not happen anymore - we open LIFF directly
        logger.warn('Unexpected postback for view action - should open LIFF directly');
        // Fallback to old behavior
        await imageController.processDateSelection(userId, lotNumber, date, replyToken, chatContext);
      } else if (action === 'delete') {
        // Forward to delete controller for showing delete options
        await deleteController.processDateSelection(userId, lotNumber, date, replyToken, chatContext);
      } else if (action === 'delete_image') {
        // Handle image deletion request
        const imageId = params.get('image_id');
        await deleteController.handleDeleteRequest(userId, imageId, lotNumber, date, replyToken, chatContext);
      } else if (action === 'confirm_delete') {
        // Handle delete confirmation
        const imageId = params.get('image_id');
        await deleteController.handleDeleteConfirmation(userId, imageId, lotNumber, date, replyToken, chatContext);
      } else if (action === 'cancel_delete') {
        // Handle delete cancellation
        await deleteController.handleDeleteCancellation(userId, lotNumber, date, replyToken, chatContext);
      } else if (action === 'send_to_chat') {
        // This action is deprecated - we now open LIFF directly
        logger.warn('Deprecated action: send_to_chat');
      } else if (action === 'carousel_share') {
        // Handle carousel sharing
        await this.handleCarouselSharing(userId, params, replyToken, chatContext);
      } else if (action === 'smart_share') {
        // Handle smart grid sharing
        await this.handleSmartSharing(userId, params, replyToken, chatContext);
      } else {
        logger.warn(`Unknown postback action: ${action}`);
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่สามารถดำเนินการได้ โปรดลองใหม่อีกครั้ง')
        );
      }
    } catch (error) {
      logger.error('Error handling postback event:', error);
      throw error;
    }
  }

  // Handle carousel sharing
  async handleCarouselSharing(userId, params, replyToken, chatContext) {
    try {
      const imageUrl = decodeURIComponent(params.get('image_url'));
      const index = params.get('index');
      const lotNumber = params.get('lot');
      
      if (!imageUrl) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่สามารถแชร์รูปภาพได้ โปรดลองใหม่อีกครั้ง')
        );
        return;
      }
      
      // Create native image message
      const imageMessage = lineService.createImageMessage(imageUrl);
      
      // Send the image
      await lineService.replyMessage(replyToken, imageMessage);
      
      logger.info(`Carousel share: User ${userId}, image ${index}, Lot ${lotNumber}, Chat: ${chatContext.chatId}`);
      
    } catch (error) {
      logger.error('Error handling carousel sharing:', error);
      
      const errorMessage = 'เกิดข้อผิดพลาดในการแชร์รูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle smart sharing
  async handleSmartSharing(userId, params, replyToken, chatContext) {
    try {
      const imageUrl = decodeURIComponent(params.get('image_url'));
      const index = params.get('index');
      const lotNumber = params.get('lot');
      
      if (!imageUrl) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่สามารถแชร์รูปภาพได้ โปรดลองใหม่อีกครั้ง')
        );
        return;
      }
      
      // Create native image message
      const imageMessage = lineService.createImageMessage(imageUrl);
      
      // Send the image
      await lineService.replyMessage(replyToken, imageMessage);
      
      logger.info(`Smart share: User ${userId}, image ${index}, Lot ${lotNumber}, Chat: ${chatContext.chatId}`);
      
    } catch (error) {
      logger.error('Error handling smart sharing:', error);
      
      const errorMessage = 'เกิดข้อผิดพลาดในการแชร์รูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle follow events (user adds the bot)
  async handleFollowEvent(userId, replyToken) {
    try {
      // Register new user
      await userController.registerUser(userId);
      
      // Send welcome message
      const welcomeMessage = 'ยินดีต้อนรับสู่ระบบจัดการรูปภาพสินค้า QC\n\n' +
        'คำสั่งที่ใช้ได้:\n' +
        `• ${commandConfig.prefixes.upload} [LOT] - อัปโหลดรูปภาพ\n` +
        `• ${commandConfig.prefixes.view} [LOT] - ดูรูปภาพ\n` +
        `• ${commandConfig.prefixes.delete} [LOT] - ลบรูปภาพ\n` +
        `• ${commandConfig.prefixes.correct} [OLD] [NEW] - แก้ไขเลข Lot\n` +
        `• ${commandConfig.prefixes.help} - วิธีใช้งาน`;
      
      await lineService.replyMessage(
        replyToken,
        lineService.createTextMessage(welcomeMessage)
      );
    } catch (error) {
      logger.error('Error handling follow event:', error);
      throw error;
    }
  }

  // Handle unfollow events (user blocks the bot)
  async handleUnfollowEvent(userId) {
    try {
      // Update user status
      await userController.deactivateUser(userId);
      
      // Clear all user states and modes across all chats
      lineService.clearAllUserStates(userId);
      
      // Clear upload info for all chats
      const allUploads = lineService.getAllUploadInfoForUser(userId);
      allUploads.forEach(upload => {
        lineService.setUploadInfo(userId, null, upload.chatId);
      });
      
      logger.info(`User ${userId} has unfollowed the bot`);
    } catch (error) {
      logger.error('Error handling unfollow event:', error);
      throw error;
    }
  }

  // Get system statistics for monitoring
  getSystemStatistics() {
    return {
      activeStates: lineService.getActiveStates(),
      uploadStats: uploadController.getUploadStatistics(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WebhookController();