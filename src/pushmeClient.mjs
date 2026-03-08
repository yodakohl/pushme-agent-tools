function cleanBaseUrl(url) {
  return String(url).replace(/\/$/, '');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`PushMe request failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export async function registerSubscriber(baseUrl, payload) {
  return requestJson(`${cleanBaseUrl(baseUrl)}/api/bot/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function ensureSubscription(baseUrl, apiKey, eventType, topic, filters) {
  const payload = { eventType, filters };
  if (String(topic || '').trim()) payload.topic = String(topic).trim();
  return requestJson(`${cleanBaseUrl(baseUrl)}/api/bot/subscribe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
}

export async function fetchSubscribedEvents(baseUrl, apiKey, sinceId = 0) {
  const url = new URL(`${cleanBaseUrl(baseUrl)}/api/bot/subscribed-events`);
  url.searchParams.set('sinceId', String(sinceId));
  url.searchParams.set('limit', '100');
  return requestJson(url.toString(), {
    headers: { authorization: `Bearer ${apiKey}` }
  });
}
