import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    collectEpisodes,
    collectSeriesEpisodes,
    deduplicateEpisodes,
    sortEpisodesByNumber,
    CrawlerError,
    __setRequesterForTesting,
} from '../src/crawler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE = resolve(__dirname, 'fixtures', 'watch-page.html');

let passed = 0;
let failed = 0;
const log = (ok: boolean, name: string, extra?: string): void => {
    if (ok) { passed++; console.log(`  \u2713 ${name}${extra ? ' \u2014 ' + extra : ''}`); }
    else    { failed++; console.log(`  \u2717 ${name}${extra ? ' \u2014 ' + extra : ''}`); }
}

async function main(): Promise<void> {
// 1. collectEpisodes(HTML) — pure parsing path
{
    const html = readFileSync(FIXTURE, 'utf8');
    const eps = await collectEpisodes(html);
    log(eps.length === 28, 'collectEpisodes(HTML) returns 28 episodes', `got ${eps.length}`);
    log(eps[0]?.url === 'https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html',
        'first episode URL', eps[0]?.url);
    log(eps[0]?.no === '28', 'first episode no', eps[0]?.no);
    log(eps[27]?.no === '1', 'last episode no (sort preserved from page)', eps[27]?.no);
}

// 2. collectEpisodes(URL) — fetch path with mocked requester
{
    const html = readFileSync(FIXTURE, 'utf8');
    const calls: { url: string; referer?: string }[] = [];
    __setRequesterForTesting(async (url, opts) => {
        calls.push({ url, referer: opts?.referer });
        return { status: 200, finalUrl: url, body: html };
    });
    try {
        const eps = await collectEpisodes('https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html');
        log(eps.length === 28, 'collectEpisodes(URL) fetches + parses', `got ${eps.length}, requester called ${calls.length}x`);
        log(calls[0]?.url === 'https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html',
            'URL passed verbatim to requester');
    } finally {
        __setRequesterForTesting(null);
    }
}

// 3. collectSeriesEpisodes — Strategy 1: .wp-eplist .wp-ep
{
    const watchHtml = readFileSync(FIXTURE, 'utf8');
    const gridMatch = watchHtml.match(/<div class="wp-eplist"[\s\S]*?<\/div>\s*<\/div>/);
    const infoHtml = `<!doctype html><html><body>
        <div class="info-movie"><h1>Quang Âm Chi Ngoại</h1></div>
        ${gridMatch?.[0] ?? ''}
    </body></html>`;
    const calls: string[] = [];
    __setRequesterForTesting(async (url) => {
        calls.push(url);
        return { status: 200, finalUrl: url, body: infoHtml };
    });
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/quang-am-chi-ngoai-4541.html');
        log(eps.length === 28, 'strategy 1: .wp-eplist .wp-ep', `got ${eps.length}, fetches=${calls.length}`);
        log(calls.length === 1, 'strategy 1 takes one fetch', `calls=${calls.length}`);
    } finally {
        __setRequesterForTesting(null);
    }
}

// 4. collectSeriesEpisodes — Strategy 2: legacy .info-movie .list_episode
{
    const infoHtml = `<!doctype html><html><body>
        <div class="info-movie">
          <h1>Legacy Series</h1>
          <ul class="list_episode">
            <li class="list-item-episode"><a href="https://animehay07.site/xem-phim/legacy-tap-3-90003.html" data-no="3" id="wp-ep-90003" title="Tập 3">3</a></li>
            <li class="list-item-episode"><a href="https://animehay07.site/xem-phim/legacy-tap-2-90002.html" data-no="2" id="wp-ep-90002" title="Tập 2">2</a></li>
            <li class="list-item-episode"><a href="https://animehay07.site/xem-phim/legacy-tap-1-90001.html" data-no="1" id="wp-ep-90001" title="Tập 1">1</a></li>
          </ul>
        </div>
    </body></html>`;
    const calls: string[] = [];
    __setRequesterForTesting(async (url) => {
        calls.push(url);
        return { status: 200, finalUrl: url, body: infoHtml };
    });
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/legacy-1234.html');
        log(eps.length === 3, 'strategy 2: legacy .info-movie', `got ${eps.length}`);
        log(eps.some(e => e.no === '3' && e.episodeId === 90003), 'strategy 2 preserves episode id from wp-ep-NNNN');
        log(eps.some(e => e.url.endsWith('-90002.html')), 'strategy 2 preserves URLs');
        log(calls.length === 1, 'strategy 2 takes one fetch');
    } finally {
        __setRequesterForTesting(null);
    }
}

// 4b. strategy 2: legacy w/o wp-ep id attribute — fall back to URL id
{
    const infoHtml = `<!doctype html><html><body>
        <div class="info-movie">
          <ul class="list_episode">
            <li class="list-item-episode"><a href="https://animehay07.site/xem-phim/legacy-tap-3-80003.html" data-no="3">3</a></li>
            <li class="list-item-episode"><a href="https://animehay07.site/xem-phim/legacy-tap-2-80002.html" data-no="2">2</a></li>
          </ul>
        </div>
    </body></html>`;
    __setRequesterForTesting(async (url) => ({ status: 200, finalUrl: url, body: infoHtml }));
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/legacy-9999.html');
        log(eps.length === 2, 'strategy 2 without wp-ep ids', `got ${eps.length}`);
        log(eps[0]?.episodeId === 80003, 'strategy 2 falls back to URL id when wp-ep absent', `id=${eps[0]?.episodeId}`);
    } finally {
        __setRequesterForTesting(null);
    }
}

// 5. collectSeriesEpisodes — Strategy 3: follow first /xem-phim/ link
{
    const infoHtml = `<!doctype html><html><body>
        <p>No episode list on this info page.</p>
        <a href="https://animehay07.site/xem-phim/follow-tap-1-70001.html">Watch first ep</a>
    </body></html>`;
    const watchHtml = readFileSync(FIXTURE, 'utf8');
    const calls: string[] = [];
    __setRequesterForTesting(async (url) => {
        calls.push(url);
        if (url.includes('/xem-phim/follow-')) return { status: 200, finalUrl: url, body: watchHtml };
        return { status: 200, finalUrl: url, body: infoHtml };
    });
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/follow-1234.html');
        log(eps.length === 28, 'strategy 3: follow first /xem-phim/ link', `got ${eps.length}, calls=${calls.length}`);
        log(calls.length === 2, 'strategy 3 takes 2 fetches', `calls=${calls.length}`);
        log((calls[1] ?? '').includes('/xem-phim/follow-tap-1-70001.html'), 'strategy 3 follows the link');
    } finally {
        __setRequesterForTesting(null);
    }
}

// 6. Typed failure: unrecognized structure
{
    const infoHtml = `<!doctype html><html><body><p>Just text, no episodes.</p></body></html>`;
    __setRequesterForTesting(async (url) => ({ status: 200, finalUrl: url, body: infoHtml }));
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/empty-1234.html');
        log(false, 'unrecognized structure should throw', `got ${eps.length} eps`);
    } catch (err) {
        const ok = err instanceof CrawlerError && err.code === 'unrecognized_structure';
        log(ok, 'unrecognized structure throws CrawlerError with correct code',
            err instanceof Error ? err.message : String(err));
    } finally {
        __setRequesterForTesting(null);
    }
}

// 6b. Typed failure: HTTP error
{
    __setRequesterForTesting(async (url) => ({ status: 404, finalUrl: url, body: 'not found' }));
    try {
        await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/missing-1.html');
        log(false, 'HTTP error should throw');
    } catch (err) {
        const ce = err instanceof CrawlerError ? err : null;
        const codeOk = ce?.code === 'http_error';
        const statusOk = ce?.status === 404;
        log(codeOk && statusOk, 'HTTP 404 throws CrawlerError with code=http_error, status=404',
            ce ? `code=${ce.code} status=${ce.status}` : String(err));
    } finally {
        __setRequesterForTesting(null);
    }
}

// 7. dedupe + sort integration
{
    const watchHtml = readFileSync(FIXTURE, 'utf8');
    __setRequesterForTesting(async (url) => ({ status: 200, finalUrl: url, body: watchHtml }));
    try {
        const eps = await collectSeriesEpisodes('https://animehay07.site/thong-tin-phim/quang-am-chi-ngoai-4541.html');
        const doubled = [...eps, ...eps.map(e => ({ ...e }))];
        const deduped = deduplicateEpisodes(doubled);
        const sorted = sortEpisodesByNumber(deduped);
        log(deduped.length === 28, 'dedup keeps 28 of 56', `got ${deduped.length}`);
        log(sorted[0]?.no === '1' && sorted[sorted.length - 1]?.no === '28',
            'sort ascending by no', `first=${sorted[0]?.no} last=${sorted[sorted.length - 1]?.no}`);
    } finally {
        __setRequesterForTesting(null);
    }
}

// 8. Invalid argument: empty input
{
    let threw: unknown = null;
    try { await collectEpisodes(''); } catch (e) { threw = e; }
    const ok = threw instanceof CrawlerError && threw.code === 'invalid_argument';
    log(ok, 'empty input throws CrawlerError(invalid_argument)',
        threw instanceof Error ? threw.message : 'no throw');
}
}

main().then(() => {
    console.log(`\nSmoke: passed=${passed} failed=${failed}`);
    if (failed > 0) process.exit(1);
}).catch(err => {
    console.error('Smoke runner crashed:', err);
    process.exit(1);
});
