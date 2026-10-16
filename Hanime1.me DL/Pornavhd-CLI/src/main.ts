export {
  Flags,
  parseArgs,
  classify,
} from './args'
export type { TargetKind } from './args'
export { parseCards, sanitize, buildPageUrl, isCfChallenge, crawl } from './listing'
export type { Vid } from './listing'
export { decodeBody, Browser, Page } from './cdp'
export type { CdpResponse } from './cdp'

if (require.main === module) {
  console.log('pornavhd-cli entry (CLI wiring Task 5)')
}
