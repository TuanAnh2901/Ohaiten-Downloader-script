// test/dl3.test.js — pha hiển thị: format + MultiProgress không-ANSI (fragment/status)
const test = require('node:test')
const assert = require('node:assert')
const { barLine, formatBytes, formatEta, formatSpeed, MultiProgress, slotFragment } = require('../dist/index.cjs')

test('barLine: bar + percent + tốc độ + ETA cùng 1 hàng', () => {
  const l = barLine('xmyao1998_104.mp4', 82, 163, 120 * 1048576, 10)
  assert.ok(l.includes('82/163'))
  assert.ok(l.includes('%'))
  assert.ok(l.includes('█') && l.includes('░'))
  assert.ok(l.length < 100)
})

test('formatBytes/formatEta: đơn vị + mm:ss', () => {
  assert.strictEqual(formatBytes(1024), '1.0KB')
  assert.strictEqual(formatBytes(1536 * 1048576), '1.50GB')
  assert.strictEqual(formatEta(83), '01:23')
  assert.strictEqual(formatEta(3700), '1:01:40')
  assert.strictEqual(formatEta(NaN), '?')
})

test('MultiProgress không-ANSI: 1 dòng status, slot tái dùng khi retry', () => {
  const mp = new MultiProgress()
  const s1 = mp.createSlot('a.mp4')
  const s2 = mp.createSlot('b.mp4')
  assert.strictEqual(s2.label, 'b.mp4')
  mp.update(s1, 50, 100, 1048576)
  mp.update(s2, 10, 200, 2048)
  const line = mp['statusLine']()
  assert.ok(line.includes('a.mp4') && line.includes('b.mp4') && line.includes('|'))
  mp.finish(s1, { end: 'ok', msg: '', mb: 12, secs: 3 })
  // slot xong = held — status còn 1 slot
  assert.strictEqual(mp['statusLine']().includes('a.mp4'), false)
  const s3 = mp.createSlot('a.mp4')
  assert.strictEqual(s3, s1) // retry tái dùng
  mp.finish(s2, { end: 'fail', msg: 'lý do X', mb: 0, secs: 5 })
  mp.finish(s3, { end: 'ok', msg: '', mb: 1, secs: 1 })
  assert.strictEqual(mp['statusLine'](), '')
})

test('fitLabel: giữ đầu+đuôi, ≤ max', () => {
  const { fitLabel } = require('../dist/index.cjs')
  const out = fitLabel('yurinslittlepeach_123.mp4', 20)
  assert.ok(out.length <= 20)
  assert.ok(out.includes('…'))
  assert.ok(out.startsWith('yurins'))
  assert.strictEqual(fitLabel('short.mp4', 20), 'short.mp4')
})

test('slotFragment rút gọn dần khi max nhỏ: vẫn giữ %, không vượt max', () => {
  const { slotFragment } = require('../dist/index.cjs')
  const s = { label: 'yurinslittlepeach_123.mp4', done: 159, total: 181, bytes: 10485760, t0: Date.now() - 20_000, started: true }
  const f = slotFragment(s, 16)
  assert.ok(f.length <= 16)
  assert.ok(f.includes('%'))
})

test('statusLine bất biến 1 dòng: 3 slot label dài, stdout 80 cột →总 ≤ 80', () => {
  const { MultiProgress } = require('../dist/index.cjs')
  const mp = new MultiProgress()
  const s1 = mp.createSlot('yurinslittlepeach_123.mp4 [brightcove]')
  const s2 = mp.createSlot('yurinslittlepeach_456.mp4 [brightcove]')
  const s3 = mp.createSlot('yurinslittlepeach_789.mp4 [brightcove]')
  mp.update(s1, 159, 181, 10485760)
  mp.update(s2, 132, 190, 115343360)
  mp.update(s3, 50, 90, 5242880)
  // ép 80 cột
  Object.defineProperty(process.stdout, 'columns', { value: 80, configurable: true })
  try {
    const line = mp['statusLine']()
    assert.ok(line.length <= 80, `dòng ${line.length} > 80: ${line}`)
    assert.ok(line.includes('|'))
    const line2 = mp['statusLine']()
    assert.strictEqual(line2, line) // cập nhật cùng trạng thái vẽ ổn định
  } finally {
    delete process.stdout['columns']
  }
})

test('slotFragment: khởi động + pct + speed', () => {
  const s = { label: 'x.mp4', done: 0, total: 0, bytes: 0, t0: Date.now(), started: false }
  assert.ok(slotFragment(s).includes('khởi động'))
  s.started = true
  s.t0 = Date.now() - 10_000
  s.done = 50; s.total = 100; s.bytes = 5 * 1048576
  const f = slotFragment(s)
  assert.ok(f.includes('50.0%') && f.includes('50/100'))
})

test('masterCandidates: dò slot đơn h/n/l + combo + dạng rút gọn _n/', () => {
  const { masterCandidates } = require('../dist/index.cjs')
  const u = 'https://x.m.cyou/1ghk/hls3/01/05158/ab_,,,.urlset/master.txt'
  const cs = masterCandidates(u)
  assert.strictEqual(cs.length, 5)
  assert.ok(cs[0].endsWith('ab_,h,.urlset/master.txt'))
  assert.ok(cs[1].endsWith('ab_,n,.urlset/master.txt'))
  assert.ok(cs[2].endsWith('ab_,l,.urlset/master.txt'))
  assert.ok(cs[3].endsWith('ab_,l,n,h,.urlset/master.txt'))
  assert.ok(cs[4].endsWith('ab_n/master.txt'))
  assert.deepStrictEqual(masterCandidates('https://x.m.cyou/1ghk/hls3/01/04975/cd_n/master.txt'), ['https://x.m.cyou/1ghk/hls3/01/04975/cd_n/master.txt'])
})

test('masterSwapCandidates: swap domain × nhân slot placeholder cho TỪNG domain (bug 06: trước đây chỉ chạy slot gốc)', () => {
  const { masterSwapCandidates } = require('../dist/index.cjs')
  const u = 'https://cv9fqnu812v.riskanalytics.cfd/1ghkpx2e8jnal/hls3/01/05158/x6hfhy5wd0br_,h,.urlset/master.txt'
  const cs = masterSwapCandidates(u, ['modernfitnessguru.cyou'])
  // phải có _,n, trên cyou — slot cyou H 404 còn N sống (06 thật)
  assert.ok(cs.some((c) => c.endsWith('cyou/1ghkpx2e8jnal/hls3/01/05158/x6hfhy5wd0br_,n,.urlset/master.txt')))
  assert.ok(cs.some((c) => c.endsWith('cyou/1ghkpx2e8jnal/hls3/01/05158/x6hfhy5wd0br_,l,.urlset/master.txt')))
  // domain chết 2 label → giữ nguyên không bị thêm
  assert.strictEqual(masterSwapCandidates(u, []).length, 1)
})

test('parseFfprobeDuration: đọc duration ffprobe', () => {
  const { parseFfprobeDuration } = require('../dist/index.cjs')
  assert.strictEqual(parseFfprobeDuration('duration=1627.946233'), 1627.946233)
  assert.strictEqual(parseFfprobeDuration('duration=N/A'), null)
  assert.strictEqual(parseFfprobeDuration('bit_rate=123'), null)
})

