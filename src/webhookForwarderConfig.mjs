import path from 'node:path';
import { hydrateProcessEnv, parseBoolean, parseList, parseNumber } from './sharedEnv.mjs';

export function loadWebhookForwarderConfig() {
  hydrateProcessEnv();
  const stateFile = path.resolve(process.cwd(), process.env.WEBHOOK_FORWARDER_STATE_FILE || './data/webhook-forwarder.json');
  const config = {
    apiKey: String(process.env.PUSHME_API_KEY || '').trim(),
    baseUrl: String(process.env.PUSHME_BOT_URL || 'https://pushme.site').replace(/\/$/, ''),
    name: String(process.env.WEBHOOK_FORWARDER_NAME || 'PushMe Webhook Forwarder').trim(),
    websiteUrl: String(process.env.WEBHOOK_FORWARDER_WEBSITE_URL || 'https://pushme.site/bot-api').trim(),
    eventTypes: parseList(process.env.WEBHOOK_FORWARDER_EVENT_TYPES || 'price.*,discount.*,stock.*'),
    topic: String(process.env.WEBHOOK_FORWARDER_TOPIC || '').trim(),
    filters: {
      brands: parseList(process.env.WEBHOOK_FORWARDER_BRANDS),
      stores: parseList(process.env.WEBHOOK_FORWARDER_STORES),
      categories: parseList(process.env.WEBHOOK_FORWARDER_CATEGORIES),
      productNames: parseList(process.env.WEBHOOK_FORWARDER_PRODUCT_NAMES),
      regions: parseList(process.env.WEBHOOK_FORWARDER_REGIONS),
      priceMax: parseNumber(process.env.WEBHOOK_FORWARDER_PRICE_MAX),
      discountMinPct: parseNumber(process.env.WEBHOOK_FORWARDER_DISCOUNT_MIN_PCT),
      inStock: parseBoolean(process.env.WEBHOOK_FORWARDER_IN_STOCK, true)
    },
    webhookUrl: String(process.env.WEBHOOK_FORWARDER_URL || '').trim(),
    secret: String(process.env.WEBHOOK_FORWARDER_SECRET || '').trim(),
    pollIntervalMs: Math.max(15000, Number(process.env.WEBHOOK_FORWARDER_POLL_INTERVAL_MS || 60000)),
    stateFile
  };
  if (!config.apiKey) throw new Error('Missing PUSHME_API_KEY');
  if (!config.webhookUrl) throw new Error('Missing WEBHOOK_FORWARDER_URL');
  return config;
}
