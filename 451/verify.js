const fs = require('fs');
const path = require('path');
const pac = require('./pac-core/pkg/node/pac_core.js');

const password = process.argv[2] || '火水木金';
const testFile = 'encrypted_chapters/ch01_01.html';
const originalFile = 'chapters/ch01_01.html';

if (!fs.existsSync(testFile)) {
    console.error('Encrypted file not found:', testFile);
    process.exit(1);
}

const encryptedContent = fs.readFileSync(testFile, 'utf8');
console.log('Encrypted content starts with:', encryptedContent.substring(0, 20));

const result = pac.decrypt(encryptedContent, password);

if (result.success) {
    console.log('Decryption successful!');
    const originalContent = fs.readFileSync(originalFile, 'utf8');
    if (result.data === originalContent) {
        console.log('VERIFICATION PASSED: Decrypted content matches original.');
    } else {
        console.error('VERIFICATION FAILED: Decrypted content differs from original.');
        console.log('Original length:', originalContent.length);
        console.log('Decrypted length:', result.data.length);
    }
} else {
    console.error('Decryption failed:', result.data);
}
