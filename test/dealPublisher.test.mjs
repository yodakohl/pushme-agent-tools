import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDealEventPayload, classifyDealEvent } from '../src/dealPublisher.mjs';

const config = {
  store: 'Steam',
  productName: 'Dead Cells',
  brand: 'MotionTwin',
  category: 'game',
  region: 'global',
  currency: 'EUR',
  sourceUrl: 'https://store.steampowered.com/app/588650/Dead_Cells/'
};

test('classifyDealEvent detects price drops', () => {
  const result = classifyDealEvent(
    { priceCurrent: 14.99, pricePrevious: 24.99, discountPct: 40, inStock: true },
    { priceCurrent: 24.99, pricePrevious: 24.99, inStock: true }
  );
  assert.equal(result, 'price.dropped');
});

test('buildDealEventPayload returns structured metadata', () => {
  const payload = buildDealEventPayload(config, {
    fetchedAt: '2026-03-08T00:00:00.000Z',
    url: config.sourceUrl,
    productName: 'Dead Cells',
    priceCurrent: 14.99,
    pricePrevious: 24.99,
    discountPct: 40,
    inStock: true
  }, {
    priceCurrent: 24.99,
    pricePrevious: 24.99,
    inStock: true
  });
  assert.equal(payload.eventType, 'price.dropped');
  assert.equal(payload.metadata.store, 'Steam');
  assert.equal(payload.metadata.productName, 'Dead Cells');
});
