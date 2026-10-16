// test/dl2.test.js — parseMaster / chooseVariant / parseVariant (native hls2 pipeline)
const test = require('node:test')
const assert = require('node:assert')
process.chdir(require('node:path').join(__dirname, '..'))
const { parseMaster, chooseVariant, parseVariant } = require('../dist/index.cjs')

const MASTER = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=273690,RESOLUTION=268x480,CODECS="avc1.640015,mp4a.40.2"
index-f1-v1-a1.m3u8?t=TOK
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=547179,RESOLUTION=400x720,CODECS="avc1.64001e,mp4a.40.2"
index-f2-v1-a1.m3u8?t=TOK
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1130020,RESOLUTION=600x1080,CODECS="avc1.64001f,mp4a.40.2"
index-f3-v1-a1.m3u8?t=TOK`

test('parseMaster: variant + query suffix giữ nguyên như signed URL', () => {
  const vs = parseMaster(MASTER, 'https://h/hls2/x_.urlset/master.m3u8')
  assert.strictEqual(vs.length, 3)
  assert.deepStrictEqual(
    vs.map((v) => v.h),
    [480, 720, 1080],
  )
  assert.ok(vs[1].url.startsWith('https://h/hls2/x_.urlset/index-f2-v1-a1.m3u8?t=TOK'))
})

test('chooseVariant: cao nhất <= res; res thấp hơn tất cả → thấp nhất', () => {
  const vs = parseMaster(MASTER, 'https://h/x.master.m3u8')
  assert.strictEqual(chooseVariant(vs, 720)?.h, 720)
  assert.strictEqual(chooseVariant(vs, 480)?.h, 480)
  assert.strictEqual(chooseVariant(vs, 200)?.h, 480)
  assert.strictEqual(chooseVariant([]), null)
})

test('parseVariant: TS seg có signed query, index map fMP4', () => {
  const IDX = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.022,
seg-1-f2-v1-a1.ts?t=TOK&s=1
#EXTINF:9.0,
seg-2-f2-v1-a1.ts?t=TOK&s=1
#EXT-X-ENDLIST`
  const { segs, init } = parseVariant(IDX, 'https://h/hls2/x_.urlset/index-f2.m3u8')
  assert.strictEqual(segs.length, 2)
  assert.ok(segs[0].startsWith('https://h/hls2/x_.urlset/seg-1-f2-v1-a1.ts?t=TOK&s=1'))
  assert.strictEqual(init, null)
  const MP4 = `#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\ni.m4s`
  const r2 = parseVariant(MP4, 'https://h/a.m3u8')
  assert.strictEqual(r2.init, 'https://h/init.mp4')
  assert.deepStrictEqual(r2.segs, ['https://h/i.m4s'])
})
