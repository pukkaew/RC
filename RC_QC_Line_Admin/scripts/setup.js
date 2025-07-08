require('dotenv').config();
const DatabaseService = require('../services/DatabaseService');
const logger = require('../utils/logger');

async function setup() {
    try {
        console.log('🚀 Starting RC QC Admin Setup...\n');
        
        // Test database connection
        console.log('📡 Testing database connection...');
        const isConnected = await DatabaseService.testConnection();
        
        if (!isConnected) {
            console.error('❌ Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }
        
        console.log('✅ Database connection successful!\n');
        
        // Create admin tables
        console.log('📋 Creating admin tables...');
        const tableResult = await DatabaseService.createAdminTables();
        
        if (tableResult.tablesCreated.length > 0) {
            console.log(`✅ Created tables: ${tableResult.tablesCreated.join(', ')}`);
        } else {
            console.log('ℹ️  All tables already exist');
        }
        
        // Create default admin user
        console.log('\n👤 Setting up default admin user...');
        const adminCreated = await DatabaseService.createDefaultAdmin();
        
        if (adminCreated) {
            console.log('✅ Default admin user created!');
            console.log('   Employee ID: ADMIN');
            console.log('   Password: Admin@123');
            console.log('   ⚠️  Please change this password after first login!');
        } else {
            console.log('ℹ️  Admin user already exists');
        }
        
        // Run initial maintenance
        console.log('\n🧹 Running initial maintenance...');
        const maintenanceResult = await DatabaseService.runMaintenance();
        
        if (maintenanceResult.success) {
            console.log('✅ Maintenance completed successfully');
            maintenanceResult.tasks.forEach(task => {
                console.log(`   - ${task.task}: ${task.success ? '✓' : '✗'}`);
            });
        }
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📌 Next steps:');
        console.log('   1. Run "npm start" to start the server');
        console.log('   2. Access the admin panel at http://localhost:3001');
        console.log('   3. Login with Employee ID: ADMIN, Password: Admin@123');
        console.log('   4. Change the default password immediately');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        logger.error('Setup error:', error);
        process.exit(1);
    }
}

// Run setup
setup();