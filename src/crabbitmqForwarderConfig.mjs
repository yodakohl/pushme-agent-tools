import path from 'node:path';
import { hydrateProcessEnv, parseBoolean, parseList, parseNumber } from './sharedEnv.mjs';

export function loadCrabbitMqForwarderConfig() {
  hydrateProcessEnv();
  const stateFile = path.resolve(process.cwd(), process.env.CRABBITMQ_FORWARDER_STATE_FILE || './data/crabbitmq-forwarder.json');
  const config = {
    apiKey: String(process.env.PUSHME_API_KEY || '').trim(),
    baseUrl: String(process.env.PUSHME_BOT_URL || 'https://pushme.site').replace(/\/$/, ''),
    name: String(process.env.CRABBITMQ_FORWARDER_NAME || 'PushMe CrabbitMQ Forwarder').trim(),
    websiteUrl: String(process.env.CRABBITMQ_FORWARDER_WEBSITE_URL || 'https://pushme.site/bot-api').trim(),
    eventTypes: parseList(process.env.CRABBITMQ_FORWARDER_EVENT_TYPES || 'net.*,status.*,policy.*'),
    topic: String(process.env.CRABBITMQ_FORWARDER_TOPIC || '').trim(),
    filters: {
      brands: parseList(process.env.CRABBITMQ_FORWARDER_BRANDS),
      stores: parseList(process.env.CRABBITMQ_FORWARDER_STORES),
      categories: parseList(process.env.CRABBITMQ_FORWARDER_CATEGORIES),
      productNames: parseList(process.env.CRABBITMQ_FORWARDER_PRODUCT_NAMES),
      regions: parseList(process.env.CRABBITMQ_FORWARDER_REGIONS),
      priceMax: parseNumber(process.env.CRABBITMQ_FORWARDER_PRICE_MAX),
      discountMinPct: parseNumber(process.env.CRABBITMQ_FORWARDER_DISCOUNT_MIN_PCT),
      inStock: parseBoolean(process.env.CRABBITMQ_FORWARDER_IN_STOCK, false)
    },
    queueUrl: String(process.env.CRABBITMQ_FORWARDER_URL || '').trim(),
    secret: String(process.env.CRABBITMQ_FORWARDER_SECRET || '').trim(),
    queue: String(process.env.CRABBITMQ_FORWARDER_QUEUE || 'external-events').trim(),
    routingKey: String(process.env.CRABBITMQ_FORWARDER_ROUTING_KEY || 'pushme.event').trim(),
    consumerGroup: String(process.env.CRABBITMQ_FORWARDER_CONSUMER_GROUP || '').trim(),
    pollIntervalMs: Math.max(15000, Number(process.env.CRABBITMQ_FORWARDER_POLL_INTERVAL_MS || 60000)),
    stateFile
  };
  if (!config.apiKey) throw new Error('Missing PUSHME_API_KEY');
  if (!config.queueUrl) throw new Error('Missing CRABBITMQ_FORWARDER_URL');
  return config;
}
