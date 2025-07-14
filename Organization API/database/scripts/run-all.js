// Path: /database/scripts/run-all.js
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { connectDatabase, executeQuery, closeDatabase } = require('../../src/config/database');

const scripts = [
    'create-database.sql',
    'create-tables.sql',
    'create-sessions-table.sql',
    'create-stored-procedures.sql',
    'create-indexes.sql',
    'insert-sample-data.sql'
];

async function runScript(scriptPath) {
    try {
        console.log(`\n📄 Running: ${path.basename(scriptPath)}`);
        
        const content = await fs.readFile(scriptPath, 'utf8');
        
        // Split by GO statements
        const batches = content.split(/\nGO\r?\n/i).filter(batch => batch.trim());
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            
            if (batch) {
                try {
                    await executeQuery(batch);
                    console.log(`   ✅ Batch ${i + 1}/${batches.length} executed successfully`);
                } catch (error) {
                    console.error(`   ❌ Error in batch ${i + 1}:`, error.message);
                    
                    // Skip expected errors
                    if (error.message.includes('already exists') ||
                        error.message.includes('Cannot drop') ||
                        error.message.includes('Violation of PRIMARY KEY')) {
                        console.log(`   ⚠️  Skipping (already exists)`);
                        continue;
                    }
                    
                    throw error;
                }
            }
        }
        
        console.log(`   ✅ Completed: ${path.basename(scriptPath)}`);
        
    } catch (error) {
        console.error(`❌ Failed to run ${scriptPath}:`, error.message);
        throw error;
    }
}

async function runAllScripts() {
    console.log('🚀 Starting database initialization...\n');
    
    try {
        // Connect to database
        await connectDatabase();
        console.log('✅ Connected to database\n');
        
        // Run each script in order
        for (const script of scripts) {
            const scriptPath = path.join(__dirname, script);
            
            // Check if file exists
            try {
                await fs.access(scriptPath);
                await runScript(scriptPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`   ⚠️  Skipping ${script} (file not found)`);
                    continue;
                }
                throw error;
            }
        }
        
        // Verify tables were created
        console.log('\n🔍 Verifying database setup...');
        
        const tableCheckQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME IN ('Companies', 'Branches', 'Divisions', 'Departments', 'API_Keys', 'API_Logs', 'Sessions')
            ORDER BY TABLE_NAME
        `;
        
        const result = await executeQuery(tableCheckQuery);
        
        console.log('\n📊 Tables created:');
        result.recordset.forEach(row => {
            console.log(`   ✅ ${row.TABLE_NAME}`);
        });
        
        // Count sample data
        const tables = ['Companies', 'Branches', 'Divisions', 'Departments'];
        console.log('\n📈 Sample data loaded:');
        
        for (const table of tables) {
            try {
                const countResult = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   - ${table}: ${countResult.recordset[0].count} records`);
            } catch (error) {
                console.log(`   - ${table}: Error counting records`);
            }
        }
        
        console.log('\n✅ Database initialization completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Database initialization failed:', error.message);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

// Run if called directly
if (require.main === module) {
    runAllScripts();
}

module.exports = { runAllScripts };