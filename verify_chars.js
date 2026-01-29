
const fs = require('fs');
const content = fs.readFileSync('c:/Program2/T/type03/words.js', 'utf8');
// windowやdocumentがない環境でも動くように簡略化して評価
try {
    const sandbox = {};
    eval(content.replace('const LEVEL_DATA', 'sandbox.LEVEL_DATA'));
    const data = sandbox.LEVEL_DATA;
    for (const level in data) {
        data[level].problems.forEach(p => {
            const text = p.text.replace(/\n/g, '');
            console.log(`Level ${level} ID ${p.id}: ${text.length} chars`);
        });
    }
} catch (e) {
    console.error(e);
}
