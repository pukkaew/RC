// Path: RC_QC_Line_Admin/scripts/setup.js
// Initial database setup script

require('dotenv').config();
const DatabaseService = require('../services/DatabaseService');
const logger = require('../utils/logger');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
    console.log('🚀 RC QC Admin Dashboard - Database Setup');
    console.log('========================================\n');
    
    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        await DatabaseService.testConnection();
        console.log('✅ Database connection successful!\n');
        
        // Check existing tables
        console.log('🔍 Checking existing tables...');
        const existingTables = await DatabaseService.checkExistingTables();
        
        if (existingTables.adminTables > 0) {
            console.log(`⚠️  Found ${existingTables.adminTables} existing admin tables.`);
            const answer = await question('Do you want to continue? This will NOT delete existing data. (y/N): ');
            
            if (answer.toLowerCase() !== 'y') {
                console.log('❌ Setup cancelled.');
                process.exit(0);
            }
        }
        
        // Create admin tables
        console.log('\n📊 Creating admin tables...');
        const result = await DatabaseService.createAdminTables();
        
        if (result.tablesCreated.length > 0) {
            console.log(`✅ Created ${result.tablesCreated.length} tables:`);
            result.tablesCreated.forEach(table => {
                console.log(`   - ${table}`);
            });
        } else {
            console.log('ℹ️  All tables already exist.');
        }
        
        // Create default admin user
        console.log('\n👤 Checking for default admin user...');
        const adminCreated = await DatabaseService.createDefaultAdmin();
        
        if (adminCreated) {
            console.log('✅ Default admin user created:');
            console.log('   Employee ID: ADMIN');
            console.log('   Password: Admin@123');
            console.log('   ⚠️  Please change this password after first login!');
        } else {
            console.log('ℹ️  Admin user already exists.');
        }
        
        // Create indexes
        console.log('\n🔧 Creating database indexes...');
        await DatabaseService.createIndexes();
        console.log('✅ Indexes created successfully!');
        
        // Verify setup
        console.log('\n🏁 Verifying setup...');
        const verification = await DatabaseService.verifySetup();
        
        if (verification.success) {
            console.log('✅ Setup verification passed!');
            console.log(`   - Admin tables: ${verification.adminTables}`);
            console.log(`   - Shared tables: ${verification.sharedTables}`);
            console.log(`   - Admin users: ${verification.adminUsers}`);
        } else {
            console.log('❌ Setup verification failed!');
            console.log('   Please check the logs for errors.');
        }
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\nYou can now start the application with:');
        console.log('   npm start\n');
        console.log('Access the admin dashboard at:');
        console.log(`   http://localhost:${process.env.PORT || 3001}`);
        console.log('\nDefault login credentials:');
        console.log('   Employee ID: ADMIN');
        console.log('   Password: Admin@123\n');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        logger.error('Setup error:', error);
        process.exit(1);
    } finally {
        await DatabaseService.close();
        rl.close();
    }
}

// Run setup
setup();