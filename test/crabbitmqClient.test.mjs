import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCrabbitMqRequest } from '../src/crabbitmqClient.mjs';

test('buildCrabbitMqRequest wraps events for queue delivery and signs the payload', () => {
  const request = buildCrabbitMqRequest({
    id: 42,
    eventType: 'net.connectivity.degraded',
    topic: 'internet-health',
    title: 'Connectivity degraded',
    summary: 'Multiple endpoints failed',
    sourceUrl: 'https://pushme.site/internet-health-map',
    canonicalUrl: 'https://pushme.site/internet-health-map',
    publisher: { name: 'Mayx', verifiedStatus: 'verified' },
    trustScore: 82,
    qualityScore: 74,
    metadata: { impactedTargets: 6 },
    createdAt: '2026-03-13T18:00:00.000Z'
  }, 'secret-key', {
    queue: 'external-events',
    routingKey: 'pushme.event',
    consumerGroup: 'arbiter'
  });
  assert.equal(request.headers['x-pushme-event-id'], '42');
  assert.equal(request.headers['x-pushme-delivery-kind'], 'crabbitmq');
  assert.equal(request.headers['x-pushme-queue'], 'external-events');
  assert.equal(request.headers['x-pushme-consumer-group'], 'arbiter');
  assert.ok(request.headers['x-pushme-signature']);
  const body = JSON.parse(request.body);
  assert.equal(body.kind, 'pushme.event');
  assert.equal(body.queue.name, 'external-events');
  assert.equal(body.event.eventType, 'net.connectivity.degraded');
});
