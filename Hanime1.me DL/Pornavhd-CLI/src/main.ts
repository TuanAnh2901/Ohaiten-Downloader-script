export {
  Flags,
  parseArgs,
  classify,
  buildJobs,
  sliceRange,
} from './args'
export type { TargetKind, Job } from './args'
export { parseCards, sanitize, buildPageUrl, isCfChallenge, crawl } from './listing'
export type { Vid } from './listing'
export { decodeBody, Browser, Page } from './cdp'
export type { CdpResponse } from './cdp'
export { parseVariant, parseMaster, chooseVariant, isAdHost, isPlaylist, downloadVideo, unpackPacked, extractLinks, resolveLinks, stripPngPayload, verifyVideo } from './dl'
export { formatBytes, formatEta, formatSpeed, barLine, MultiProgress } from './progress'
export { Logger, parseFfprobeDuration } from './log'
export { vidUrlJoin } from './urljoin'
export { runCli } from './run'

if (require.main === module) {
  require('./run').runCli(process.argv.slice(2)).then(
    (code: number) => process.exit(code),
    (e: any) => {
      console.error('!' + (e.message || String(e)))
      process.exit(1)
    },
  )
}
