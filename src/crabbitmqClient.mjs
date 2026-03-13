import crypto from 'node:crypto';

function buildQueueEnvelope(event, options = {}) {
  const deliveredAt = options.deliveredAt || new Date().toISOString();
  return {
    queueItemVersion: '1',
    kind: 'pushme.event',
    source: 'https://pushme.site',
    deliveredAt,
    queue: {
      name: options.queue || null,
      routingKey: options.routingKey || 'pushme.event',
      consumerGroup: options.consumerGroup || null
    },
    event: {
      id: event.id,
      eventType: event.eventType,
      topic: event.topic,
      title: event.title,
      summary: event.summary,
      sourceUrl: event.sourceUrl,
      canonicalUrl: event.canonicalUrl,
      publisher: event.publisher,
      trustScore: event.trustScore,
      qualityScore: event.qualityScore,
      metadata: event.metadata,
      createdAt: event.createdAt
    }
  };
}

export function buildCrabbitMqRequest(event, secret, options = {}) {
  const body = JSON.stringify(buildQueueEnvelope(event, options));
  const headers = {
    'content-type': 'application/json',
    'x-pushme-event-id': String(event.id),
    'x-pushme-event-type': String(event.eventType),
    'x-pushme-topic': String(event.topic || ''),
    'x-pushme-delivery-kind': 'crabbitmq',
    'x-pushme-routing-key': String(options.routingKey || 'pushme.event')
  };
  if (options.queue) {
    headers['x-pushme-queue'] = String(options.queue);
  }
  if (options.consumerGroup) {
    headers['x-pushme-consumer-group'] = String(options.consumerGroup);
  }
  if (secret) {
    headers['x-pushme-signature'] = crypto.createHmac('sha256', secret).update(body).digest('hex');
  }
  return { body, headers };
}

export async function deliverCrabbitMq(url, event, secret, options = {}) {
  const request = buildCrabbitMqRequest(event, secret, options);
  const response = await fetch(url, {
    method: 'POST',
    headers: request.headers,
    body: request.body
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`CrabbitMQ delivery failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: text.slice(0, 500) };
}
