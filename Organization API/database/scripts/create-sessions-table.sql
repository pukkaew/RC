-- Path: /database/scripts/create-sessions-table.sql
-- Create Sessions table for express-session store

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'Sessions' AND xtype = 'U')
BEGIN
    CREATE TABLE Sessions (
        sid VARCHAR(255) NOT NULL PRIMARY KEY,
        session NVARCHAR(MAX) NOT NULL,
        expires DATETIME NOT NULL
    );

    -- Create index on expires for cleanup
    CREATE INDEX IDX_Sessions_Expires ON Sessions(expires);

    PRINT 'Sessions table created successfully';
END
ELSE
BEGIN
    PRINT 'Sessions table already exists';
END
GO

-- Create cleanup job (optional)
-- This stored procedure can be scheduled to run periodically
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CleanupExpiredSessions]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CleanupExpiredSessions]
GO

CREATE PROCEDURE sp_CleanupExpiredSessions
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM Sessions
    WHERE expires < GETDATE();
    
    RETURN @@ROWCOUNT;
END
GO

PRINT 'Session cleanup procedure created';
GO