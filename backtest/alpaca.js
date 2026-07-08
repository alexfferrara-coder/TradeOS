// Alpaca historical daily bars — READ ONLY. This hits the market-data API
// only (GET /v2/stocks/.../bars). It places no orders and touches no account
// state. Paper keys are fine. Bars are cached to disk so re-runs don't refetch.

import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const BARS_URL = 'https://data.alpaca.markets/v2/stocks';

export async function getDailyBars(symbol, { start, end, feed, dataDir }) {
  const cacheFile = new URL(`${symbol}.json`, dataDir);
  if (existsSync(cacheFile)) {
    return JSON.parse(await readFile(cacheFile, 'utf8'));
  }

  const keyId = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  if (!keyId || !secret) {
    throw new Error(
      'Missing APCA_API_KEY_ID / APCA_API_SECRET_KEY env vars — cannot fetch bars.'
    );
  }

  const bars = [];
  let pageToken;
  do {
    const url = new URL(`${BARS_URL}/${symbol}/bars`);
    url.searchParams.set('timeframe', '1Day');
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('adjustment', 'all'); // split + dividend adjusted
    url.searchParams.set('feed', feed);
    url.searchParams.set('limit', '10000');
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const res = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secret,
      },
    });
    if (!res.ok) {
      throw new Error(
        `Alpaca ${symbol} bars request failed: ${res.status} ${res.statusText} — ${await res.text()}`
      );
    }
    const json = await res.json();
    if (Array.isArray(json.bars)) bars.push(...json.bars);
    pageToken = json.next_page_token;
  } while (pageToken);

  const normalized = bars.map((b) => ({
    date: b.t.slice(0, 10),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
  }));

  await mkdir(dataDir, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(normalized, null, 2));
  return normalized;
}
