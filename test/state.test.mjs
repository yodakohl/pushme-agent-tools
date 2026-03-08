import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeOpportunity, reduceEvents } from '../src/state.mjs';

const config = {
  policy: 'Find good hardware deals',
  filters: {
    brands: [],
    stores: ['PiShop'],
    categories: [],
    productNames: [],
    regions: [],
    priceMax: 50,
    discountMinPct: null,
    inStock: true
  }
};

test('reduceEvents sorts stronger opportunities first and advances sinceId', () => {
  const state = { sinceId: 0, opportunities: [], lastPollAt: null, lastError: null };
  const next = reduceEvents(state, [
    {
      id: 11,
      eventType: 'stock.available',
      topic: 'pi',
      title: 'Pi in stock',
      summary: 'Back in stock',
      createdAt: '2026-03-08T00:00:00.000Z',
      trustScore: 60,
      qualityScore: 60,
      metadata: { productName: 'Pi', store: 'PiShop', inStock: true, priceCurrent: 15 }
    },
    {
      id: 12,
      eventType: 'discount.started',
      topic: 'games',
      title: 'Game 80% off',
      summary: 'Huge deal',
      createdAt: '2026-03-08T00:01:00.000Z',
      trustScore: 80,
      qualityScore: 80,
      metadata: { productName: 'Game', store: 'Steam', inStock: true, priceCurrent: 9, pricePrevious: 49 }
    }
  ], config);

  assert.equal(next.sinceId, 12);
  assert.equal(next.opportunities[0].eventId, 12);
});

test('acknowledgeOpportunity marks an opportunity as acknowledged', () => {
  const state = {
    opportunities: [{ id: '12', status: 'open' }]
  };
  const result = acknowledgeOpportunity(state, '12');
  assert.equal(result.changed, true);
  assert.equal(result.state.opportunities[0].status, 'acknowledged');
});
