// Command prefixes configuration with added "done" command
module.exports = {
  // Command prefixes (can be easily changed)
  prefixes: {
    upload: '#up',        // เริ่มอัปโหลดรูปภาพ
    uploadShort: '#u',    // เริ่มอัปโหลดรูปภาพ (แบบสั้น)
    view: '#view',        // เรียกดูรูปภาพ
    viewShort: '#v',      // เรียกดูรูปภาพ (แบบสั้น)
    help: '#help',        // แสดงวิธีใช้งาน
    helpShort: '#h',      // แสดงวิธีใช้งาน (แบบสั้น)
    cancel: '#cancel',    // ยกเลิกการทำงาน
    cancelShort: '#c',    // ยกเลิกการทำงาน (แบบสั้น)
    delete: '#del',       // ลบรูปภาพ
    deleteShort: '#d',    // ลบรูปภาพ (แบบสั้น)
    correct: '#correct',  // แก้ไขเลข Lot ที่ผิด
    correctShort: '#cor', // แก้ไขเลข Lot ที่ผิด (แบบสั้น)
    done: '#done'         // เสร็จสิ้นการอัปโหลด
  },
  
  // English command aliases
  englishAliases: {
    '#up': ['#upload', '#u'],
    '#view': ['#see', '#v', '#show'],
    '#help': ['#h', '#?'],
    '#cancel': ['#c', '#quit', '#exit'],
    '#del': ['#delete', '#d', '#remove'],
    '#correct': ['#cor', '#fix', '#edit'],
    '#done': ['#finish', '#complete', '#end']
  },
  
  // Thai command aliases
  thaiAliases: {
    '#up': ['#อัปโหลด', '#อัป', '#ส่งรูป'],
    '#view': ['#ดู', '#ดูรูป', '#เรียกดู'],
    '#help': ['#ช่วย', '#วิธีใช้', '#คำสั่ง'],
    '#cancel': ['#ยกเลิก', '#เลิก', '#ออก'],
    '#del': ['#ลบ', '#ลบรูป', '#ลบรูปภาพ'],
    '#correct': ['#แก้ไข', '#แก้', '#ปรับปรุง'],
    '#done': ['#เสร็จ', '#เสร็จสิ้น', '#จบ']
  },
  
  // Whether to require prefixes for actions
  requirePrefix: {
    upload: true,       // Require prefix for upload
    view: true          // Require prefix for viewing images
  },
  
  // Help texts
  helpText: {
    general: 'คำสั่งที่ใช้ได้:\n' +
             '#up [LOT] - อัปโหลดรูปภาพ ระบุ Lot\n' +
             '#view [LOT] - ดูรูปภาพตาม Lot\n' +
             '#del [LOT] - ลบรูปภาพ\n' +
             '#correct [OLD_LOT] [NEW_LOT] - แก้ไขเลข Lot ที่ผิด\n' +
             '#done - เสร็จสิ้นการอัปโหลดรูปภาพ\n' +
             '#cancel - ยกเลิกการทำงานปัจจุบัน\n' +
             '#help - แสดงวิธีใช้งาน\n\n' +
             'หมายเหตุ: สามารถใช้คำสั่งแบบสั้น (#u, #v, #d, #cor, #c, #h) หรือภาษาไทยได้',
    
    upload: 'วิธีอัปโหลดรูปภาพ:\n' +
            '1. พิมพ์ #up [LOT] เช่น #up ABC123\n' +
            '2. ส่งรูปภาพที่ต้องการอัปโหลด\n' +
            '3. ส่งรูปเพิ่มได้หลายรูป\n' +
            '4. พิมพ์ #done เมื่อส่งรูปเสร็จแล้ว\n\n' +
            'หรือ\n' +
            '1. พิมพ์ #up\n' +
            '2. ส่งรูปภาพ\n' +
            '3. ระบุเลข Lot\n' +
            '4. ส่งรูปเพิ่มได้หลายรูป\n' +
            '5. พิมพ์ #done เมื่อส่งรูปเสร็จแล้ว',
    
    view: 'วิธีดูรูปภาพ:\n' +
          '1. พิมพ์ #view [LOT] เช่น #view ABC123\n\n' +
          'หรือ\n' +
          '1. พิมพ์ #view\n' +
          '2. ระบุเลข Lot',
    
    delete: 'วิธีลบรูปภาพ:\n' +
            '1. พิมพ์ #del [LOT] เช่น #del ABC123\n' +
            '2. เลือกรูปภาพที่ต้องการลบ\n' +
            '3. ยืนยันการลบ',
    
    correct: 'วิธีแก้ไขเลข Lot ที่ผิด:\n' +
             '1. พิมพ์ #correct [OLD_LOT] [NEW_LOT]\n' +
             '   เช่น #correct ABC123 XYZ789\n\n' +
             'หรือ\n' +
             '1. พิมพ์ #correct [OLD_LOT]\n' +
             '2. ระบุเลข Lot ใหม่\n\n' +
             '* สามารถแก้ไขได้เฉพาะรูปที่อัปโหลดไม่เกิน 24 ชม.'
  }
};