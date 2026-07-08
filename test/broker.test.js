import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAlpacaBroker } from '../backtest/broker.js';

// Fake fetch that records the URL/headers it was called with and returns a
// canned JSON body per matched path.
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, opts) => {
    const u = String(url);
    calls.push({ url: u, headers: opts.headers });
    const match = Object.keys(routes).find((k) => u.includes(k));
    if (!match) return { ok: false, status: 404, statusText: 'Not Found', text: async () => 'no route' };
    return { ok: true, json: async () => routes[match] };
  };
  impl.calls = calls;
  return impl;
}

const creds = { keyId: 'k', secret: 's' };

describe('createAlpacaBroker', () => {
  it('throws without credentials', () => {
    assert.throws(() => createAlpacaBroker({ keyId: '', secret: '' }), /Missing APCA/);
  });

  it('reads account equity from the paper endpoint with auth headers', async () => {
    const fetchImpl = fakeFetch({ '/v2/account': { equity: '52345.67', cash: '10000', status: 'ACTIVE' } });
    const broker = createAlpacaBroker({ ...creds, fetchImpl });
    const acct = await broker.getAccount();
    assert.equal(acct.equity, 52345.67);
    const call = fetchImpl.calls[0];
    assert.ok(call.url.startsWith('https://paper-api.alpaca.markets/v2/account'), 'uses paper endpoint');
    assert.equal(call.headers['APCA-API-KEY-ID'], 'k');
  });

  it('maps positions to normalized shape', async () => {
    const fetchImpl = fakeFetch({
      '/v2/positions': [{ symbol: 'NVDA', qty: '38', avg_entry_price: '120.50' }],
    });
    const broker = createAlpacaBroker({ ...creds, fetchImpl });
    const pos = await broker.getPositions();
    assert.deepEqual(pos, [{ symbol: 'NVDA', qty: 38, avgEntryPrice: 120.5 }]);
  });

  it('normalizes recent bars and requests adjusted data', async () => {
    const fetchImpl = fakeFetch({
      '/bars': { bars: [{ t: '2026-07-01T00:00:00Z', o: 1, h: 2, l: 0.5, c: 1.5, v: 1000 }] },
    });
    const broker = createAlpacaBroker({ ...creds, fetchImpl });
    const bars = await broker.getRecentBars('NVDA');
    assert.deepEqual(bars, [{ date: '2026-07-01', open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 }]);
    assert.ok(fetchImpl.calls[0].url.includes('adjustment=all'), 'requests adjusted bars');
    assert.ok(fetchImpl.calls[0].url.includes('data.alpaca.markets'), 'uses data endpoint');
  });

  it('throws a descriptive error on a failed response', async () => {
    const fetchImpl = fakeFetch({}); // 404 for everything
    const broker = createAlpacaBroker({ ...creds, fetchImpl });
    await assert.rejects(() => broker.getAccount(), /account failed: 404/);
  });
});
