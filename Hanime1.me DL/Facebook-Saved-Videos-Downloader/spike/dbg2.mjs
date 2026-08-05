import fs from 'node:fs';
const html = fs.readFileSync('spike/evidence/rerun/saved_ssr_raw.html', 'utf8');
const i = html.indexOf('all_saves');
console.log('all_saves at', i);
console.log(JSON.stringify(html.slice(i - 200, i + 120)));
const i2 = html.indexOf('"result":{"data"');
console.log('needle at', i2);
// raw script content around saver
const seg = html.slice(i - 2000, i + 500);
console.log('--- 2000 before ---');
console.log(JSON.stringify(seg.slice(0, 800)));
