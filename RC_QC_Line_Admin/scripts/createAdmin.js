// scripts/createAdmin.js
// Script to create the first admin user

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const config = require('../config/database');
const { PASSWORD } = require('../config/constants');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function validatePassword(password) {
    const errors = [];
    
    if (password.length < PASSWORD.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters long`);
    }
    
    if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (PASSWORD.REQUIRE_SPECIAL) {
        const specialRegex = new RegExp(`[${PASSWORD.SPECIAL_CHARS}]`);
        if (!specialRegex.test(password)) {
            errors.push(`Password must contain at least one special character (${PASSWORD.SPECIAL_CHARS})`);
        }
    }
    
    return errors;
}

async function createAdmin() {
    let pool;
    
    try {
        console.log('\n🔐 Admin User Creation Tool\n');
        console.log('This tool will help you create the first admin user for the system.\n');
        
        // Get user input
        const employeeId = await question('Employee ID: ');
        if (!employeeId || !/^[a-zA-Z0-9]{3,20}$/.test(employeeId)) {
            throw new Error('Invalid employee ID. Must be 3-20 alphanumeric characters.');
        }
        
        const fullName = await question('Full Name: ');
        if (!fullName || fullName.length < 2) {
            throw new Error('Full name is required and must be at least 2 characters.');
        }
        
        const email = await question('Email: ');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email format.');
        }
        
        const department = await question('Department: ');
        if (!department) {
            throw new Error('Department is required.');
        }
        
        // Password input
        console.log('\nPassword Requirements:');
        console.log(`- At least ${PASSWORD.MIN_LENGTH} characters`);
        if (PASSWORD.REQUIRE_UPPERCASE) console.log('- At least one uppercase letter');
        if (PASSWORD.REQUIRE_LOWERCASE) console.log('- At least one lowercase letter');
        if (PASSWORD.REQUIRE_NUMBER) console.log('- At least one number');
        if (PASSWORD.REQUIRE_SPECIAL) console.log(`- At least one special character (${PASSWORD.SPECIAL_CHARS})`);
        console.log('');
        
        const password = await question('Password: ');
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            throw new Error('Invalid password:\n' + passwordErrors.join('\n'));
        }
        
        const confirmPassword = await question('Confirm Password: ');
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }
        
        // Language preference
        const language = await question('Preferred Language (th-TH/en-US) [th-TH]: ') || 'th-TH';
        if (!['th-TH', 'en-US'].includes(language)) {
            throw new Error('Invalid language. Must be th-TH or en-US.');
        }
        
        // Confirm creation
        console.log('\n📋 Summary:');
        console.log(`   Employee ID: ${employeeId}`);
        console.log(`   Full Name: ${fullName}`);
        console.log(`   Email: ${email}`);
        console.log(`   Department: ${department}`);
        console.log(`   Role: admin`);
        console.log(`   Language: ${language}`);
        console.log('');
        
        const confirm = await question('Create this admin user? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log('\n❌ User creation cancelled.\n');
            process.exit(0);
        }
        
        // Connect to database
        console.log('\n🔗 Connecting to database...');
        pool = await sql.connect(config);
        
        // Check if employee ID already exists
        const existingUser = await pool.request()
            .input('employee_id', sql.NVarChar, employeeId)
            .query('SELECT admin_id FROM AdminUsers WHERE employee_id = @employee_id');
        
        if (existingUser.recordset.length > 0) {
            throw new Error('An admin user with this employee ID already exists.');
        }
        
        // Hash password
        console.log('🔒 Hashing password...');
        const passwordHash = await bcrypt.hash(password, PASSWORD.SALT_ROUNDS);
        
        // Create user
        console.log('👤 Creating admin user...');
        const result = await pool.request()
            .input('employee_id', sql.NVarChar, employeeId)
            .input('password_hash', sql.NVarChar, passwordHash)
            .input('full_name', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('department', sql.NVarChar, department)
            .input('role', sql.NVarChar, 'admin')
            .input('preferred_language', sql.NVarChar, language)
            .query(`
                INSERT INTO AdminUsers (
                    employee_id, password_hash, full_name, email, 
                    department, role, preferred_language
                )
                OUTPUT INSERTED.admin_id
                VALUES (
                    @employee_id, @password_hash, @full_name, @email,
                    @department, @role, @preferred_language
                )
            `);
        
        const adminId = result.recordset[0].admin_id;
        
        // Create audit log
        await pool.request()
            .input('admin_id', sql.Int, adminId)
            .input('action_type', sql.NVarChar, 'USER_CREATE')
            .input('entity_type', sql.NVarChar, 'USER')
            .input('entity_id', sql.Int, adminId)
            .input('description', sql.NVarChar, 'Initial admin user created via setup script')
            .query(`
                INSERT INTO AuditLogs (
                    admin_id, action_type, entity_type, entity_id, description
                )
                VALUES (
                    @admin_id, @action_type, @entity_type, @entity_id, @description
                )
            `);
        
        console.log('\n✅ Admin user created successfully!\n');
        console.log('📌 Login credentials:');
        console.log(`   Employee ID: ${employeeId}`);
        console.log(`   Password: [the password you entered]`);
        console.log('\n🚀 You can now start the server and login with these credentials.\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
        process.exit(1);
    } finally {
        rl.close();
        if (pool) {
            await pool.close();
        }
    }
}

// Handle script termination
process.on('SIGINT', () => {
    console.log('\n\n❌ User creation cancelled.\n');
    process.exit(0);
});

// Run the script
createAdmin();