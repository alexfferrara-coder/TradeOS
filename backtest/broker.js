// Read-only Alpaca PAPER adapter. Account/positions come from the paper
// trading endpoint; recent bars from the data API. There is deliberately NO
// order-submission method here — v1 is dry-run only. `fetchImpl` is injected
// so the loop is testable without network.

const PAPER_URL = 'https://paper-api.alpaca.markets';
const DATA_URL = 'https://data.alpaca.markets/v2/stocks';

const iso = (d) => d.toISOString().slice(0, 10);

export function createAlpacaBroker({
  fetchImpl = fetch,
  keyId = process.env.APCA_API_KEY_ID,
  secret = process.env.APCA_API_SECRET_KEY,
  barsCount = 250,
  // 'iex' (free) permits recent data; recent 'sip' needs a paid data plan.
  // The live loop wants the freshest completed bar, so default to iex.
  feed = 'iex',
} = {}) {
  if (!keyId || !secret) {
    throw new Error('Missing APCA_API_KEY_ID / APCA_API_SECRET_KEY — cannot reach Alpaca.');
  }
  const headers = { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret };

  async function getJson(url, label) {
    const res = await fetchImpl(url, { headers });
    if (!res.ok) {
      throw new Error(`Alpaca ${label} failed: ${res.status} ${res.statusText} — ${await res.text()}`);
    }
    return res.json();
  }

  async function getAccount() {
    const a = await getJson(`${PAPER_URL}/v2/account`, 'account');
    return { equity: Number(a.equity), cash: Number(a.cash), status: a.status };
  }

  async function getPositions() {
    const list = await getJson(`${PAPER_URL}/v2/positions`, 'positions');
    return list.map((p) => ({
      symbol: p.symbol,
      qty: Number(p.qty),
      avgEntryPrice: Number(p.avg_entry_price),
    }));
  }

  // ~`barsCount` most recent daily bars up to today, split/dividend adjusted
  // (matches the backtest's `adjustment=all` basis). Enough history for the
  // 200-day SMA, 20-day high, 10-day low, and ATR(14).
  async function getRecentBars(symbol) {
    const end = new Date();
    const start = new Date(end.getTime() - 400 * 24 * 60 * 60 * 1000); // ~400 cal days
    const url = new URL(`${DATA_URL}/${symbol}/bars`);
    url.searchParams.set('timeframe', '1Day');
    url.searchParams.set('start', iso(start));
    url.searchParams.set('end', iso(end));
    url.searchParams.set('adjustment', 'all');
    url.searchParams.set('feed', feed);
    url.searchParams.set('limit', String(barsCount * 4));
    const json = await getJson(url, `${symbol} bars`);
    const bars = Array.isArray(json.bars) ? json.bars : [];
    return bars.map((b) => ({
      date: b.t.slice(0, 10),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v,
    }));
  }

  return { getAccount, getPositions, getRecentBars };
}
