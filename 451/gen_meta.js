const fs = require('fs');
const path = require('path');
const readline = require('readline');

// pac-coreのNode.js向けバインディングを読み込み（ディレクトリ構成に合わせて調整）
// もしWASMをNodeで動かすのが面倒な場合は、一時的に同じアルゴリズムの簡易版を使用するか、
// 既存のencrypt.jsのロジックに合わせます。
// ここでは既存のencrypt.jsがある前提で、その関数を呼び出す形を想定します。

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const metadata = {
    titleJp: '華氏451',
    titleEn: 'Fahrenheit 451',
    desc: '「燃やすのは悦楽だった」——焚書官モンターグが辿る、言葉と自己の再発見。新訳：或いは夜。'
};

rl.question('Enter Password (4 characters): ', (pw) => {
    if (pw.length !== 4) {
        console.error('Password must be 4 characters.');
        rl.close();
        return;
    }

    try {
        // pac-core (Rust/WASM) をNodeで叩くのはセットアップが必要なため、
        // 既存の encrypt.js が提供しているであろうロジックを流用するか、
        // もしくは一時的にブラウザのコンソール等で実行できるコードを提示します。
        
        // 【案】ブラウザのリーダーですでに init/decrypt が動いているので、
        // 開発者ツールのコンソールに貼り付けて meta.enc を出力するコードの方が確実かもしれません。
        
        console.log('\n--- Metadata Encryption Tool ---');
        console.log('コピーして、リーダー(index.html)のブラウザコンソールに貼り付けて実行してください:');
        console.log('--------------------------------');
        console.log(`
const meta = ${JSON.stringify(metadata)};
const pw = "${pw}";
init().then(() => {
    // pac_coreにencrypt関数がある場合（なければ公開されているものを使用）
    // 既存のencrypt.jsのロジックに合わせて調整
    const encrypted = encrypt(JSON.stringify(meta), pw);
    console.log("----- meta.enc の中身 -----");
    console.log(encrypted);
    console.log("--------------------------");
});
        `);
        
    } catch (e) {
        console.error(e);
    }
    rl.close();
});
