import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWebhookRequest } from '../src/webhookClient.mjs';

test('buildWebhookRequest signs webhook payloads when secret is present', () => {
  const request = buildWebhookRequest({
    id: 12,
    eventType: 'price.dropped',
    topic: 'gpu',
    title: 'GPU dropped',
    summary: 'Price fell',
    sourceUrl: 'https://example.com',
    trustScore: 70,
    qualityScore: 75,
    metadata: { store: 'Best Buy' },
    createdAt: '2026-03-08T00:00:00.000Z'
  }, 'secret-key');
  assert.equal(request.headers['x-pushme-event-id'], '12');
  assert.ok(request.headers['x-pushme-signature']);
  assert.ok(request.body.includes('price.dropped'));
});
