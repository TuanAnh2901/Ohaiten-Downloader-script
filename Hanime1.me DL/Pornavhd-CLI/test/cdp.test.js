// test/cdp.test.js — unit nhỏ nhất: decode body helper
const test = require('node:test')
const assert = require('node:assert')
process.chdir(require('node:path').join(__dirname, '..'))
const { decodeBody } = require('../dist/index.cjs')

test('decodeBody: base64 -> Buffer, plain -> Buffer', () => {
  const b64 = Buffer.from('hello fMP4').toString('base64')
  assert.deepStrictEqual(decodeBody(b64, true), Buffer.from('hello fMP4'))
  assert.deepStrictEqual(decodeBody('plain utf8', false), Buffer.from('plain utf8'))
  assert.deepStrictEqual(
    decodeBody(Buffer.from([0x66, 0x74]), false),
    Buffer.from([0x66, 0x74]),
  )
})
