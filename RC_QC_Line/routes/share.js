// Routes for image sharing - Enhanced Version
const express = require('express');
const router = express.Router();
const imageShareService = require('../services/ImageShareService');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');
const archiver = require('archiver');

// Create share session (Enhanced for LIFF)
router.post('/create-share', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating share session for user: ${userId}, lot: ${lotNumber}, images: ${imageIds?.length}`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if provided
    let imagesToShare = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToShare = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Create share session
    const shareSession = await imageShareService.createShareSession(
      userId,
      imagesToShare,
      lotNumber,
      imageDate
    );
    
    // Create shareable message
    const shareMessage = imageShareService.createShareableMessage(shareSession.sessionId);
    
    res.json({
      success: true,
      sessionId: shareSession.sessionId,
      shareUrl: shareSession.shareUrl,
      shareMessage: shareMessage,
      imageCount: imagesToShare.length,
      images: shareSession.images
    });
    
  } catch (error) {
    logger.error('Error creating share session:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Share page - Enhanced with LINE Share functionality
router.get('/share/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Share Expired</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 12px; max-width: 400px; margin: auto; }
              h1 { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ ลิงก์หมดอายุ</h1>
              <p>ลิงก์แชร์นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่</p>
            </div>
          </body>
        </html>
      `);
    }
    
    // Create enhanced HTML page with share options
    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <title>แชร์รูปภาพ QC - ${session.lotNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:title" content="รูปภาพ QC - Lot ${session.lotNumber}">
  <meta property="og:description" content="${session.images.length} รูปภาพ">
  <meta property="og:image" content="${session.images[0]?.fullUrl || session.images[0]?.url}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .header {
      background: #00B900;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background: white;
      margin-top: 20px;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .info {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info p {
      margin: 5px 0;
    }
    .preview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .preview img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .preview img:hover {
      transform: scale(1.05);
    }
    .btn {
      width: 100%;
      padding: 15px;
      background: #00B900;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      margin: 10px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .btn-secondary {
      background: #666;
    }
    .share-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .share-option {
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .share-option:hover {
      background: #f5f5f5;
      border-color: #00B900;
    }
    .share-icon {
      font-size: 36px;
      margin-bottom: 10px;
    }
    .status {
      text-align: center;
      margin: 20px 0;
      color: #666;
    }
    .loading {
      display: none;
      text-align: center;
      padding: 20px;
    }
    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #00B900;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      padding: 20px;
    }
    .modal img {
      max-width: 100%;
      max-height: 90vh;
      margin: auto;
      display: block;
    }
    .modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: white;
      color: black;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 24px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 แชร์รูปภาพ QC</h1>
    <p>Lot: ${session.lotNumber} | ${new Date(session.imageDate).toLocaleDateString('th-TH')}</p>
  </div>
  
  <div class="container">
    <div class="info">
      <p><strong>📦 Lot:</strong> ${session.lotNumber}</p>
      <p><strong>📅 วันที่:</strong> ${new Date(session.imageDate).toLocaleDateString('th-TH')}</p>
      <p><strong>🖼️ จำนวน:</strong> ${session.images.length} รูป</p>
      <p><strong>⏰ หมดอายุ:</strong> ${new Date(session.expiresAt).toLocaleString('th-TH')}</p>
    </div>
    
    <div class="preview">
      ${session.images.slice(0, 9).map((img, idx) => 
        `<img src="${img.fullUrl || img.url}" alt="Image ${idx + 1}" onclick="viewImage('${img.fullUrl || img.url}')">`
      ).join('')}
    </div>
    
    ${session.images.length > 9 ? `<p style="text-align: center; color: #666;">...และอีก ${session.images.length - 9} รูป</p>` : ''}
    
    <h3>เลือกวิธีการแชร์:</h3>
    
    <div class="share-options">
      <div class="share-option" onclick="shareViaLine()">
        <div class="share-icon">💬</div>
        <strong>LINE</strong>
        <small>แชร์ผ่าน LINE</small>
      </div>
      
      <div class="share-option" onclick="downloadAll()">
        <div class="share-icon">💾</div>
        <strong>ดาวน์โหลด</strong>
        <small>ZIP ไฟล์</small>
      </div>
      
      <div class="share-option" onclick="copyLink()">
        <div class="share-icon">🔗</div>
        <strong>คัดลอกลิงก์</strong>
        <small>แชร์ URL</small>
      </div>
      
      <div class="share-option" onclick="receiveImages()">
        <div class="share-icon">📥</div>
        <strong>รับรูปในแชท</strong>
        <small>Bot ส่งให้</small>
      </div>
    </div>
    
    <div class="status" id="status"></div>
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p>กำลังดำเนินการ...</p>
    </div>
  </div>
  
  <div class="modal" id="imageModal" onclick="closeModal()">
    <img id="modalImage" src="">
    <button class="modal-close" onclick="closeModal()">✕</button>
  </div>
  
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script>
    let liff = null;
    const sessionId = '${sessionId}';
    const shareUrl = window.location.href;
    const images = ${JSON.stringify(session.images)};
    
    async function initializeLiff() {
      try {
        await liff.init({ liffId: '2007575196-NWaXrZVE' });
        console.log('LIFF initialized');
      } catch (error) {
        console.error('LIFF init error:', error);
      }
    }
    
    function viewImage(url) {
      document.getElementById('modalImage').src = url;
      document.getElementById('imageModal').style.display = 'block';
    }
    
    function closeModal() {
      document.getElementById('imageModal').style.display = 'none';
    }
    
    async function shareViaLine() {
      try {
        showLoading();
        
        if (liff && liff.isApiAvailable('shareTargetPicker')) {
          const messages = [{
            type: 'text',
            text: \`📸 รูปภาพ QC\\n📦 Lot: ${session.lotNumber}\\n📅 ${new Date(session.imageDate).toLocaleDateString('th-TH')}\\n🖼️ ${session.images.length} รูป\\n\\n🔗 ดูรูปภาพ: \${shareUrl}\`
          }];
          
          await liff.shareTargetPicker(messages);
          showStatus('✅ แชร์สำเร็จ!');
        } else {
          // Fallback to LINE share URL
          const lineShareUrl = \`https://line.me/R/msg/text/?$\{encodeURIComponent('📸 รูปภาพ QC\\n' + shareUrl)}\`;
          window.open(lineShareUrl, '_blank');
        }
        
        hideLoading();
      } catch (error) {
        console.error('Share error:', error);
        showStatus('❌ เกิดข้อผิดพลาด');
        hideLoading();
      }
    }
    
    function downloadAll() {
      window.location.href = \`/api/share/$\{sessionId}/download\`;
      showStatus('📥 กำลังดาวน์โหลด...');
    }
    
    async function copyLink() {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showStatus('✅ คัดลอกลิงก์แล้ว');
      } catch (error) {
        showStatus('❌ ไม่สามารถคัดลอกลิงก์ได้');
      }
    }
    
    async function receiveImages() {
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      
      try {
        showLoading();
        const profile = await liff.getProfile();
        
        const response = await fetch('/api/share/deliver', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            userId: profile.userId
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus('✅ ส่งรูปภาพไปยังแชทของคุณแล้ว!');
          if (liff.isInClient()) {
            setTimeout(() => {
              liff.closeWindow();
            }, 2000);
          }
        } else {
          throw new Error(result.message);
        }
        
        hideLoading();
      } catch (error) {
        console.error('Error:', error);
        showStatus('❌ ' + error.message);
        hideLoading();
      }
    }
    
    function showStatus(message) {
      document.getElementById('status').innerHTML = message;
    }
    
    function showLoading() {
      document.getElementById('loading').style.display = 'block';
    }
    
    function hideLoading() {
      document.getElementById('loading').style.display = 'none';
    }
    
    // Initialize on load
    window.addEventListener('load', initializeLiff);
  </script>
</body>
</html>
    `;
    
    res.send(html);
    
  } catch (error) {
    logger.error('Error in share page:', error);
    res.status(500).send('Error loading share page');
  }
});

// Deliver images to user
router.post('/share/deliver', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session expired'
      });
    }
    
    // Send images to the user who clicked the link
    const result = await imageShareService.sendImagesToChat(sessionId, userId, 'user');
    
    res.json({
      success: true,
      message: `ส่งรูปภาพ ${result.count} รูป แล้ว`,
      count: result.count
    });
    
  } catch (error) {
    logger.error('Error delivering images:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Download all images as ZIP
router.get('/share/:sessionId/download', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found or expired');
    }
    
    // Create ZIP
    res.attachment(`QC_${session.lotNumber}_${session.imageDate}.zip`);
    
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    archive.pipe(res);
    
    // Add images to ZIP
    for (let i = 0; i < session.images.length; i++) {
      const image = session.images[i];
      const filename = `QC_${session.lotNumber}_${i + 1}.jpg`;
      
      if (image.tempPath) {
        archive.file(image.tempPath, { name: filename });
      } else {
        // Fallback to original path
        const originalPath = require('path').join(__dirname, '..', image.file_path || image.filePath);
        archive.file(originalPath, { name: filename });
      }
    }
    
    await archive.finalize();
    
  } catch (error) {
    logger.error('Error creating download:', error);
    res.status(500).send('Download failed');
  }
});

module.exports = router;