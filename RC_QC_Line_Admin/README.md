# RC QC Line Admin Dashboard

ระบบจัดการรูปภาพ QC ผ่านเว็บสำหรับผู้ดูแลระบบ

## Features

- 🔐 ระบบ Authentication และ Authorization แบบ Role-based
- 📊 Dashboard แสดงสถิติและกิจกรรมล่าสุด
- 📦 จัดการ Lot - ดู, แก้ไขชื่อ, ลบ (Admin)
- 🖼️ จัดการรูปภาพ - ดู, ลบ, ดาวน์โหลด
- 👥 จัดการผู้ใช้ (Admin only)
- 📈 ระบบรายงานและ Export Excel
- 📝 Audit Log บันทึกทุกกิจกรรม
- 🌐 รองรับ 2 ภาษา (ไทย/อังกฤษ)
- 📱 Responsive Design

## Requirements

- Node.js 14.x หรือสูงกว่า
- MS SQL Server 2016 หรือสูงกว่า
- ระบบ RC_QC_Line (LINE Bot) ที่ติดตั้งแล้ว

## Installation

1. **สร้างโครงสร้างโปรเจค**
   ```bash
   setup_project_structure.bat
   ```

2. **ติดตั้ง dependencies**
   ```bash
   cd RC_QC_Line_Admin
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   ```bash
   copy .env.example .env
   ```
   แก้ไขไฟล์ `.env` ตามความเหมาะสม

4. **สร้างตารางในฐานข้อมูล**
   ```bash
   npm run setup
   ```

5. **เริ่มต้นใช้งาน**
   ```bash
   npm start
   ```
   
   หรือสำหรับ Development mode:
   ```bash
   npm run dev
   ```

6. **เข้าใช้งาน**
   - URL: http://localhost:3001
   - Default Admin: 
     - Employee ID: `ADMIN`
     - Password: `Admin@123`

## Project Structure

```
RC_QC_Line_Admin/
├── config/              # Configuration files
├── controllers/         # Route controllers
├── middleware/          # Express middleware
├── models/             # Database models
├── routes/             # Route definitions
├── services/           # Business logic services
├── utils/              # Utility functions
├── views/              # EJS templates
├── public/             # Static files
├── locales/            # Translation files
├── logs/               # Log files
└── server.js           # Application entry point
```

## User Roles

1. **Viewer** - ดูข้อมูลอย่างเดียว
2. **Manager** - จัดการ Lot และรูปภาพ
3. **Admin** - จัดการระบบทั้งหมด

## API Endpoints

### Authentication
- `POST /auth/login` - เข้าสู่ระบบ
- `GET /auth/logout` - ออกจากระบบ
- `POST /auth/change-password` - เปลี่ยนรหัสผ่าน

### Dashboard
- `GET /` - หน้า Dashboard
- `GET /api/stats` - ดึงสถิติ
- `GET /api/recent-activity` - กิจกรรมล่าสุด

### Lots Management
- `GET /lots` - รายการ Lot ทั้งหมด
- `GET /lots/:id` - ดูรายละเอียด Lot
- `PUT /lots/:id` - แก้ไข Lot (Manager+)
- `DELETE /lots/:id` - ลบ Lot (Admin)
- `GET /lots/:id/download` - ดาวน์โหลดรูปทั้งหมดใน Lot

### Images Management
- `GET /images` - รายการรูปภาพ
- `DELETE /images/:id` - ลบรูปภาพ (Manager+)
- `POST /images/bulk-delete` - ลบหลายรูป (Manager+)
- `GET /images/:id/download` - ดาวน์โหลดรูปภาพ

### User Management (Admin only)
- `GET /users` - รายการผู้ใช้
- `POST /users` - สร้างผู้ใช้ใหม่
- `PUT /users/:id` - แก้ไขผู้ใช้
- `DELETE /users/:id` - ลบผู้ใช้

### Reports
- `GET /reports` - หน้ารายงาน
- `POST /reports/export` - Export รายงาน

### Audit Logs (Admin only)
- `GET /audit` - ดู Audit logs

## Environment Variables

```env
# Application
NODE_ENV=production
PORT=3001
APP_NAME=RC_QC_Admin

# Database
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=RC_QC_LINE

# Session
SESSION_SECRET=your-secret-key
SESSION_MAX_AGE=1800000

# Security
BCRYPT_ROUNDS=10
LOGIN_ATTEMPTS_LIMIT=5

# File Upload
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=10485760

# Localization
DEFAULT_LANGUAGE=th-TH
SUPPORTED_LANGUAGES=th-TH,en-US
```

## Security Features

- Password hashing with bcrypt
- Session management with secure cookies
- CSRF protection
- XSS prevention
- SQL injection prevention
- Rate limiting
- Audit logging

## Maintenance

1. **Database Cleanup**
   ```bash
   npm run maintenance
   ```

2. **Backup Database**
   ```bash
   npm run backup
   ```

3. **View Logs**
   - Application logs: `logs/application-*.log`
   - Error logs: `logs/error-*.log`

## Troubleshooting

### Cannot connect to database
- ตรวจสอบ connection string ใน `.env`
- ตรวจสอบ SQL Server service ทำงานหรือไม่
- ตรวจสอบ firewall settings

### Session timeout too quickly
- ปรับค่า `SESSION_MAX_AGE` ใน `.env`

### Cannot upload/view images
- ตรวจสอบ path `UPLOAD_PATH` ถูกต้อง
- ตรวจสอบ permissions ของ folder

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary software for RC Company.