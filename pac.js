const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const command = process.argv[2];
const projectId = process.argv[3];
const password = process.argv[4];

if (!command) {
    console.log(`
PAC Framework (Translation & Encryption Manager)
Usage:
  node pac.js init <project_id>
    - 新しい翻訳プロジェクトの雛形（.defineファイル等）を作成します。
  node pac.js build <project_id> <password>
    - .defineファイルと原稿を読み込み、暗号化パッケージを生成します。
`);
    process.exit(0);
}

// 簡易暗号化モジュール（Rust/WASM版と同等のロジックをJSで実装）
function deriveKey(pw) {
    return crypto.createHash('sha256').update(pw).digest();
}

function encrypt(plaintext, pw, r = 1) {
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

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

if (command === 'init') {
    if (!projectId) return console.error('Project ID is required.');
    const projDir = path.join(__dirname, projectId);
    if (fs.existsSync(projDir)) return console.error('Project already exists.');
    
    fs.mkdirSync(projDir);
    fs.mkdirSync(path.join(projDir, 'chapters'));
    
    // テンプレートのコピー（既存の451から index.html, style.css を流用）
    const templateDir = path.join(__dirname, '451');
    if (fs.existsSync(templateDir)) {
        fs.copyFileSync(path.join(templateDir, 'index.html'), path.join(projDir, 'index.html'));
        fs.copyFileSync(path.join(templateDir, 'style.css'), path.join(projDir, 'style.css'));
    }

    const defineTemplate = {
        titleJp: "作品の日本語タイトル",
        titleEn: "English Title",
        author: "著者名",
        year: "19XX",
        desc: "作品のあらすじや説明をここに記述します。",
        chapters: [
            { "file": "ch01_01.html", "title": "第1章：始まり" }
        ]
    };
    fs.writeFileSync(path.join(projDir, 'project.define'), JSON.stringify(defineTemplate, null, 4), 'utf8');
    console.log(`[+] Project ${projectId} initialized.`);
} 
else if (command === 'build') {
    if (!projectId || !password) return console.error('Project ID and Password are required.');
    if (password.length !== 4) return console.error('Password must be 4 characters.');

    const projDir = path.join(__dirname, projectId);
    const definePath = path.join(projDir, 'project.define');
    if (!fs.existsSync(definePath)) return console.error(`project.define not found in ${projDir}`);
    
    const defineData = JSON.parse(fs.readFileSync(definePath, 'utf8'));
    
    // 1. メタデータの暗号化
    const metaPayload = {
        titleJp: defineData.titleJp,
        titleEn: defineData.titleEn,
        author: defineData.author,
        year: defineData.year,
        desc: defineData.desc
    };
    const encMeta = encrypt(JSON.stringify(metaPayload), password);
    fs.writeFileSync(path.join(projDir, 'meta.enc'), encMeta, 'utf8');
    console.log(`[+] Encrypted metadata -> ${projectId}/meta.enc`);
    
    // 2. 原稿の暗号化
    const encDir = path.join(projDir, 'encrypted_chapters');
    if (!fs.existsSync(encDir)) fs.mkdirSync(encDir);
    
    const chaptersJson = [];
    defineData.chapters.forEach(ch => {
        const srcPath = path.join(projDir, 'chapters', ch.file);
        if (fs.existsSync(srcPath)) {
            const rawContent = fs.readFileSync(srcPath, 'utf8');
            const encContent = encrypt(rawContent, password);
            fs.writeFileSync(path.join(encDir, ch.file), encContent, 'utf8');
            chaptersJson.push({
                title: ch.title,
                path: `chapters/${ch.file}`
            });
            console.log(`    Encrypted: ${ch.file}`);
        } else {
            console.warn(`[!] File missing: ${ch.file}`);
        }
    });
    
    fs.writeFileSync(path.join(projDir, 'chapters.json'), JSON.stringify(chaptersJson, null, 4), 'utf8');
    console.log(`[SUCCESS] Build complete for ${projectId}!`);
}
