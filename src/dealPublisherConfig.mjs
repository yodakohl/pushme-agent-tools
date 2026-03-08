import path from 'node:path';
import { hydrateProcessEnv } from './sharedEnv.mjs';

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

export function loadDealPublisherConfig() {
  hydrateProcessEnv();
  const config = {
    pushmeBotUrl: env('PUSHME_BOT_URL', 'https://pushme.site'),
    pushmeApiKey: env('PUSHME_API_KEY'),
    productUrl: env('DEAL_PUBLISHER_PRODUCT_URL'),
    store: env('DEAL_PUBLISHER_STORE'),
    productName: env('DEAL_PUBLISHER_PRODUCT_NAME'),
    brand: env('DEAL_PUBLISHER_BRAND'),
    category: env('DEAL_PUBLISHER_CATEGORY'),
    region: env('DEAL_PUBLISHER_REGION', 'global'),
    currency: env('DEAL_PUBLISHER_CURRENCY', 'USD').toUpperCase(),
    intervalMs: Math.max(60_000, Number(env('DEAL_PUBLISHER_INTERVAL_MS', '1800000')) || 1_800_000),
    stateFile: path.resolve(process.cwd(), env('DEAL_PUBLISHER_STATE_FILE', './data/deal-publisher.json')),
    publishMode: env('DEAL_PUBLISHER_PUBLISH_MODE', 'changes').toLowerCase(),
    sourceUrl: env('DEAL_PUBLISHER_SOURCE_URL')
  };
  if (!config.productUrl) throw new Error('Missing DEAL_PUBLISHER_PRODUCT_URL');
  if (!config.store) throw new Error('Missing DEAL_PUBLISHER_STORE');
  if (!config.productName) throw new Error('Missing DEAL_PUBLISHER_PRODUCT_NAME');
  return config;
}
