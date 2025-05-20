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

1. **การอัปโหลดรูปภาพ**
   - อัปโหลดหลายรูปพร้อมกัน (ไม่เกิน 20 รูป/ครั้ง)
   - ระบุเลข Lot และวันที่สำหรับรูปภาพ
   - บีบอัดรูปภาพอัตโนมัติ
   - รองรับไฟล์ .jpg, .jpeg, .png ขนาดไม่เกิน 10MB

2. **การเรียกดูรูปภาพ**
   - ค้นหาและแสดงรูปภาพตาม Lot และวันที่
   - แสดงรูปภาพโดยตรงในแชท LINE
   - แสดงข้อมูล Lot และวันที่พร้อมรูปภาพ

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

   คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าต่าง ๆ ให้ถูกต้อง:

   ```bash
   cp .env.example .env
   ```

4. **สร้างฐานข้อมูล**

   ใช้ไฟล์ `database_setup.sql` เพื่อสร้างฐานข้อมูลและตาราง:

   ```bash
   # ใช้ SQL Server Management Studio หรือเครื่องมืออื่น ๆ เพื่อรันสคริปต์
   ```

5. **ตั้งค่า LINE Webhook**

   - สร้าง LINE Official Account และ Messaging API Channel
   - ตั้งค่า Webhook URL เป็น `https://your-domain.com/webhook`
   - เปิดใช้งาน Webhook และตั้งค่าให้รับเหตุการณ์ที่จำเป็น (ข้อความ, รูปภาพ, postback)

6. **สร้าง Rich Menu (ตัวเลือก)**

   - สร้าง Rich Menu ใน LINE Developer Console
   - อัปโหลดรูปภาพและตั้งค่าปุ่มต่าง ๆ (ดูรูปภาพ, อัปโหลดรูปภาพ)
   - นำ Rich Menu ID มาใส่ในไฟล์ `.env`

7. **เริ่มต้นใช้งาน**

   ```bash
   # โหมดพัฒนา
   npm run dev

   # โหมดการใช้งานจริง
   npm start
   ```

## การใช้งาน

### การอัปโหลดรูปภาพ

1. ส่งรูปภาพไปยัง LINE Official Account
2. พิมพ์เลข Lot เมื่อระบบถาม
3. เลือกวันที่จากปฏิทินที่แสดงขึ้น
4. รูปภาพจะถูกบีบอัดและจัดเก็บในระบบ

### การดูรูปภาพ

1. กดปุ่ม "ดูรูปภาพ" จาก Rich Menu หรือพิมพ์ "ดูรูปภาพ"
2. พิมพ์เลข Lot ที่ต้องการดู
3. เลือกวันที่ที่ต้องการดูรูปภาพ
4. ระบบจะแสดงรูปภาพทั้งหมดที่ตรงกับเลข Lot และวันที่ที่เลือก

## โครงสร้างโปรเจค

```
.
├── config/                 # การตั้งค่าแอปพลิเคชัน
├── controllers/            # ตัวควบคุมการทำงาน
├── models/                 # โมเดลข้อมูล
├── services/               # บริการต่าง ๆ
├── utils/                  # ยูทิลิตี้
├── views/                  # มุมมองและการสร้างข้อความ
├── public/                 # ไฟล์สาธารณะ
│   └── uploads/            # ที่เก็บรูปภาพที่อัปโหลด
├── app.js                  # ไฟล์หลักของแอปพลิเคชัน
├── package.json            # ข้อมูลและ dependencies ของโปรเจค
├── .env                    # ตัวแปรสภาพแวดล้อม
└── database_setup.sql      # สคริปต์สร้างฐานข้อมูล
```

## การพัฒนาเพิ่มเติม

### การแก้ไขข้อผิดพลาด

บันทึกข้อผิดพลาดถูกเก็บไว้ในโฟลเดอร์ `logs/`:

- `combined.log`: บันทึกทั้งหมด
- `error.log`: เฉพาะข้อผิดพลาด

### การปรับแต่ง

- **Rich Menu**: ปรับแต่งได้ผ่าน LINE Developer Console
- **การบีบอัดรูปภาพ**: แก้ไขค่าพารามิเตอร์ใน `utils/ImageCompressor.js`
- **รูปแบบข้อความ**: แก้ไขใน `views/LineMessageBuilder.js`

## License

[MIT License](LICENSE)