import { test } from 'node:test'
import assert from 'node:assert'
import { slotFragment } from '../dist/index.cjs'

const base = { label: 'lovewxnn_02.mp4', done: 43, total: 78, bytes: 95_000_000, t0: Date.now() - 5000, started: true, phase: 'seg' }

test('slotFragment dạng rộng (≥60): thanh ASCII + count + speed + eta, đúng chiều max', () => {
  const out = slotFragment(base, 100)
  assert.ok(out.includes('█'), 'có thanh đã tải')
  assert.ok(out.includes('░'), 'có thanh còn lại')
  assert.ok(out.includes('43/78'))
  assert.ok(!out.includes('%'), 'bỏ % trùng thanh')
  assert.ok(out.length <= 100)
})

test('slotFragment chưa start / phase không phải seg hiển thị phase…', () => {
  const o1 = slotFragment({ ...base, started: false, phase: '' }, 60)
  assert.match(o1, /khởi động/)
  const o2 = slotFragment({ ...base, phase: 'ghép' }, 60)
  assert.match(o2, /ghép…/)
  const o3 = slotFragment({ ...base, phase: 'master' }, 60)
  assert.match(o3, /master…/)
  assert.ok(o2.length <= 60 && o3.length <= 60)
})

test('slotFragment hẹp (40) fall về dạng compact rút dần, đúng chiều max', () => {
  const out = slotFragment(base, 40)
  assert.ok(out.length <= 40)
  assert.ok(out.includes('55'), '% hoặc số liệu')
})

test('slotFragment chết total=0 không chia 0', () => {
  const out = slotFragment({ ...base, total: 0, done: 0 }, 100)
  assert.ok(out.length <= 100)
})
