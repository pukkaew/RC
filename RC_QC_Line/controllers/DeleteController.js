// Controller for handling image deletion
const lineConfig = require('../config/line');
const lineService = require('../services/LineService');
const deleteService = require('../services/DeleteService');
const datePickerService = require('../services/DatePickerService');
const logger = require('../utils/Logger');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');

class DeleteController {
  // Request Lot number for deleting images
  async requestLotNumber(userId, replyToken) {
    try {
      // Set user state to waiting for Lot number
      lineService.setUserState(userId, lineConfig.userStates.waitingForLot, {
        action: 'delete'
      });
      
      // Ask for Lot number
      const requestMessage = {
        type: 'text',
        text: 'กรุณาระบุเลข Lot ของรูปภาพที่ต้องการลบ'
      };
      
      await lineService.replyMessage(replyToken, requestMessage);
    } catch (error) {
      logger.error('Error requesting Lot number for deleting:', error);
      throw error;
    }
  }

  // Process Lot number and show date picker with available dates
  async processLotNumber(userId, lotNumber, replyToken) {
    try {
      // Validate lot number
      if (!lotNumber || lotNumber.trim() === '') {
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      // Show date picker with only dates that have images and delete action
      await datePickerService.sendDeleteDatePicker(userId, lotNumber.trim());
      
      // Confirm Lot number
      await lineService.replyMessage(
        replyToken,
        lineService.createTextMessage(`ได้รับเลข Lot: ${lotNumber} กรุณาเลือกวันที่ที่มีรูปภาพที่ต้องการลบ`)
      );
    } catch (error) {
      logger.error('Error processing Lot number for deleting:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection and show images for deletion
  async processDateSelection(userId, lotNumber, date, replyToken) {
    try {
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle);
      
      // Create image delete selector
      const deleteSelector = await deleteService.createImageDeleteSelector(lotNumber, date);
      
      // Send message
      await lineService.replyMessage(replyToken, deleteSelector);
    } catch (error) {
      logger.error('Error processing date selection for deletion:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle image deletion request (confirmation)
  async handleDeleteRequest(userId, imageId, lotNumber, date, replyToken) {
    try {
      // Create confirmation message
      const confirmMessage = await deleteService.createDeleteConfirmationMessage(imageId, lotNumber, date);
      
      // Send confirmation
      await lineService.replyMessage(replyToken, confirmMessage);
    } catch (error) {
      logger.error('Error handling delete request:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดำเนินการลบรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle delete confirmation
  async handleDeleteConfirmation(userId, imageId, lotNumber, date, replyToken) {
    try {
      // Delete the image
      await deleteService.deleteImage(imageId);
      
      // Send success message
      const successMessage = {
        type: 'text',
        text: `ลบรูปภาพสำเร็จ\nLot: ${lotNumber}\nวันที่: ${new Date(date).toLocaleDateString('th-TH')}`
      };
      
      await lineService.replyMessage(replyToken, successMessage);
    } catch (error) {
      logger.error('Error confirming image deletion:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการลบรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle delete cancellation
  async handleDeleteCancellation(userId, lotNumber, date, replyToken) {
    try {
      // Send cancellation message
      const cancelMessage = {
        type: 'text',
        text: 'ยกเลิกการลบรูปภาพแล้ว'
      };
      
      await lineService.replyMessage(replyToken, cancelMessage);
    } catch (error) {
      logger.error('Error handling delete cancellation:', error);
      throw error;
    }
  }
}

module.exports = new DeleteController();