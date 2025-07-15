// Path: /generate-hash.js
// สคริปต์สำหรับสร้าง password hash ใหม่
const bcrypt = require('bcryptjs');

async function generateHashes() {
    console.log('🔐 Generating password hashes...\n');
    
    // สร้าง hash สำหรับ admin123
    const adminHash = await bcrypt.hash('admin123', 10);
    console.log('admin123:');
    console.log(adminHash);
    console.log('');
    
    // สร้าง hash สำหรับ user123
    const userHash = await bcrypt.hash('user123', 10);
    console.log('user123:');
    console.log(userHash);
    console.log('');
    
    // ทดสอบ hash
    console.log('✅ Testing hashes...');
    console.log('admin123 valid:', await bcrypt.compare('admin123', adminHash));
    console.log('user123 valid:', await bcrypt.compare('user123', userHash));
    
    console.log('\n📝 Copy these hashes to auth.js:');
    console.log(`
const users = {
    admin: {
        id: 1,
        username: 'admin',
        email: 'admin@organization.com',
        // Password: admin123
        password: '${adminHash}',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users']
    },
    user: {
        id: 2,
        username: 'user',
        email: 'user@organization.com',
        // Password: user123
        password: '${userHash}',
        role: 'user',
        permissions: ['read']
    }
};
    `);
}

generateHashes().catch(console.error);