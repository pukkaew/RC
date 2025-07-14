// Path: /test-db.js
require('dotenv').config();
const { connectDatabase, executeQuery, closeDatabase } = require('./src/config/database');

async function testDatabaseConnection() {
    console.log('🔄 Testing database connection...');
    console.log('Configuration:');
    console.log(`  Server: ${process.env.DB_SERVER}`);
    console.log(`  Port: ${process.env.DB_PORT}`);
    console.log(`  Database: ${process.env.DB_DATABASE}`);
    console.log(`  User: ${process.env.DB_USER}`);
    console.log(`  Encrypt: ${process.env.DB_ENCRYPT}`);
    console.log(`  Trust Server Certificate: ${process.env.DB_TRUST_SERVER_CERTIFICATE}`);
    console.log('');

    try {
        // Test connection
        await connectDatabase();
        console.log('✅ Database connected successfully!');
        
        // Test simple query
        console.log('🔄 Testing query execution...');
        const result = await executeQuery('SELECT 1 as test, GETDATE() as current_time');
        console.log('✅ Query executed successfully!');
        console.log('   Server time:', result.recordset[0].current_time);
        
        // Test tables exist
        console.log('🔄 Checking tables...');
        const tablesQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME IN ('Companies', 'Branches', 'Divisions', 'Departments', 'API_Keys', 'API_Logs')
            ORDER BY TABLE_NAME
        `;
        
        const tablesResult = await executeQuery(tablesQuery);
        
        if (tablesResult.recordset.length === 0) {
            console.log('⚠️  No tables found. Please run database initialization scripts.');
        } else {
            console.log('✅ Found tables:');
            tablesResult.recordset.forEach(row => {
                console.log(`   - ${row.TABLE_NAME}`);
            });
        }
        
        // Check data count
        if (tablesResult.recordset.length > 0) {
            console.log('\n🔄 Checking data...');
            for (const table of tablesResult.recordset) {
                try {
                    const countResult = await executeQuery(`SELECT COUNT(*) as count FROM ${table.TABLE_NAME}`);
                    console.log(`   ${table.TABLE_NAME}: ${countResult.recordset[0].count} records`);
                } catch (err) {
                    console.log(`   ${table.TABLE_NAME}: Error counting records`);
                }
            }
        }
        
        // Close connection
        await closeDatabase();
        console.log('\n✅ All tests passed! Database is ready.');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Database connection failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'ELOGIN') {
            console.error('\n💡 Login failed. Please check:');
            console.error('   - Username and password are correct');
            console.error('   - SQL Server authentication is enabled');
            console.error('   - User has access to the database');
        } else if (error.code === 'ENOTOPEN') {
            console.error('\n💡 Cannot connect to server. Please check:');
            console.error('   - SQL Server is running');
            console.error('   - Server name is correct');
            console.error('   - Port is correct (default: 1433)');
            console.error('   - Firewall allows connection');
        } else if (error.code === 'ETIMEOUT') {
            console.error('\n💡 Connection timeout. Please check:');
            console.error('   - Network connectivity');
            console.error('   - SQL Server is accepting connections');
            console.error('   - No firewall blocking');
        }
        
        process.exit(1);
    }
}

// Run the test
testDatabaseConnection();