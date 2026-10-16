import * as listing from './listing'
import * as argsmod from './args'

if (require.main === module) {
  argsmod.runCli(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e); process.exit(1)
    },
  )
}

export = { ...listing, ...argsmod }
