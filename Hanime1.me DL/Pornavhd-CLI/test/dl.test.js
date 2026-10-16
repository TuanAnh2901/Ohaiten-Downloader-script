// test/dl.test.js — parseVariant / isAdHost / isPlaylist
const test = require('node:test')
const assert = require('node:assert')
process.chdir(require('node:path').join(__dirname, '..'))
const { parseVariant, isAdHost, isPlaylist } = require('../dist/index.cjs')

const VARIANT = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-MAP:URI="seg/init.mp4"
seg/1.ts
#EXT-X-DISCONTINUITY
seg/2.ts
https://cdn.other/abs/3.ts`

test('parseVariant: segs theo thu tu, init root-relative', () => {
  const { segs, init } = parseVariant(VARIANT, 'https://cdn.h/720/master.m3u8')
  assert.deepStrictEqual(segs, [
    'https://cdn.h/720/seg/1.ts',
    'https://cdn.h/720/seg/2.ts',
    'https://cdn.other/abs/3.ts',
  ])
  assert.strictEqual(init, 'https://cdn.h/720/seg/init.mp4')
})

test('parseVariant: khong init khi khong co EXT-X-MAP', () => {
  const { segs, init } = parseVariant('a.ts\nb.ts', 'https://x/y.m3u8')
  assert.deepStrictEqual(segs, ['https://x/a.ts', 'https://x/b.ts'])
  assert.strictEqual(init, null)
})

test('isAdHost: cho tung host quang cao, cho segment binh thuong', () => {
  for (const h of ['growcdnssedge', 'whitetrafsa', 'tiktokcdn']) {
    assert.strictEqual(isAdHost(`https://${h}-x.com/a.png`), true, h)
  }
  assert.strictEqual(isAdHost('https://bkcdn.net/video/seg1.m4s'), false)
})

test('isPlaylist: m3u8 thoisuoi, bo ad-streams co ".m3u8"', () => {
  assert.strictEqual(isPlaylist('https://c/x/master.m3u8'), true)
  assert.strictEqual(isPlaylist('https://growcdnssedge.com/ads.m3u8'), false)
  assert.strictEqual(isPlaylist('https://c/x/video.mp4'), false)
})
