// scripts/setup.js
// Database setup script - creates all necessary tables

require('dotenv').config();
const sql = require('mssql');
const config = require('../config/database');

async function setup() {
    let pool;
    
    try {
        console.log('🔧 Starting database setup...\n');
        
        // Connect to database
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');
        
        // Create AdminUsers table
        console.log('📋 Creating AdminUsers table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminUsers' AND xtype='U')
            CREATE TABLE AdminUsers (
                admin_id INT PRIMARY KEY IDENTITY(1,1),
                employee_id NVARCHAR(20) UNIQUE NOT NULL,
                password_hash NVARCHAR(255) NOT NULL,
                full_name NVARCHAR(100) NOT NULL,
                email NVARCHAR(100),
                department NVARCHAR(100),
                role NVARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'manager', 'admin')),
                preferred_language NVARCHAR(10) DEFAULT 'th-TH',
                is_active BIT DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT GETDATE(),
                created_by INT,
                updated_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_AdminUsers_CreatedBy FOREIGN KEY (created_by)
                    REFERENCES AdminUsers(admin_id)
            );
        `);
        
        // Create indexes
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminUsers_employee_id')
            CREATE INDEX IX_AdminUsers_employee_id ON AdminUsers(employee_id);
            
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminUsers_role')
            CREATE INDEX IX_AdminUsers_role ON AdminUsers(role);
        `);
        console.log('✅ AdminUsers table created\n');
        
        // Create AdminSessions table
        console.log('📋 Creating AdminSessions table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminSessions' AND xtype='U')
            CREATE TABLE AdminSessions (
                session_id NVARCHAR(255) PRIMARY KEY,
                admin_id INT NOT NULL,
                session_data NVARCHAR(MAX),
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_AdminSessions_User FOREIGN KEY (admin_id)
                    REFERENCES AdminUsers(admin_id) ON DELETE CASCADE
            );
        `);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminSessions_expires_at')
            CREATE INDEX IX_AdminSessions_expires_at ON AdminSessions(expires_at);
        `);
        console.log('✅ AdminSessions table created\n');
        
        // Create AuditLogs table
        console.log('📋 Creating AuditLogs table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' AND xtype='U')
            CREATE TABLE AuditLogs (
                log_id INT PRIMARY KEY IDENTITY(1,1),
                admin_id INT,
                action_type NVARCHAR(50) NOT NULL,
                entity_type NVARCHAR(50),
                entity_id INT,
                old_value NVARCHAR(MAX),
                new_value NVARCHAR(MAX),
                description NVARCHAR(500),
                ip_address NVARCHAR(50),
                user_agent NVARCHAR(500),
                created_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_AuditLogs_User FOREIGN KEY (admin_id)
                    REFERENCES AdminUsers(admin_id)
            );
        `);
        
        // Create indexes for AuditLogs
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_admin_id')
            CREATE INDEX IX_AuditLogs_admin_id ON AuditLogs(admin_id);
            
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_created_at')
            CREATE INDEX IX_AuditLogs_created_at ON AuditLogs(created_at);
            
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_action_type')
            CREATE INDEX IX_AuditLogs_action_type ON AuditLogs(action_type);
            
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_entity_type')
            CREATE INDEX IX_AuditLogs_entity_type ON AuditLogs(entity_type);
        `);
        console.log('✅ AuditLogs table created\n');
        
        // Check if existing tables exist
        console.log('🔍 Checking existing tables...');
        
        const lotsExists = await pool.request().query(`
            SELECT COUNT(*) as count FROM sysobjects WHERE name='Lots' AND xtype='U'
        `);
        
        const imagesExists = await pool.request().query(`
            SELECT COUNT(*) as count FROM sysobjects WHERE name='Images' AND xtype='U'
        `);
        
        const usersExists = await pool.request().query(`
            SELECT COUNT(*) as count FROM sysobjects WHERE name='Users' AND xtype='U'
        `);
        
        if (lotsExists.recordset[0].count === 0) {
            console.log('⚠️  Warning: Lots table does not exist');
            console.log('   Creating sample Lots table for testing...');
            
            await pool.request().query(`
                CREATE TABLE Lots (
                    lot_id INT PRIMARY KEY IDENTITY(1,1),
                    lot_number NVARCHAR(100) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    status NVARCHAR(50) DEFAULT 'active'
                );
            `);
            console.log('✅ Sample Lots table created');
        } else {
            console.log('✅ Lots table exists');
        }
        
        if (imagesExists.recordset[0].count === 0) {
            console.log('⚠️  Warning: Images table does not exist');
            console.log('   Creating sample Images table for testing...');
            
            await pool.request().query(`
                CREATE TABLE Images (
                    image_id INT PRIMARY KEY IDENTITY(1,1),
                    lot_id INT,
                    image_date DATE,
                    file_name NVARCHAR(255),
                    file_path NVARCHAR(500),
                    original_size INT,
                    compressed_size INT,
                    mime_type NVARCHAR(50),
                    uploaded_by NVARCHAR(255),
                    uploaded_at DATETIME DEFAULT GETDATE(),
                    status NVARCHAR(50) DEFAULT 'active',
                    CONSTRAINT FK_Images_Lot FOREIGN KEY (lot_id)
                        REFERENCES Lots(lot_id)
                );
            `);
            console.log('✅ Sample Images table created');
        } else {
            console.log('✅ Images table exists');
        }
        
        if (usersExists.recordset[0].count === 0) {
            console.log('⚠️  Warning: Users table does not exist');
            console.log('   Creating sample Users table for testing...');
            
            await pool.request().query(`
                CREATE TABLE Users (
                    user_id INT PRIMARY KEY IDENTITY(1,1),
                    line_user_id NVARCHAR(255) UNIQUE,
                    username NVARCHAR(100),
                    email NVARCHAR(100),
                    created_at DATETIME DEFAULT GETDATE()
                );
            `);
            console.log('✅ Sample Users table created');
        } else {
            console.log('✅ Users table exists');
        }
        
        console.log('\n✨ Database setup completed successfully!\n');
        console.log('📌 Next steps:');
        console.log('   1. Run "npm run create-admin" to create the first admin user');
        console.log('   2. Start the server with "npm start"\n');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nPlease check your database configuration and try again.');
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Run setup
setup();