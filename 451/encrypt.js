const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const password = process.argv[2];
const roundsInput = process.argv[3] || "1";
const rounds = parseInt(roundsInput);

if (!password || password.length === 0) {
    console.error('Usage: node encrypt.js <password> <rounds(0-9)>');
    process.exit(1);
}

function deriveKey(pw) {
    return crypto.createHash('sha256').update(pw).digest();
}

function encrypt(plaintext, pw, r) {
    if (r === 0) return '0' + plaintext;
    
    const key = deriveKey(pw);
    const nonce = crypto.randomBytes(12);
    
    let data = Buffer.from(plaintext);
    
    for (let i = 0; i < r; i++) {
        const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        data = Buffer.concat([encrypted, tag]);
    }
    
    const combined = Buffer.concat([nonce, data]);
    return r.toString() + combined.toString('base64');
}

async function run() {
    // 1. プロジェクトメタデータの暗号化
    const definePath = 'project.define';
    if (fs.existsSync(definePath)) {
        try {
            const metaContent = fs.readFileSync(definePath, 'utf8');
            // パース可能か（JSONか）一応チェック
            JSON.parse(metaContent);
            const encryptedMeta = encrypt(metaContent, password, rounds);
            fs.writeFileSync('meta.enc', encryptedMeta);
            console.log(`Encrypted: ${definePath} -> meta.enc`);
        } catch (e) {
            console.error('Error processing project.define (Must be valid JSON):', e.message);
        }
    } else {
        console.warn(`File not found: ${definePath} (Skipping meta.enc generation)`);
    }

    // 2. 各章の暗号化
    const chaptersJsonPath = 'chapters.json';
    if (!fs.existsSync(chaptersJsonPath)) {
        console.error('chapters.json not found');
        return;
    }

    const chapters = JSON.parse(fs.readFileSync(chaptersJsonPath, 'utf8'));
    const encryptedDir = 'encrypted_chapters';
    if (!fs.existsSync(encryptedDir)) fs.mkdirSync(encryptedDir);

    chapters.forEach(chapter => {
        const sourcePath = path.join(__dirname, chapter.path);
        if (fs.existsSync(sourcePath)) {
            const content = fs.readFileSync(sourcePath, 'utf8');
            const encrypted = encrypt(content, password, rounds);
            const destPath = path.join(encryptedDir, path.basename(chapter.path));
            fs.writeFileSync(destPath, encrypted);
            console.log(`Encrypted: ${chapter.title} -> ${destPath}`);
        } else {
            console.warn(`File not found: ${sourcePath}`);
        }
    });

    console.log('\nEncryption complete. Files are ready for the archive.');
    console.log('Password used:', password);
    console.log('Rounds:', rounds);
}

run();
