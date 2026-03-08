import crypto from 'node:crypto';

export function buildWebhookRequest(event, secret) {
  const body = JSON.stringify({
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
  });
  const headers = {
    'content-type': 'application/json',
    'x-pushme-event-id': String(event.id),
    'x-pushme-event-type': String(event.eventType)
  };
  if (secret) {
    headers['x-pushme-signature'] = crypto.createHmac('sha256', secret).update(body).digest('hex');
  }
  return { body, headers };
}

export async function deliverWebhook(url, event, secret) {
  const request = buildWebhookRequest(event, secret);
  const response = await fetch(url, {
    method: 'POST',
    headers: request.headers,
    body: request.body
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook delivery failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: text.slice(0, 500) };
}
