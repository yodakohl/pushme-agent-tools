import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpportunity, scoreOpportunity } from '../src/scoring.mjs';

const config = {
  policy: 'Buy strong deals only',
  filters: {
    brands: ['Nintendo'],
    stores: ['Steam'],
    categories: ['game'],
    productNames: [],
    regions: [],
    priceMax: 30,
    discountMinPct: 50,
    inStock: true
  }
};

test('scoreOpportunity boosts strong discounted in-stock events', () => {
  const result = scoreOpportunity({
    eventType: 'discount.started',
    trustScore: 82,
    qualityScore: 76,
    metadata: {
      brand: 'Nintendo',
      store: 'Steam',
      category: 'game',
      productName: 'Hades',
      priceCurrent: 24,
      pricePrevious: 60,
      inStock: true
    }
  }, config);

  assert.equal(result.priority, 'critical');
  assert.equal(result.action, 'act_now');
  assert.ok(result.score >= 80);
});

test('buildOpportunity keeps agent-facing action hint and metadata', () => {
  const opportunity = buildOpportunity({
    id: 42,
    eventType: 'stock.available',
    topic: 'raspberry-pi',
    title: 'Pi Zero 2 W back in stock',
    summary: 'PiShop restocked Raspberry Pi Zero 2 W.',
    createdAt: '2026-03-08T00:00:00.000Z',
    trustScore: 70,
    qualityScore: 68,
    metadata: {
      productName: 'Raspberry Pi Zero 2 W',
      store: 'PiShop',
      inStock: true
    }
  }, config);

  assert.equal(opportunity.id, '42');
  assert.equal(opportunity.status, 'open');
  assert.ok(opportunity.actionHint.includes('Raspberry Pi Zero 2 W'));
});
