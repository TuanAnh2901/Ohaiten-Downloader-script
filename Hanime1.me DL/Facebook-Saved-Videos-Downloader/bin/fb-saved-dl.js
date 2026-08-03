#!/usr/bin/env node
import('../dist/index.js').then(m => {
  m.default.parseAsync(process.argv).catch(err => {
    console.error('[ERROR]', err.message)
    process.exit(1)
  })
})
