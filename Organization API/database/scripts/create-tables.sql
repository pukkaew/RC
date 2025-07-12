-- =============================================
-- Organization Structure Management System
-- Database Schema Creation Script
-- Version: 1.0
-- =============================================

USE [OrgStructureDB]
GO

-- =============================================
-- 1. Companies Table
-- =============================================
CREATE TABLE [dbo].[Companies] (
    [company_code] VARCHAR(20) NOT NULL,
    [company_name_th] NVARCHAR(200) NOT NULL,
    [company_name_en] VARCHAR(200) NULL,
    [tax_id] VARCHAR(13) NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(50) NOT NULL,
    [updated_date] DATETIME NULL,
    [updated_by] VARCHAR(50) NULL,
    CONSTRAINT [PK_Companies] PRIMARY KEY CLUSTERED ([company_code])
);
GO

-- =============================================
-- 2. Branches Table
-- =============================================
CREATE TABLE [dbo].[Branches] (
    [branch_code] VARCHAR(20) NOT NULL,
    [branch_name] NVARCHAR(200) NOT NULL,
    [company_code] VARCHAR(20) NOT NULL,
    [is_headquarters] BIT NOT NULL DEFAULT 0,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(50) NOT NULL,
    [updated_date] DATETIME NULL,
    [updated_by] VARCHAR(50) NULL,
    CONSTRAINT [PK_Branches] PRIMARY KEY CLUSTERED ([branch_code]),
    CONSTRAINT [FK_Branches_Companies] FOREIGN KEY ([company_code]) 
        REFERENCES [dbo].[Companies]([company_code])
);
GO

-- =============================================
-- 3. Divisions Table
-- =============================================
CREATE TABLE [dbo].[Divisions] (
    [division_code] VARCHAR(20) NOT NULL,
    [division_name] NVARCHAR(200) NOT NULL,
    [company_code] VARCHAR(20) NOT NULL,
    [branch_code] VARCHAR(20) NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(50) NOT NULL,
    [updated_date] DATETIME NULL,
    [updated_by] VARCHAR(50) NULL,
    CONSTRAINT [PK_Divisions] PRIMARY KEY CLUSTERED ([division_code]),
    CONSTRAINT [FK_Divisions_Companies] FOREIGN KEY ([company_code]) 
        REFERENCES [dbo].[Companies]([company_code]),
    CONSTRAINT [FK_Divisions_Branches] FOREIGN KEY ([branch_code]) 
        REFERENCES [dbo].[Branches]([branch_code])
);
GO

-- =============================================
-- 4. Departments Table
-- =============================================
CREATE TABLE [dbo].[Departments] (
    [department_code] VARCHAR(20) NOT NULL,
    [department_name] NVARCHAR(200) NOT NULL,
    [division_code] VARCHAR(20) NOT NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(50) NOT NULL,
    [updated_date] DATETIME NULL,
    [updated_by] VARCHAR(50) NULL,
    CONSTRAINT [PK_Departments] PRIMARY KEY CLUSTERED ([department_code]),
    CONSTRAINT [FK_Departments_Divisions] FOREIGN KEY ([division_code]) 
        REFERENCES [dbo].[Divisions]([division_code])
);
GO

-- =============================================
-- 5. API Keys Table
-- =============================================
CREATE TABLE [dbo].[API_Keys] (
    [api_key_id] INT IDENTITY(1,1) NOT NULL,
    [api_key] VARCHAR(64) NOT NULL,
    [api_key_hash] VARCHAR(255) NOT NULL,
    [app_name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500) NULL,
    [permissions] VARCHAR(100) NOT NULL DEFAULT 'read', -- read, write, read_write
    [is_active] BIT NOT NULL DEFAULT 1,
    [last_used_date] DATETIME NULL,
    [expires_date] DATETIME NULL,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(50) NOT NULL,
    [updated_date] DATETIME NULL,
    [updated_by] VARCHAR(50) NULL,
    CONSTRAINT [PK_API_Keys] PRIMARY KEY CLUSTERED ([api_key_id]),
    CONSTRAINT [UQ_API_Keys_Hash] UNIQUE ([api_key_hash])
);
GO

-- =============================================
-- 6. API Logs Table
-- =============================================
CREATE TABLE [dbo].[API_Logs] (
    [log_id] BIGINT IDENTITY(1,1) NOT NULL,
    [api_key_id] INT NOT NULL,
    [endpoint] VARCHAR(200) NOT NULL,
    [method] VARCHAR(10) NOT NULL,
    [request_body] NVARCHAR(MAX) NULL,
    [response_status] INT NOT NULL,
    [response_time_ms] INT NOT NULL,
    [ip_address] VARCHAR(45) NULL,
    [user_agent] VARCHAR(500) NULL,
    [error_message] NVARCHAR(1000) NULL,
    [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_API_Logs] PRIMARY KEY CLUSTERED ([log_id]),
    CONSTRAINT [FK_API_Logs_API_Keys] FOREIGN KEY ([api_key_id]) 
        REFERENCES [dbo].[API_Keys]([api_key_id])
);
GO

-- =============================================
-- 7. Create Indexes
-- =============================================
-- Companies Indexes
CREATE NONCLUSTERED INDEX [IX_Companies_company_name_th] 
    ON [dbo].[Companies]([company_name_th]);
CREATE NONCLUSTERED INDEX [IX_Companies_is_active] 
    ON [dbo].[Companies]([is_active]);
GO

-- Branches Indexes
CREATE NONCLUSTERED INDEX [IX_Branches_company_code] 
    ON [dbo].[Branches]([company_code]);
CREATE NONCLUSTERED INDEX [IX_Branches_is_active] 
    ON [dbo].[Branches]([is_active]);
GO

-- Divisions Indexes
CREATE NONCLUSTERED INDEX [IX_Divisions_company_code] 
    ON [dbo].[Divisions]([company_code]);
CREATE NONCLUSTERED INDEX [IX_Divisions_branch_code] 
    ON [dbo].[Divisions]([branch_code]);
CREATE NONCLUSTERED INDEX [IX_Divisions_is_active] 
    ON [dbo].[Divisions]([is_active]);
GO

-- Departments Indexes
CREATE NONCLUSTERED INDEX [IX_Departments_division_code] 
    ON [dbo].[Departments]([division_code]);
CREATE NONCLUSTERED INDEX [IX_Departments_is_active] 
    ON [dbo].[Departments]([is_active]);
GO

-- API Logs Indexes
CREATE NONCLUSTERED INDEX [IX_API_Logs_api_key_id] 
    ON [dbo].[API_Logs]([api_key_id]);
CREATE NONCLUSTERED INDEX [IX_API_Logs_created_date] 
    ON [dbo].[API_Logs]([created_date]);
CREATE NONCLUSTERED INDEX [IX_API_Logs_endpoint_method] 
    ON [dbo].[API_Logs]([endpoint], [method]);
GO

-- =============================================
-- 8. Create Check Constraints
-- =============================================
-- Ensure only one headquarters per company
CREATE FUNCTION [dbo].[fn_CheckSingleHeadquarters](@company_code VARCHAR(20), @branch_code VARCHAR(20))
RETURNS BIT
AS
BEGIN
    DECLARE @Result BIT = 1
    IF EXISTS (
        SELECT 1 FROM [dbo].[Branches] 
        WHERE [company_code] = @company_code 
        AND [is_headquarters] = 1 
        AND [branch_code] <> @branch_code
    )
    SET @Result = 0
    RETURN @Result
END
GO

ALTER TABLE [dbo].[Branches]
ADD CONSTRAINT [CK_Branches_SingleHeadquarters] 
CHECK ([is_headquarters] = 0 OR [dbo].[fn_CheckSingleHeadquarters]([company_code], [branch_code]) = 1);
GO

-- Validate tax_id format (13 digits)
ALTER TABLE [dbo].[Companies]
ADD CONSTRAINT [CK_Companies_TaxId] 
CHECK ([tax_id] IS NULL OR ([tax_id] LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'));
GO

-- Validate permissions values
ALTER TABLE [dbo].[API_Keys]
ADD CONSTRAINT [CK_API_Keys_Permissions] 
CHECK ([permissions] IN ('read', 'write', 'read_write'));
GO

-- =============================================
-- 9. Create Views for Common Queries
-- =============================================
-- Organization Tree View
CREATE VIEW [dbo].[vw_OrganizationTree]
AS
SELECT 
    c.[company_code],
    c.[company_name_th],
    c.[company_name_en],
    b.[branch_code],
    b.[branch_name],
    b.[is_headquarters],
    d.[division_code],
    d.[division_name],
    dp.[department_code],
    dp.[department_name]
FROM [dbo].[Companies] c
LEFT JOIN [dbo].[Branches] b ON c.[company_code] = b.[company_code] AND b.[is_active] = 1
LEFT JOIN [dbo].[Divisions] d ON c.[company_code] = d.[company_code] 
    AND (b.[branch_code] IS NULL OR b.[branch_code] = d.[branch_code]) 
    AND d.[is_active] = 1
LEFT JOIN [dbo].[Departments] dp ON d.[division_code] = dp.[division_code] AND dp.[is_active] = 1
WHERE c.[is_active] = 1;
GO

-- API Usage Statistics View
CREATE VIEW [dbo].[vw_APIUsageStats]
AS
SELECT 
    ak.[api_key_id],
    ak.[app_name],
    ak.[permissions],
    COUNT(al.[log_id]) as total_requests,
    AVG(al.[response_time_ms]) as avg_response_time,
    SUM(CASE WHEN al.[response_status] >= 200 AND al.[response_status] < 300 THEN 1 ELSE 0 END) as successful_requests,
    SUM(CASE WHEN al.[response_status] >= 400 THEN 1 ELSE 0 END) as failed_requests,
    MAX(al.[created_date]) as last_access_date
FROM [dbo].[API_Keys] ak
LEFT JOIN [dbo].[API_Logs] al ON ak.[api_key_id] = al.[api_key_id]
WHERE ak.[is_active] = 1
GROUP BY ak.[api_key_id], ak.[app_name], ak.[permissions];
GO

-- =============================================
-- 10. Create Stored Procedures
-- =============================================
-- Get Organization Structure by Company
CREATE PROCEDURE [dbo].[sp_GetOrganizationStructure]
    @company_code VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        c.[company_code],
        c.[company_name_th],
        c.[company_name_en],
        c.[tax_id],
        c.[is_active] as company_active,
        b.[branch_code],
        b.[branch_name],
        b.[is_headquarters],
        b.[is_active] as branch_active,
        d.[division_code],
        d.[division_name],
        d.[is_active] as division_active,
        dp.[department_code],
        dp.[department_name],
        dp.[is_active] as department_active
    FROM [dbo].[Companies] c
    LEFT JOIN [dbo].[Branches] b ON c.[company_code] = b.[company_code]
    LEFT JOIN [dbo].[Divisions] d ON c.[company_code] = d.[company_code] 
        AND (b.[branch_code] IS NULL OR b.[branch_code] = d.[branch_code])
    LEFT JOIN [dbo].[Departments] dp ON d.[division_code] = dp.[division_code]
    WHERE (@company_code IS NULL OR c.[company_code] = @company_code)
    ORDER BY c.[company_code], b.[branch_code], d.[division_code], dp.[department_code];
END
GO

-- Log API Usage
CREATE PROCEDURE [dbo].[sp_LogAPIUsage]
    @api_key_hash VARCHAR(255),
    @endpoint VARCHAR(200),
    @method VARCHAR(10),
    @request_body NVARCHAR(MAX) = NULL,
    @response_status INT,
    @response_time_ms INT,
    @ip_address VARCHAR(45) = NULL,
    @user_agent VARCHAR(500) = NULL,
    @error_message NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @api_key_id INT;
    
    -- Get API Key ID
    SELECT @api_key_id = [api_key_id] 
    FROM [dbo].[API_Keys] 
    WHERE [api_key_hash] = @api_key_hash AND [is_active] = 1;
    
    IF @api_key_id IS NOT NULL
    BEGIN
        -- Insert log
        INSERT INTO [dbo].[API_Logs] (
            [api_key_id], [endpoint], [method], [request_body], 
            [response_status], [response_time_ms], [ip_address], 
            [user_agent], [error_message]
        )
        VALUES (
            @api_key_id, @endpoint, @method, @request_body, 
            @response_status, @response_time_ms, @ip_address, 
            @user_agent, @error_message
        );
        
        -- Update last used date
        UPDATE [dbo].[API_Keys] 
        SET [last_used_date] = GETDATE() 
        WHERE [api_key_id] = @api_key_id;
    END
END
GO

PRINT 'Database structure created successfully!';