import { test } from 'node:test'
import assert from 'node:assert'
import { fixHls2Query, chooseVariant } from '../dist/index.cjs'

test('fixHls2Query trả tên key t,s,e,f,i theo vị trí', () => {
  const raw = 'https://h.dp-do.com/hls2/01/x_,,,.urlset/master.m3u8?=tok123&=1792423308&=129600&=17327247&srv=abc&=0.&sp=500&p1=abc&p2=abc&asn=18403'
  assert.match(fixHls2Query(raw), /t=tok123&s=1792423308&e=129600&f=17327247&srv=abc&i=0.&sp=500&p1=abc&p2=abc&asn=18403/)
})

test('chooseVariant tie-break theo width', () => {
  assert.equal(chooseVariant([{ url: 'a', w: 1920, h: 1080 }, { url: 'b', w: 1280, h: 1080 }]).url, 'a')
  assert.equal(chooseVariant([{ url: 'a', w: 640, h: 360 }, { url: 'b', w: 1920, h: 1080 }], 720).url, 'a')
  assert.equal(chooseVariant([], null), null)
})

import { harvestMirrorDomains } from '../dist/index.cjs'

test('harvestMirrorDomains: thu domain thật, skip dummy dX-dX + tiktok + trùng, cap 8', () => {
  const seed = ['modernfitnessguru.cyou']
  const out = harvestMirrorDomains({
    hls3: 'https://27u55xdzmm9q.auronamedicalgroup.online/x/master.txt',
    hls2: 'https://27u55xdzmm9q.dp-do.com/hls2/01/x/master.m3u8?t=x',
  }, seed)
  assert.deepEqual(out, ['modernfitnessguru.cyou', 'auronamedicalgroup.online'])
  assert.deepEqual(harvestMirrorDomains({ hls3: 'https://a.tiktokcdn.com/x' }, seed), seed)
  assert.deepEqual(harvestMirrorDomains({ hls2: 'not-http' }, seed), seed)
})
