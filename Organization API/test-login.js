// Path: /test-login.js
// ทดสอบระบบ login อย่างละเอียด
const bcrypt = require('bcryptjs');

async function testLogin() {
    console.log('🔍 Testing Login System\n');
    
    // 1. ทดสอบการสร้าง hash
    console.log('1️⃣ Creating fresh password hashes:');
    const password = 'admin123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    
    console.log(`   Password: ${password}`);
    console.log(`   Hash 1: ${hash1}`);
    console.log(`   Hash 2: ${hash2}`);
    console.log(`   Note: Hashes are different each time (this is normal)\n`);
    
    // 2. ทดสอบการตรวจสอบ password
    console.log('2️⃣ Testing password verification:');
    console.log(`   Comparing '${password}' with hash1: ${await bcrypt.compare(password, hash1) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Comparing '${password}' with hash2: ${await bcrypt.compare(password, hash2) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Comparing 'wrong' with hash1: ${await bcrypt.compare('wrong', hash1) ? '❌ FAIL' : '✅ PASS (should be false)'}`);
    
    // 3. ทดสอบ hash ที่ใช้ในระบบ
    console.log('\n3️⃣ Testing system hashes:');
    const systemHashes = [
        '$2a$10$YwQ8.0ykpZMoVH7rGvxRZexTKNl0GvfGCHrHvEMDJFP.W9B9o/Jru',
        '$2a$10$5dK3hFwGpuBzKp8jQ7yQKuG1h0E5HqkBvNbXzX9mI8XoW3BvZ7uW.',
        '$2a$10$8VxGpH2mKXO0XBgYO8RqB.6RqZKiCvM5vQGnXfVZ4iL5aTpI3Kfnq'
    ];
    
    for (const hash of systemHashes) {
        const result = await bcrypt.compare('admin123', hash);
        console.log(`   Hash: ${hash.substring(0, 30)}...`);
        console.log(`   Valid for 'admin123': ${result ? '✅ YES' : '❌ NO'}\n`);
    }
    
    // 4. สร้าง hash ที่ถูกต้องสำหรับใช้งาน
    console.log('4️⃣ Generated correct hashes for auth.js:');
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    
    console.log('\n📋 Copy this to your auth.js file:\n');
    console.log(`const users = {
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
};`);
    
    // 5. ทดสอบว่า hash ที่สร้างใหม่ใช้งานได้
    console.log('\n5️⃣ Verifying new hashes:');
    console.log(`   admin123 + new admin hash: ${await bcrypt.compare('admin123', adminHash) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   user123 + new user hash: ${await bcrypt.compare('user123', userHash) ? '✅ PASS' : '❌ FAIL'}`);
}

testLogin().catch(console.error);