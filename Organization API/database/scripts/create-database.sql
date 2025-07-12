-- =============================================
-- Create Database Script
-- Organization Structure Management System
-- =============================================

-- Check if database exists and create if not
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'OrgStructureDB')
BEGIN
    CREATE DATABASE OrgStructureDB
    COLLATE Thai_CI_AS;
    
    PRINT 'Database OrgStructureDB created successfully.';
END
ELSE
BEGIN
    PRINT 'Database OrgStructureDB already exists.';
END
GO

-- Set database options
ALTER DATABASE OrgStructureDB SET RECOVERY SIMPLE;
ALTER DATABASE OrgStructureDB SET AUTO_SHRINK OFF;
ALTER DATABASE OrgStructureDB SET AUTO_UPDATE_STATISTICS ON;
GO

-- Use the database
USE OrgStructureDB;
GO

PRINT 'Database setup completed.';
GO