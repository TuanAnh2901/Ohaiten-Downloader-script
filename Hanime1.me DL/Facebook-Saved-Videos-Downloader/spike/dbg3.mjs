import fs from 'node:fs';
const html = fs.readFileSync('spike/evidence/rerun/saved_ssr_raw.html', 'utf8');
const needle = '"result":{"data":';
let idx = 0, count = 0;
while ((idx = html.indexOf(needle, idx)) >= 0 && count < 25) {
  count++;
  const start = html.lastIndexOf('{', idx);
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
  }
  const seg = html.slice(start, end + 1);
  let ok = false, err = '';
  try { JSON.parse(seg); ok = true; } catch (e) { err = e.message.slice(0, 60); }
  console.log(count, 'needle@', idx, 'start@', start, 'len', seg.length, 'parse', ok ? 'OK' : 'FAIL: ' + err, '| ctx:', JSON.stringify(seg.slice(0, 80)));
  idx += needle.length;
}
