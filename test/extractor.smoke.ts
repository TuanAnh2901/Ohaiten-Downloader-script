// Smoke test for src/extractor.ts. Not part of the production test suite —
// exercises every public function with synthetic fixtures.
import {
    staticExtract,
    buildStreamUrl,
    filterAdUrls,
    networkExtract,
} from '../src/extractor'

const AHS_HTML = `<!doctype html><html><body>
<div id="player"></div>
<script>jwplayer("player").setup({ file: "https://cdn.example.com/movie.mp4", image: "https://cdn.example.com/poster.jpg" });</script>
</body></html>`

const HY_HTML = `<!doctype html><html><body>
<video src="https://cdn.example.com/v.m3u8" poster="https://cdn.example.com/p.jpg"></video>
</body></html>`

const MULTI_HTML = `<!doctype html><html><body>
<video>
  <source src="https://a.test/master.m3u8" type="application/vnd.apple.mpegurl" label="720p" />
  <source src="https://a.test/master_1080.mp4" type="video/mp4" label="1080p" />
</video>
<script>
jwplayer("x").setup({ sources: [
  { file: "https://a.test/s.mp4", label: "480p" },
  { file: "https://a.test/s.m3u8", label: "720p" }
] });
</script>
</body></html>`

const ADS_HTML = `<!doctype html><html><body>
<a href="https://doubleclick.net/abc"></a>
<a href="https://abyssplayer.com/popunder/click"></a>
<a href="https://googlesyndication.com/track"></a>
<a href="https://a.test/clean.mp4"></a>
<script>jwplayer("x").setup({file: "https://a.test/clean2.mp4"});</script>
<script src="https://adsterra.com/banner.js"></script>
</body></html>`

const ESCAPED_HTML = `<!doctype html><html><body>
<script>jwplayer("x").setup({file:"https://a.test/x.mp4?sig=1\\u0026t=2"});</script>
</body></html>`

let failed = 0
function check(name: string, cond: boolean, detail = ''): void {
    if (cond) {
        console.log(`  ok  ${name}`)
    } else {
        failed++
        console.log(`  FAIL ${name} ${detail}`)
    }
}

// 1) AHS: jwplayer().setup({file}) → mp4
const ahs = staticExtract(AHS_HTML, 'AHS', 'https://ahay.stream/embed-jw/1')
check('AHS returns one stream', ahs.length === 1, JSON.stringify(ahs))
check('AHS source is AHS', ahs[0]?.source === 'AHS')
check('AHS url is mp4', ahs[0]?.url === 'https://cdn.example.com/movie.mp4', ahs[0]?.url)
check('AHS iframeUrl echoed', ahs[0]?.iframeUrl === 'https://ahay.stream/embed-jw/1')
check('AHS contentType mp4', ahs[0]?.contentType === 'video/mp4', ahs[0]?.contentType)

// 2) HY: <video src>
const hy = staticExtract(HY_HTML, 'HY', 'https://abyssplayer.com/x')
check('HY returns one stream', hy.length === 1, JSON.stringify(hy))
check('HY url is m3u8', hy[0]?.url === 'https://cdn.example.com/v.m3u8', hy[0]?.url)
check('HY contentType m3u8', hy[0]?.contentType === 'application/vnd.apple.mpegurl', hy[0]?.contentType)

// 3) Multi: sources array + <source>
const multi = staticExtract(MULTI_HTML, 'AHS', 'https://ahay.stream/embed-jw/1')
const urls = multi.map(s => s.url).sort()
const labels = multi.map(s => s.quality).filter(Boolean).sort()
check('multi has 4 streams', multi.length === 4, JSON.stringify(urls))
check('multi includes m3u8 + mp4', urls.some(u => u.includes('master.m3u8')) && urls.some(u => u.includes('master_1080.mp4')))
check('multi has labels', labels.includes('480p') && labels.includes('720p') && labels.includes('1080p'), JSON.stringify(labels))

// 4) Ads filtered
const ads = staticExtract(ADS_HTML, 'AHS', 'src')
const adUrls = ads.map(s => s.url)
check('ads keeps only clean mp4s', ads.length === 2, JSON.stringify(adUrls))
check('ads rejects doubleclick', !adUrls.some(u => u.includes('doubleclick')))
check('ads rejects popunder', !adUrls.some(u => u.includes('popunder')))
check('ads rejects googlesyndication', !adUrls.some(u => u.includes('googlesyndication')))

// 5) Escaped unicode
const esc = staticExtract(ESCAPED_HTML, 'AHS', 'src')
check('escaped decodes \\u0026', esc[0]?.url === 'https://a.test/x.mp4?sig=1&t=2', esc[0]?.url)

// 6) buildStreamUrl
check('buildStreamUrl picks preferred', buildStreamUrl('AHS', { AHS: 'https://a/', HY: 'https://b/' }) === 'https://a/')
check('buildStreamUrl falls back', buildStreamUrl('XX', { AHS: 'https://a/', HY: 'https://b/' }) === 'https://a/')
check('buildStreamUrl empty map', buildStreamUrl('AHS', {}) === '')

// 7) filterAdUrls
const filtered = filterAdUrls([
    'https://doubleclick.net/x',
    'https://googlesyndication.com/y',
    '/popunder/click',
    'https://a.test/m.mp4?utm_campaign=2',
    'https://a.test/clean.mp4',
    'https://a.test/img.png',
    'data:application/javascript,alert(1)',
])
check('filterAdUrls drops ads', filtered.length === 1, JSON.stringify(filtered))
check('filterAdUrls keeps clean mp4', filtered[0] === 'https://a.test/clean.mp4')

// 8) networkExtract with no browser globals available in Node → still returns
//    a typed result (no throws).
;(async (): Promise<void> => {
    const r = await networkExtract('https://example.com/iframe', 'https://animehay.tv/')
    check('networkExtract returns typed result', typeof r === 'object' && Array.isArray(r.streams))
    check('networkExtract warnings is array', Array.isArray(r.warnings))
    check('networkExtract has timedOut/blocked', typeof r.timedOut === 'boolean' && typeof r.blocked === 'boolean')
    if (failed > 0) {
        console.log(`\n${failed} checks FAILED`)
        process.exit(1)
    } else {
        console.log('\nALL OK')
    }
})().catch(err => {
    console.error('networkExtract threw:', err)
    process.exit(1)
})
