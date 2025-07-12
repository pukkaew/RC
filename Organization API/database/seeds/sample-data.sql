-- =============================================
-- Sample Data for Organization Structure Management System
-- =============================================

USE OrgStructureDB;
GO

-- Clear existing data (be careful in production!)
DELETE FROM API_Logs;
DELETE FROM API_Keys;
DELETE FROM Departments;
DELETE FROM Divisions;
DELETE FROM Branches;
DELETE FROM Companies;
GO

-- Insert sample companies
INSERT INTO Companies (company_code, company_name_th, company_name_en, tax_id, is_active, created_by) VALUES
('ABC', N'บริษัท เอบีซี จำกัด', 'ABC Company Limited', '0105558123456', 1, 'system'),
('XYZ', N'บริษัท เอ็กซ์วายแซด จำกัด (มหาชน)', 'XYZ Public Company Limited', '0107558654321', 1, 'system'),
('TECH', N'บริษัท เทคโนโลยี อินโนเวชั่น จำกัด', 'Technology Innovation Co., Ltd.', '0105559876543', 1, 'system');
GO

-- Insert sample branches
INSERT INTO Branches (branch_code, branch_name, company_code, is_headquarters, is_active, created_by) VALUES
-- ABC branches
('ABC-HQ', N'สำนักงานใหญ่', 'ABC', 1, 1, 'system'),
('ABC-BKK', N'สาขากรุงเทพ', 'ABC', 0, 1, 'system'),
('ABC-CNX', N'สาขาเชียงใหม่', 'ABC', 0, 1, 'system'),

-- XYZ branches
('XYZ-HQ', N'สำนักงานใหญ่', 'XYZ', 1, 1, 'system'),
('XYZ-BKK', N'สาขาสีลม', 'XYZ', 0, 1, 'system'),
('XYZ-RYG', N'สาขาระยอง', 'XYZ', 0, 1, 'system');
GO

-- Insert sample divisions
INSERT INTO Divisions (division_code, division_name, company_code, branch_code, is_active, created_by) VALUES
-- ABC divisions
('ABC-HR', N'ฝ่ายทรัพยากรบุคคล', 'ABC', 'ABC-HQ', 1, 'system'),
('ABC-IT', N'ฝ่ายเทคโนโลยีสารสนเทศ', 'ABC', 'ABC-HQ', 1, 'system'),
('ABC-FIN', N'ฝ่ายการเงิน', 'ABC', 'ABC-HQ', 1, 'system'),
('ABC-SALES-BKK', N'ฝ่ายขาย', 'ABC', 'ABC-BKK', 1, 'system'),
('ABC-SALES-CNX', N'ฝ่ายขาย', 'ABC', 'ABC-CNX', 1, 'system'),

-- XYZ divisions
('XYZ-HR', N'ฝ่ายทรัพยากรบุคคล', 'XYZ', 'XYZ-HQ', 1, 'system'),
('XYZ-IT', N'ฝ่ายเทคโนโลยีสารสนเทศ', 'XYZ', 'XYZ-HQ', 1, 'system'),
('XYZ-MKT', N'ฝ่ายการตลาด', 'XYZ', 'XYZ-HQ', 1, 'system'),
('XYZ-PROD', N'ฝ่ายผลิต', 'XYZ', 'XYZ-RYG', 1, 'system'),

-- TECH divisions (no branches)
('TECH-DEV', N'ฝ่ายพัฒนาซอฟต์แวร์', 'TECH', NULL, 1, 'system'),
('TECH-SUP', N'ฝ่ายสนับสนุนลูกค้า', 'TECH', NULL, 1, 'system'),
('TECH-HR', N'ฝ่ายทรัพยากรบุคคล', 'TECH', NULL, 1, 'system');
GO

-- Insert sample departments
INSERT INTO Departments (department_code, department_name, division_code, is_active, created_by) VALUES
-- ABC departments
('ABC-HR-REC', N'แผนกสรรหา', 'ABC-HR', 1, 'system'),
('ABC-HR-TRN', N'แผนกฝึกอบรม', 'ABC-HR', 1, 'system'),
('ABC-IT-DEV', N'แผนกพัฒนาระบบ', 'ABC-IT', 1, 'system'),
('ABC-IT-SUP', N'แผนกสนับสนุน', 'ABC-IT', 1, 'system'),
('ABC-FIN-ACC', N'แผนกบัญชี', 'ABC-FIN', 1, 'system'),
('ABC-FIN-TAX', N'แผนกภาษี', 'ABC-FIN', 1, 'system'),

-- XYZ departments
('XYZ-HR-PAY', N'แผนกเงินเดือน', 'XYZ-HR', 1, 'system'),
('XYZ-HR-BEN', N'แผนกสวัสดิการ', 'XYZ-HR', 1, 'system'),
('XYZ-IT-INF', N'แผนกโครงสร้างพื้นฐาน', 'XYZ-IT', 1, 'system'),
('XYZ-MKT-DIG', N'แผนกการตลาดดิจิทัล', 'XYZ-MKT', 1, 'system'),
('XYZ-MKT-EVT', N'แผนกอีเวนต์', 'XYZ-MKT', 1, 'system'),
('XYZ-PROD-QC', N'แผนกควบคุมคุณภาพ', 'XYZ-PROD', 1, 'system'),

-- TECH departments
('TECH-DEV-WEB', N'แผนกพัฒนาเว็บ', 'TECH-DEV', 1, 'system'),
('TECH-DEV-MOB', N'แผนกพัฒนาโมบาย', 'TECH-DEV', 1, 'system'),
('TECH-SUP-L1', N'แผนกสนับสนุนระดับ 1', 'TECH-SUP', 1, 'system'),
('TECH-SUP-L2', N'แผนกสนับสนุนระดับ 2', 'TECH-SUP', 1, 'system');
GO

-- Insert sample API keys
INSERT INTO API_Keys (api_key, api_key_hash, app_name, description, permissions, is_active, created_by) VALUES
('DEMO-KEY-001...', '$2a$10$YourHashedKeyHere1', 'ERP System', N'สำหรับระบบ ERP เชื่อมต่อดึงข้อมูลโครงสร้างองค์กร', 'read', 1, 'system'),
('DEMO-KEY-002...', '$2a$10$YourHashedKeyHere2', 'HR System', N'สำหรับระบบ HR อ่านและแก้ไขข้อมูล', 'read_write', 1, 'system'),
('DEMO-KEY-003...', '$2a$10$YourHashedKeyHere3', 'Reporting Tool', N'สำหรับระบบรายงาน อ่านอย่างเดียว', 'read', 1, 'system');
GO

-- Display summary
SELECT 'Data Summary' as Report;
SELECT 'Companies' as Entity, COUNT(*) as Count FROM Companies
UNION ALL
SELECT 'Branches', COUNT(*) FROM Branches
UNION ALL
SELECT 'Divisions', COUNT(*) FROM Divisions
UNION ALL
SELECT 'Departments', COUNT(*) FROM Departments
UNION ALL
SELECT 'API Keys', COUNT(*) FROM API_Keys;
GO

PRINT 'Sample data inserted successfully!';
GO