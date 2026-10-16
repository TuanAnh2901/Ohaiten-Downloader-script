// test/args.test.js â€” classify/parseArgs/sliceRange
const test = require('node:test')
const assert = require('node:assert')
process.chdir(require('node:path').join(__dirname, '..'))
const { classify, parseArgs, sliceRange } = require('../dist/index.cjs')

test('classify: video/actor/search/unknown', () => {
  assert.strictEqual(classify('https://pornavhd.com/2026/03/29/xmyao1998_104/'), 'video')
  assert.strictEqual(classify('https://pornavhd.com/actor/xmyao1998/'), 'actor')
  assert.strictEqual(classify('https://pornavhd.com/?s=xmyao'), 'search')
  assert.strictEqual(classify('https://pornavhd.com/page/2/?s=xmyao'), 'search')
  assert.strictEqual(classify('https://pornavhd.com/'), 'unknown')
})

test('parseArgs: flags mac dinh va ket so', () => {
  const f = parseArgs(['https://pornavhd.com/?s=xmyao', '--list', '--jobs', '2', '--res', '720', '--from', '3', '--to', '8'])
  assert.strictEqual(f.list, true)
  assert.strictEqual(f.jobs, 2)
  assert.strictEqual(f.res, 720)
  assert.strictEqual(f.first, 3)
  assert.strictEqual(f.to, 8)
  assert.strictEqual(f.outputDir, './downloads')
  assert.strictEqual(f.retries, 2)
  assert.strictEqual(f.target, 'https://pornavhd.com/?s=xmyao')
})

test('parseArgs: 0 hay 2 target -> error', () => {
  assert.throws(() => parseArgs([]))
  assert.throws(() => parseArgs(['a.com', 'b.com']))
})

test('sliceRange: from/to theo listing 1-indexed, dung bien', () => {
  const vids = ['a', 'b', 'c', 'd', 'e'].map((t) => ({ id: '', url: t, title: t, duration: '' }))
  assert.deepStrictEqual(sliceRange(vids, 2, 4).map((v) => v.title), ['b', 'c', 'd'])
  assert.deepStrictEqual(sliceRange(vids).map((v) => v.title), ['a', 'b', 'c', 'd', 'e'])
  assert.deepStrictEqual(sliceRange(vids, 90, 99), [])
  assert.deepStrictEqual(sliceRange(vids, 0, 2).map((v) => v.title), ['a', 'b'])
})
