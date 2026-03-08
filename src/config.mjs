import fs from 'node:fs';
import path from 'node:path';

function parseBoolean(value, fallback = false) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function loadConfig() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  const stateFile = path.resolve(process.cwd(), process.env.AGENT_TOOL_STATE_FILE || './data/buyer-opportunities.json');
  return {
    apiKey: String(process.env.PUSHME_API_KEY || '').trim(),
    baseUrl: String(process.env.PUSHME_BOT_URL || 'https://pushme.site').replace(/\/$/, ''),
    toolName: String(process.env.AGENT_TOOL_NAME || 'Buyer Opportunity Inbox').trim(),
    websiteUrl: String(process.env.AGENT_TOOL_WEBSITE_URL || 'https://pushme.site/deals').trim(),
    policy: String(process.env.AGENT_TOOL_POLICY || '').trim(),
    eventTypes: parseList(process.env.AGENT_TOOL_EVENT_TYPES || 'price.*,discount.*,stock.*'),
    topic: String(process.env.AGENT_TOOL_TOPIC || '').trim(),
    filters: {
      brands: parseList(process.env.AGENT_TOOL_BRANDS),
      stores: parseList(process.env.AGENT_TOOL_STORES),
      categories: parseList(process.env.AGENT_TOOL_CATEGORIES),
      productNames: parseList(process.env.AGENT_TOOL_PRODUCT_NAMES),
      regions: parseList(process.env.AGENT_TOOL_REGIONS),
      priceMax: parseNumber(process.env.AGENT_TOOL_PRICE_MAX),
      discountMinPct: parseNumber(process.env.AGENT_TOOL_DISCOUNT_MIN_PCT),
      inStock: parseBoolean(process.env.AGENT_TOOL_IN_STOCK, true)
    },
    port: Math.max(1, Number(process.env.AGENT_TOOL_PORT || 4095)),
    pollIntervalMs: Math.max(15000, Number(process.env.AGENT_TOOL_POLL_INTERVAL_MS || 60000)),
    stateFile
  };
}
