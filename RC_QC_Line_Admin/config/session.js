// Path: RC_QC_Line_Admin/config/session.js
// Express session configuration with SQL Server store

const session = require('express-session');
const MSSQLStore = require('connect-mssql-v2');
const db = require('./database');

// Session store configuration
const storeConfig = {
    config: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
        }
    },
    table: 'AdminSessions', // Table to store sessions
    autoRemove: 'interval',
    autoRemoveInterval: 60, // In minutes
    ttl: parseInt(process.env.SESSION_MAX_AGE) || 1800000 // Default 30 minutes
};

// Session configuration
const sessionConfig = {
    store: new MSSQLStore(storeConfig),
    secret: process.env.SESSION_SECRET || 'rc-qc-admin-secret-key',
    name: process.env.SESSION_NAME || 'rc_qc_admin_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 1800000, // 30 minutes
        sameSite: 'strict'
    },
    rolling: true // Reset expiry on activity
};

// Create session table if not exists
const createSessionTable = async () => {
    try {
        await db.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminSessions' AND xtype='U')
            CREATE TABLE AdminSessions (
                sid NVARCHAR(255) NOT NULL PRIMARY KEY,
                session NVARCHAR(MAX) NOT NULL,
                expires DATETIME NOT NULL,
                INDEX IX_AdminSessions_expires (expires)
            )
        `);
    } catch (error) {
        console.error('Error creating session table:', error);
    }
};

// Initialize session table
createSessionTable();

module.exports = sessionConfig;