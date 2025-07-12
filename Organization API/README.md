# Organization Structure Management System

ระบบจัดการโครงสร้างองค์กรแบบลำดับชั้น พร้อม RESTful API สำหรับการเชื่อมต่อกับระบบอื่นๆ

## Features

- 🏢 จัดการข้อมูลโครงสร้างองค์กร 4 ระดับ (บริษัท, สาขา, ฝ่าย, แผนก)
- 🔌 RESTful API พร้อมระบบ Authentication
- 🎨 Web Interface สำหรับจัดการข้อมูล
- 🔐 ระบบจัดการ API Keys และ Permissions
- 📊 Dashboard แสดงสถิติการใช้งาน
- 📝 API Logging และ Monitoring

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Microsoft SQL Server
- **View Engine**: EJS
- **CSS Framework**: Tailwind CSS
- **Authentication**: JWT, API Keys
- **Testing**: Jest, Supertest

## Prerequisites

- Node.js 18.x หรือสูงกว่า
- Microsoft SQL Server 2019 หรือสูงกว่า
- npm หรือ yarn

## Installation

1. Clone repository
```bash
git clone <repository-url>
cd organization-structure-management
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
# แก้ไขค่าต่างๆ ใน .env file
```

4. Create database
```bash
# รัน SQL scripts ใน database/scripts/ ตามลำดับ:
# 1. create-database.sql
# 2. create-tables.sql
# 3. create-indexes.sql
# 4. create-constraints.sql
```

5. Run application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Project Structure

```
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── models/         # Database models
│   ├── routes/         # Route definitions
│   ├── middleware/     # Custom middleware
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── validators/     # Input validators
├── views/              # EJS templates
├── public/             # Static files
├── database/           # Database scripts
├── tests/              # Test files
├── docs/               # Documentation
└── logs/               # Application logs
```

## API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
ใช้ API Key ใน header:
```
X-API-Key: your-api-key-here
```

### Endpoints

#### Companies
- `GET /companies` - ดึงรายการบริษัททั้งหมด
- `GET /companies/:code` - ดึงข้อมูลบริษัทตามรหัส
- `POST /companies` - สร้างบริษัทใหม่
- `PUT /companies/:code` - แก้ไขข้อมูลบริษัท
- `PATCH /companies/:code/status` - เปลี่ยนสถานะบริษัท

#### Branches
- `GET /branches` - ดึงรายการสาขาทั้งหมด
- `GET /companies/:code/branches` - ดึงสาขาของบริษัท
- `POST /branches` - สร้างสาขาใหม่
- `PUT /branches/:code` - แก้ไขข้อมูลสาขา

#### Divisions
- `GET /divisions` - ดึงรายการฝ่ายทั้งหมด
- `GET /companies/:code/divisions` - ดึงฝ่ายของบริษัท
- `GET /branches/:code/divisions` - ดึงฝ่ายของสาขา
- `POST /divisions` - สร้างฝ่ายใหม่
- `PUT /divisions/:code` - แก้ไขข้อมูลฝ่าย

#### Departments
- `GET /departments` - ดึงรายการแผนกทั้งหมด
- `GET /divisions/:code/departments` - ดึงแผนกของฝ่าย
- `POST /departments` - สร้างแผนกใหม่
- `PUT /departments/:code` - แก้ไขข้อมูลแผนก

#### Organization Tree
- `GET /organization-tree` - ดึงโครงสร้างองค์กรทั้งหมด
- `GET /search?q=keyword` - ค้นหาข้ามทุกระดับ

## Testing

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Development Guidelines

1. ใช้ MVC Pattern
2. ทำ Input Validation ทุกครั้ง
3. Handle Errors อย่างเหมาะสม
4. เขียน Unit Tests สำหรับ Business Logic
5. ใช้ ESLint และ Prettier
6. Comment code ที่สำคัญ

## Security

- ใช้ HTTPS ในการ production
- Encrypt sensitive data
- Rate limiting บน API
- Input sanitization
- SQL injection prevention
- XSS protection

## License

ISC

## Support

สำหรับคำถามหรือปัญหา กรุณาติดต่อ:
- Email: support@organization.com
- Documentation: /docs