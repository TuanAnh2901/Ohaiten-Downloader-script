#!/usr/bin/env node
import('../dist/index.cjs').then(m => {
  m.default.parseAsync(process.argv).catch(err => {
    console.error('[ERROR]', err.message)
    process.exit(1)
  })
})
