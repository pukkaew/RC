# RC_QC_Line

ระบบจัดการรูปภาพสินค้าตาม Lot และวันที่ผ่าน LINE Official Account

## ภาพรวมโครงการ

RC_QC_Line เป็นระบบที่ช่วยจัดการรูปภาพสินค้าตาม Lot และวันที่ โดยใช้ LINE Official Account เป็นช่องทางในการอัปโหลดและเรียกดูรูปภาพ ระบบจะบีบอัดรูปภาพอัตโนมัติ จัดเก็บข้อมูลในฐานข้อมูล MS SQL Server และจัดการรูปภาพตาม Lot และวันที่

## สถาปัตยกรรมระบบ

- **Backend**: Node.js และ Express.js
- **Database**: Microsoft SQL Server
- **API**: LINE Messaging API
- **Image Processing**: Sharp
- **สถาปัตยกรรม**: MVC (Model-View-Controller)

## คุณสมบัติหลัก

### 1. การอัปโหลดรูปภาพ (ปรับปรุงใหม่)
   - อัปโหลดรูปภาพจำนวนไม่จำกัด (รองรับหลายร้อยรูป)
   - ใช้วันที่ปัจจุบันโดยอัตโนมัติ (ไม่ต้องเลือกวันที่)
   - แสดงรายการ Lot ที่เคยใช้เพื่อให้เลือกได้ง่าย
   - เพิ่มตัวเลือก "ใช้ค่าล่าสุด" เพื่อความสะดวก
   - บีบอัดรูปภาพอัตโนมัติ
   - รองรับไฟล์ .jpg, .jpeg, .png ขนาดไม่เกิน 10MB
   - ประมวลผลเป็น batch สำหรับรูปภาพจำนวนมาก

### 2. การเรียกดูรูปภาพ (ปรับปรุงใหม่)
   - ค้นหาและแสดงรูปภาพตาม Lot และวันที่
   - แสดงรูปภาพด้วยระบบ Hybrid (Native + Carousel + Flex Grid)
   - รองรับการแสดงผลรูปภาพจำนวนมากอย่างมีประสิทธิภาพ
   - แสดงข้อมูล Lot และวันที่พร้อมรูปภาพ

### 3. การแก้ไข Lot (ใหม่)
   - แก้ไขเลข Lot ที่อัปโหลดผิดได้ด้วยคำสั่ง `#correct`
   - มีข้อจำกัดให้แก้ไขได้เฉพาะรูปที่อัปโหลดไม่เกิน 24 ชั่วโมง
   - รองรับการแก้ไขแบบ batch สำหรับรูปหลายรูป

### 4. การใช้งานในกลุ่มสนทนา (ปรับปรุงใหม่)
   - บอทตอบสนองเฉพาะข้อความที่เป็นคำสั่งเท่านั้น
   - ไม่ตอบสนองต่อข้อความทั่วไปที่มีคำว่า "รูป", "ภาพ" ฯลฯ
   - ไม่ประมวลผลรูปภาพในกลุ่มสนทนา ยกเว้นอยู่ในโหมดอัปโหลด

## คำสั่งที่มีในระบบ

| คำสั่ง | รายละเอียด | ตัวอย่าง |
|-------|------------|----------|
| `#up` หรือ `#upload` | เริ่มโหมดอัปโหลดรูปภาพ | `#up ABC123` |
| `#view` หรือ `#v` | เรียกดูรูปภาพตาม Lot และวันที่ | `#view ABC123` |
| `#del` หรือ `#delete` | ลบรูปภาพ | `#del ABC123` |
| `#correct` หรือ `#cor` | แก้ไขเลข Lot จากค่าเดิมเป็นค่าใหม่ | `#correct ABC123 XYZ789` |
| `#cancel` หรือ `#c` | ยกเลิกการทำงานปัจจุบัน | `#cancel` |
| `#help` หรือ `#h` | แสดงวิธีใช้งาน | `#help upload` |
| `#last` | ใช้เลข Lot ล่าสุด (ใช้ในขั้นตอนการระบุ Lot) | `#last` |

### รองรับคำสั่งภาษาไทย
- `#อัปโหลด`, `#อัป`, `#ส่งรูป` สำหรับอัปโหลด
- `#ดู`, `#ดูรูป`, `#เรียกดู` สำหรับดูรูปภาพ
- `#ลบ`, `#ลบรูป` สำหรับลบรูปภาพ
- `#แก้ไข`, `#แก้`, `#ปรับปรุง` สำหรับแก้ไข Lot

## การติดตั้ง

### ข้อกำหนดเบื้องต้น

- Node.js >= 14.x
- Microsoft SQL Server 2019 หรือสูงกว่า
- LINE Developer Account และ LINE Official Account

### ขั้นตอนการติดตั้ง

1. **โคลนโปรเจค**

   ```bash
   git clone https://github.com/your-username/rc_qc_line.git
   cd rc_qc_line
   ```

2. **ติดตั้ง Dependencies**

   ```bash
   npm install
   ```

3. **ตั้งค่าไฟล์ .env**

   สร้างไฟล์ `.env` และแก้ไขค่าต่าง ๆ ให้ถูกต้อง:

   ```env
   # Application
   PORT=3000
   NODE_ENV=development
   BASE_URL=https://your-domain.com

   # LINE API
   LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
   LINE_CHANNEL_SECRET=your_channel_secret

   # Database
   DB_SERVER=localhost
   DB_NAME=RC_QC_Line
   DB_USER=sa
   DB_PASSWORD=your_password
   DB_PORT=1433

   # File upload
   MAX_FILE_SIZE=10485760  # 10MB in bytes
   UPLOAD_PATH=public/uploads
   ```

4. **สร้างฐานข้อมูล**

   ใช้ไฟล์ `database_setup.sql` เพื่อสร้างฐานข้อมูลและตาราง:

   ```sql
   -- รันสคริปต์ SQL ผ่าน SQL Server Management Studio หรือเครื่องมืออื่น ๆ
   ```

5. **ตั้งค่า LINE Webhook**

   - สร้าง LINE Official Account และ Messaging API Channel
   - ตั้งค่า Webhook URL เป็น `https://your-domain.com/webhook`
   - เปิดใช้งาน Webhook และตั้งค่าให้รับเหตุการณ์ที่จำเป็น (ข้อความ, รูปภาพ, postback)

6. **เริ่มต้นใช้งาน**

   ```bash
   # โหมดพัฒนา
   npm run dev

   # โหมดการใช้งานจริง
   npm start
   ```

## การใช้งาน

### การอัปโหลดรูปภาพ (แบบใหม่)

1. พิมพ์ `#up` เพื่อเปิดโหมดอัปโหลด
2. ส่งรูปภาพที่ต้องการอัปโหลด (จำนวนไม่จำกัด)
3. พิมพ์เลข Lot หรือเลือกจากตัวเลือกที่แสดง
   - สามารถพิมพ์ `#last` เพื่อใช้เลข Lot ล่าสุด
4. ระบบจะใช้วันที่ปัจจุบันโดยอัตโนมัติ และบันทึกรูปภาพ
5. หากพิมพ์เลข Lot ผิด สามารถกดปุ่ม "แก้ไข Lot" ได้ทันที

### การดูรูปภาพ

1. พิมพ์ `#view` หรือ `#v` 
2. พิมพ์เลข Lot ที่ต้องการดู
3. เลือกวันที่ที่ต้องการดูรูปภาพ
4. ระบบจะแสดงรูปภาพในรูปแบบที่เหมาะสม:
   - **1-5 รูป**: แสดงเป็น Native Images
   - **6-12 รูป**: แสดงเป็น Carousel + Native Images
   - **13+ รูป**: แสดงเป็น Flex Grid + Sample Images

### การแก้ไข Lot ที่อัปโหลดผิด

1. พิมพ์ `#correct [Lot เดิม]` เช่น `#correct ABC123`
2. ระบบจะขอให้พิมพ์เลข Lot ใหม่
3. พิมพ์เลข Lot ที่ถูกต้อง
4. ระบบจะแก้ไขเลข Lot สำหรับรูปภาพที่อัปโหลดไม่เกิน 24 ชั่วโมงและเป็นรูปที่คุณอัปโหลดเอง

### การใช้งานในกลุ่มสนทนา

1. บอทจะตอบสนองเฉพาะข้อความที่เริ่มต้นด้วยคำสั่ง เช่น `#up`, `#view`, `#del` เท่านั้น
2. ข้อความทั่วไปในกลุ่มจะถูกละเว้น ไม่มีการตอบกลับ
3. รูปภาพในกลุ่มจะถูกประมวลผลเฉพาะเมื่ออยู่ในโหมดอัปโหลดเท่านั้น

## โครงสร้างโปรเจค

```
.
├── config/                 # การตั้งค่าแอปพลิเคชัน
│   ├── app.js              # การตั้งค่าหลักของแอป
│   ├── commands.js         # การตั้งค่าคำสั่งและ aliases
│   ├── database.js         # การตั้งค่าฐานข้อมูล
│   └── line.js             # การตั้งค่า LINE API
├── controllers/            # ตัวควบคุมการทำงาน
│   ├── CorrectController.js    # จัดการการแก้ไข Lot
│   ├── DeleteController.js     # จัดการการลบรูปภาพ
│   ├── ImageController.js      # จัดการการแสดงรูปภาพ
│   ├── UploadController.js     # จัดการการอัปโหลด
│   ├── UserController.js       # จัดการผู้ใช้
│   └── WebhookController.js    # จัดการ Webhook จาก LINE
├── models/                 # โมเดลข้อมูล
│   ├── ImageModel.js       # โมเดลรูปภาพ
│   ├── LotModel.js         # โมเดล Lot
│   └── UserModel.js        # โมเดลผู้ใช้
├── services/               # บริการต่าง ๆ
│   ├── DatabaseService.js      # บริการฐานข้อมูล
│   ├── DatePickerService.js    # บริการเลือกวันที่
│   ├── DeleteService.js        # บริการลบรูปภาพ
│   ├── ImageService.js         # บริการจัดการรูปภาพ
│   └── LineService.js          # บริการ LINE API
├── utils/                  # ยูทิลิตี้
│   ├── DateFormatter.js        # จัดรูปแบบวันที่
│   ├── ErrorHandler.js         # จัดการข้อผิดพลาด
│   ├── ImageCompressor.js      # บีบอัดรูปภาพ
│   └── Logger.js               # บันทึกล็อก
├── views/                  # มุมมองและการสร้างข้อความ
│   ├── DatePickerBuilder.js    # สร้างตัวเลือกวันที่
│   └── LineMessageBuilder.js   # สร้างข้อความ LINE
├── public/                 # ไฟล์สาธารณะ
│   └── uploads/            # ที่เก็บรูปภาพที่อัปโหลด
├── logs/                   # บันทึกการทำงาน
├── app.js                  # ไฟล์หลักของแอปพลิเคชัน
├── package.json            # ข้อมูลและ dependencies ของโปรเจค
└── .env                    # ตัวแปรสภาพแวดล้อม
```

## คุณสมบัติเด่น

### 1. รองรับรูปภาพจำนวนมาก
- ประมวลผลรูปภาพเป็น batch
- แสดง progress สำหรับการอัปโหลดจำนวนมาก
- ระบบ cleanup อัตโนมัติ

### 2. การแสดงผลแบบ Hybrid
- **Native Images**: สำหรับรูปภาพน้อย (1-5 รูป)
- **Carousel**: สำหรับรูปภาพปานกลาง (6-12 รูป)
- **Flex Grid**: สำหรับรูปภาพจำนวนมาก (13+ รูป)

### 3. ระบบความปลอดภัย
- แก้ไข Lot ได้เฉพาะใน 24 ชั่วโมง
- ตรวจสอบสิทธิ์ผู้ใช้
- บันทึกการทำงานทั้งหมด

### 4. เป็นมิตรกับกลุ่มสนทนา
- ตอบสนองเฉพาะคำสั่งที่มี prefix
- ไม่รบกวนการสนทนาทั่วไป
- จัดการสถานะผู้ใช้แยกกัน

## การพัฒนาเพิ่มเติม

### การแก้ไขข้อผิดพลาด

บันทึกข้อผิดพลาดถูกเก็บไว้ในโฟลเดอร์ `logs/`:

- `combined.log`: บันทึกทั้งหมด
- `error.log`: เฉพาะข้อผิดพลาด

### การปรับแต่ง

- **คำสั่ง**: ปรับแต่งได้ใน `config/commands.js`
- **การบีบอัดรูปภาพ**: แก้ไขค่าพารามิเตอร์ใน `utils/ImageCompressor.js`
- **รูปแบบข้อความ**: แก้ไขใน `views/LineMessageBuilder.js`
- **การแสดงผล**: ปรับแต่งใน `controllers/ImageController.js`

### การเพิ่มคุณสมบัติใหม่

หากต้องการเพิ่มคุณสมบัติใหม่ สามารถแก้ไขได้ในไฟล์ต่อไปนี้:

1. **config/commands.js**: เพิ่มคำสั่งใหม่
2. **controllers/WebhookController.js**: เพิ่มการจัดการคำสั่งใหม่
3. **services/**: เพิ่มบริการใหม่
4. **models/**: เพิ่มโมเดลข้อมูลใหม่

## Dependencies หลัก

```json
{
  "@line/bot-sdk": "^8.0.0",
  "express": "^4.18.2",
  "mssql": "^10.0.1",
  "sharp": "^0.33.0",
  "winston": "^3.11.0",
  "moment": "^2.29.4"
}
```

## ข้อจำกัดและข้อควรระวัง

1. **การแก้ไข Lot**: แก้ไขได้เฉพาะรูปที่อัปโหลดไม่เกิน 24 ชั่วโมงและเป็นรูปที่คุณอัปโหลดเอง
2. **การใช้งานในกลุ่ม**: ต้องพิมพ์ `#up` ก่อนส่งรูปภาพเสมอ ไม่เช่นนั้นรูปภาพจะถูกละเว้น
3. **การดูรูปในกลุ่ม**: ทุกคนในกลุ่มสามารถดูรูปภาพได้ด้วยคำสั่ง `#view`
4. **ขนาดไฟล์**: รูปภาพต้องไม่เกิน 10MB ต่อไฟล์
5. **รูปแบบไฟล์**: รองรับเฉพาะ .jpg, .jpeg, .png

## License

[MIT License](LICENSE)