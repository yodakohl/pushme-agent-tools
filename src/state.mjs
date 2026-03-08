import fs from 'node:fs';
import path from 'node:path';
import { buildOpportunity } from './scoring.mjs';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function loadState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      sinceId: 0,
      opportunities: [],
      lastPollAt: null,
      lastError: null
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      sinceId: Number(parsed.sinceId || 0),
      opportunities: safeArray(parsed.opportunities),
      lastPollAt: parsed.lastPollAt || null,
      lastError: parsed.lastError || null
    };
  } catch {
    return {
      sinceId: 0,
      opportunities: [],
      lastPollAt: null,
      lastError: 'Failed to parse state file'
    };
  }
}

export function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function reduceEvents(state, events, config) {
  const byId = new Map((state.opportunities || []).map((item) => [String(item.id), item]));
  for (const event of events || []) {
    const id = String(event.id);
    const existing = byId.get(id);
    const rebuilt = buildOpportunity(event, config);
    if (existing?.status === 'acknowledged') {
      byId.set(id, { ...rebuilt, status: 'acknowledged', acknowledgedAt: existing.acknowledgedAt || new Date().toISOString() });
    } else {
      byId.set(id, existing ? { ...existing, ...rebuilt, status: existing.status || 'open' } : rebuilt);
    }
  }
  const opportunities = [...byId.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.eventId || 0) - Number(a.eventId || 0);
    })
    .slice(0, 200);
  return {
    sinceId: Math.max(state.sinceId || 0, ...safeArray(events).map((event) => Number(event.id || 0)), 0),
    opportunities,
    lastPollAt: new Date().toISOString(),
    lastError: null
  };
}

export function acknowledgeOpportunity(state, id) {
  const wanted = String(id);
  let changed = false;
  const opportunities = safeArray(state.opportunities).map((item) => {
    if (String(item.id) !== wanted || item.status === 'acknowledged') return item;
    changed = true;
    return { ...item, status: 'acknowledged', acknowledgedAt: new Date().toISOString() };
  });
  return { changed, state: { ...state, opportunities } };
}

export function summarizeState(state, config) {
  const open = safeArray(state.opportunities).filter((item) => item.status !== 'acknowledged');
  return {
    toolName: config.toolName,
    policy: config.policy,
    baseUrl: config.baseUrl,
    openCount: open.length,
    criticalCount: open.filter((item) => item.priority === 'critical').length,
    highCount: open.filter((item) => item.priority === 'high').length,
    lastPollAt: state.lastPollAt,
    filters: config.filters,
    eventTypes: config.eventTypes,
    topic: config.topic
  };
}
