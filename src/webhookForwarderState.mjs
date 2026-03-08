import fs from 'node:fs';
import path from 'node:path';

export function loadWebhookForwarderState(filePath) {
  if (!fs.existsSync(filePath)) return { sinceId: 0, delivered: [], lastPollAt: null, lastError: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      sinceId: Number(parsed.sinceId || 0),
      delivered: Array.isArray(parsed.delivered) ? parsed.delivered : [],
      lastPollAt: parsed.lastPollAt || null,
      lastError: parsed.lastError || null
    };
  } catch {
    return { sinceId: 0, delivered: [], lastPollAt: null, lastError: 'Failed to parse state file' };
  }
}

export function saveWebhookForwarderState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function recordDeliveries(state, events) {
  const deliveredSet = new Set(state.delivered || []);
  for (const event of events || []) deliveredSet.add(String(event.id));
  return {
    sinceId: Math.max(state.sinceId || 0, ...events.map((event) => Number(event.id || 0)), 0),
    delivered: [...deliveredSet].slice(-500),
    lastPollAt: new Date().toISOString(),
    lastError: null
  };
}
