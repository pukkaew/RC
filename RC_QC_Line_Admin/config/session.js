const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const logger = require('../utils/logger');

// Custom session store
class MSSQLStore extends session.Store {
    constructor(options = {}) {
        super(options);
        this.tableName = options.tableName || 'AdminSessions';
        this.ttl = options.ttl || 1800; // 30 minutes default
        this.autoRemove = options.autoRemove !== false;
        this.autoRemoveInterval = options.autoRemoveInterval || 600; // 10 minutes
        
        if (this.autoRemove) {
            this.startAutoRemove();
        }
    }
    
    async get(sessionId, callback) {
        try {
            const result = await db.query(
                `SELECT session_data, expires_at FROM ${this.tableName} 
                WHERE session_id = @sessionId AND expires_at > GETDATE()`,
                { sessionId }
            );
            
            if (result.recordset.length > 0) {
                const sessionData = JSON.parse(result.recordset[0].session_data);
                callback(null, sessionData);
            } else {
                callback(null, null);
            }
        } catch (error) {
            logger.error('Session get error:', error);
            callback(error);
        }
    }
    
    async set(sessionId, session, callback) {
        try {
            const expires = new Date(Date.now() + (session.cookie.maxAge || this.ttl * 1000));
            const sessionData = JSON.stringify(session);
            
            await db.query(
                `MERGE ${this.tableName} AS target
                USING (SELECT @sessionId AS session_id) AS source
                ON target.session_id = source.session_id
                WHEN MATCHED THEN
                    UPDATE SET 
                        session_data = @sessionData,
                        expires_at = @expires,
                        admin_id = @adminId
                WHEN NOT MATCHED THEN
                    INSERT (session_id, admin_id, session_data, expires_at)
                    VALUES (@sessionId, @adminId, @sessionData, @expires);`,
                {
                    sessionId,
                    adminId: session.user?.admin_id || null,
                    sessionData,
                    expires
                }
            );
            
            callback(null);
        } catch (error) {
            logger.error('Session set error:', error);
            callback(error);
        }
    }
    
    async destroy(sessionId, callback) {
        try {
            await db.query(
                `DELETE FROM ${this.tableName} WHERE session_id = @sessionId`,
                { sessionId }
            );
            callback(null);
        } catch (error) {
            logger.error('Session destroy error:', error);
            callback(error);
        }
    }
    
    async touch(sessionId, session, callback) {
        try {
            const expires = new Date(Date.now() + (session.cookie.maxAge || this.ttl * 1000));
            
            await db.query(
                `UPDATE ${this.tableName} 
                SET expires_at = @expires 
                WHERE session_id = @sessionId`,
                { sessionId, expires }
            );
            
            callback(null);
        } catch (error) {
            logger.error('Session touch error:', error);
            callback(error);
        }
    }
    
    async clear(callback) {
        try {
            await db.query(`DELETE FROM ${this.tableName}`);
            callback(null);
        } catch (error) {
            logger.error('Session clear error:', error);
            callback(error);
        }
    }
    
    async length(callback) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM ${this.tableName} WHERE expires_at > GETDATE()`
            );
            callback(null, result.recordset[0].count);
        } catch (error) {
            logger.error('Session length error:', error);
            callback(error);
        }
    }
    
    async all(callback) {
        try {
            const result = await db.query(
                `SELECT session_id, session_data FROM ${this.tableName} WHERE expires_at > GETDATE()`
            );
            
            const sessions = {};
            result.recordset.forEach(row => {
                sessions[row.session_id] = JSON.parse(row.session_data);
            });
            
            callback(null, sessions);
        } catch (error) {
            logger.error('Session all error:', error);
            callback(error);
        }
    }
    
    startAutoRemove() {
        setInterval(async () => {
            try {
                const result = await db.query(
                    `DELETE FROM ${this.tableName} WHERE expires_at <= GETDATE()`
                );
                
                if (result.rowsAffected[0] > 0) {
                    logger.info(`Removed ${result.rowsAffected[0]} expired sessions`);
                }
            } catch (error) {
                logger.error('Session auto-remove error:', error);
            }
        }, this.autoRemoveInterval * 1000);
    }
}

// Session configuration
const sessionConfig = {
    genid: () => uuidv4(),
    store: new MSSQLStore({
        tableName: 'AdminSessions',
        ttl: parseInt(process.env.SESSION_MAX_AGE) / 1000 || 1800
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: process.env.SESSION_NAME || 'rc_qc_admin_session',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 1800000, // 30 minutes
        sameSite: 'strict'
    }
};

module.exports = sessionConfig;