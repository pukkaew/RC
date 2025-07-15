// Path: /test-auth.js
// Script to test password hashing and verify authentication
const bcrypt = require('bcryptjs');

async function testPasswords() {
    console.log('Testing password hashes...\n');
    
    const passwords = {
        'admin123': '$2a$10$YwQ8.0ykpZMoVH7rGvxRZexTKNl0GvfGCHrHvEMDJFP.W9B9o/Jru',
        'user123': '$2a$10$4J3CdJKzQy4VbNYXoKrV7.XK4QmhFZbH9ySVkxhSHvDKvGzPnEtTy'
    };
    
    for (const [plainPassword, hash] of Object.entries(passwords)) {
        const isValid = await bcrypt.compare(plainPassword, hash);
        console.log(`Password: ${plainPassword}`);
        console.log(`Hash: ${hash}`);
        console.log(`Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
        console.log('---');
    }
    
    // Generate new hashes if needed
    console.log('\nGenerating fresh hashes:');
    console.log('admin123:', await bcrypt.hash('admin123', 10));
    console.log('user123:', await bcrypt.hash('user123', 10));
}

testPasswords().catch(console.error);