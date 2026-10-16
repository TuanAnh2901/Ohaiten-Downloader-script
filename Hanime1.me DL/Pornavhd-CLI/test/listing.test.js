// test/listing.test.js — port của test_extract.py + buildPageUrl + isCfChallenge
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const http = require('http')
const { spawnSync } = require('node:child_process')
process.chdir(path.join(__dirname, '..'))
const { parseCards, sanitize, buildPageUrl, isCfChallenge } = require('../dist/index.cjs')

const fixture = fs.readFileSync('tests/fixture_cards.html', 'utf8')

test('parseCards: 3 card sach, id/url/title/duration dung, dedup post-id', () => {
  const vids = parseCards(fixture)
  assert.strictEqual(vids.length, 3)
  const v = vids[0]
  assert.strictEqual(v.id, '101152')
  assert.strictEqual(v.url, 'https://pornavhd.com/2026/03/29/xmyao1998_104/')
  assert.strictEqual(v.title, 'XMYao1998_104')
  assert.strictEqual(v.duration, '27:07')
  assert.strictEqual(new Set(vids.map((x) => x.id)).size, 3, 'post-id trung nhau')
})

test('sanitize: ky tu dac biet -> _, trim, cat 120', () => {
  assert.strictEqual(sanitize('a/b:c*d?"<e>|'), 'a_b_c_d_e_')
  assert.strictEqual(sanitize('  x . '), 'x')
  assert.strictEqual(sanitize('z'.repeat(300)), 'z'.repeat(120))
  assert.strictEqual(sanitize(''), 'video')
})

test('buildPageUrl: trang 1 giu nguyen, trang N giu query search', () => {
  assert.strictEqual(
    buildPageUrl('https://pornavhd.com/?s=xmyao', 1),
    'https://pornavhd.com/?s=xmyao'
  )
  assert.strictEqual(
    buildPageUrl('https://pornavhd.com/?s=xmyao', 2),
    'https://pornavhd.com/page/2/?s=xmyao'
  )
  assert.strictEqual(
    buildPageUrl('https://pornavhd.com/actor/xmyao1998/', 3),
    'https://pornavhd.com/actor/xmyao1998/page/3/'
  )
})

test('isCfChallenge: nhan Just a moment', () => {
  assert.strictEqual(isCfChallenge('<html>Just a moment...</html>'), true)
  assert.strictEqual(isCfChallenge('<html>thumb-block</html>'), false)
})
