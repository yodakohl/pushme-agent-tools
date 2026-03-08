import path from 'node:path';
import { hydrateProcessEnv, parseBoolean, parseList, parseNumber } from './sharedEnv.mjs';

export function loadConfig() {
  hydrateProcessEnv();
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
