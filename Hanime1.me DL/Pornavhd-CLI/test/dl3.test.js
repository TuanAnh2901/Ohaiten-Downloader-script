// test/dl3.test.js — progress bar / logger / verify (native pipeline UI)
const test = require('node:test')
const assert = require('node:assert')
process.chdir(require('node:path').join(__dirname, '..'))
const { formatBytes, formatEta, barLine, MultiProgress, parseFfprobeDuration } = require('../dist/index.cjs')

test('formatBytes/formatEta: đơn vị + mm:ss', () => {
  assert.strictEqual(formatBytes(0), '0B')
  assert.strictEqual(formatBytes(2048), '2.0KB')
  assert.strictEqual(formatBytes(3 * 1048576), '3.0MB')
  assert.strictEqual(formatBytes(1.5 * 1073741824), '1.50GB')
  assert.strictEqual(formatEta(75), '01:15')
  assert.strictEqual(formatEta(3725), '1:02:05')
  assert.strictEqual(formatEta(NaN), '?')
})

test('barLine: bar + percent + tốc độ + ETA cùng 1 hàng', () => {
  const l = barLine('xmyao1998_104.mp4', 82, 163, 120 * 1048576, 10)
  assert.ok(l.includes('82/163'))
  assert.ok(l.includes('%'))
  assert.ok(l.includes('ETA'))
  assert.ok(l.includes('█') && l.includes('░'))
  assert.ok(l.length < 100) // 1 hàng, không spam
})

test('MultiProgress: slot xong thu gọn stack (không phình hàng)', () => {
  const mp = new MultiProgress()
  const s1 = mp.createSlot('a.mp4')
  const s2 = mp.createSlot('b.mp4')
  mp.update(s1, 50, 100, 1048576)
  assert.strictEqual(mp['slots'].length, 2)
  mp.finish(s1, { end: 'ok', msg: '', mb: 12, secs: 3 })
  assert.strictEqual(mp['slots'].length, 1) // hàng xong bị thu gọn
  mp.finish(s2, { end: 'fail', msg: 'lý do X', mb: 0, secs: 5 })
  assert.strictEqual(mp['slots'].length, 0)
})

test('parseFfprobeDuration: đọc duration ffprobe', () => {
  assert.strictEqual(parseFfprobeDuration('duration=1627.946233'), 1627.946233)
  assert.strictEqual(parseFfprobeDuration('duration=N/A'), null)
  assert.strictEqual(parseFfprobeDuration('bit_rate=123'), null)
})
