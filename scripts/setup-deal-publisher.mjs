#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { registerSubscriber as registerOrg } from '../src/pushmeClient.mjs';
import { loadEnvFile } from '../src/sharedEnv.mjs';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const EXAMPLE_ENV_PATH = path.resolve(process.cwd(), '.env.example');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = 'true';
    else { out[key] = next; i += 1; }
  }
  return out;
}

function writeEnvFile(filePath, values) {
  const merged = { ...loadEnvFile(EXAMPLE_ENV_PATH), ...loadEnvFile(filePath), ...values };
  const lines = Object.entries(merged).map(([key, value]) => `${key}=${value ?? ''}`);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function ask(rl, supplied, label, fallback = '') {
  if (String(supplied ?? '').trim()) return String(supplied).trim();
  if (!process.stdin.isTTY) return String(fallback).trim();
  const suffix = fallback ? ` [${fallback}]` : '';
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || fallback;
}

const args = parseArgs(process.argv);
const existing = { ...loadEnvFile(EXAMPLE_ENV_PATH), ...loadEnvFile(ENV_PATH) };
const rl = readline.createInterface({ input, output });
try {
  output.write('PushMe deal publisher setup\n');
  output.write('Registers a publisher bot and writes .env for one product monitor.\n\n');
  const baseUrl = await ask(rl, args['bot-url'], 'PushMe base URL', existing.PUSHME_BOT_URL || 'https://pushme.site');
  const productUrl = await ask(rl, args['product-url'], 'Product URL', existing.DEAL_PUBLISHER_PRODUCT_URL || '');
  const store = await ask(rl, args.store, 'Store name', existing.DEAL_PUBLISHER_STORE || '');
  const productName = await ask(rl, args['product-name'], 'Product name', existing.DEAL_PUBLISHER_PRODUCT_NAME || '');
  const brand = await ask(rl, args.brand, 'Brand', existing.DEAL_PUBLISHER_BRAND || '');
  const category = await ask(rl, args.category, 'Category', existing.DEAL_PUBLISHER_CATEGORY || 'game');
  const region = await ask(rl, args.region, 'Region', existing.DEAL_PUBLISHER_REGION || 'global');
  const currency = await ask(rl, args.currency, 'Currency', existing.DEAL_PUBLISHER_CURRENCY || 'USD');
  const orgName = await ask(rl, args['org-name'], 'Publisher name', `${store} ${productName} deal publisher`.trim());
  const websiteUrl = await ask(rl, args['website-url'], 'Website URL', existing.DEAL_PUBLISHER_SOURCE_URL || productUrl);
  const registration = await registerOrg(baseUrl, {
    orgName,
    role: 'publisher',
    websiteUrl,
    description: `Publishes commercial events for ${productName} at ${store}.`
  });
  writeEnvFile(ENV_PATH, {
    PUSHME_API_KEY: registration.apiKey || '',
    PUSHME_BOT_URL: baseUrl,
    DEAL_PUBLISHER_PRODUCT_URL: productUrl,
    DEAL_PUBLISHER_STORE: store,
    DEAL_PUBLISHER_PRODUCT_NAME: productName,
    DEAL_PUBLISHER_BRAND: brand,
    DEAL_PUBLISHER_CATEGORY: category,
    DEAL_PUBLISHER_REGION: region,
    DEAL_PUBLISHER_CURRENCY: currency.toUpperCase(),
    DEAL_PUBLISHER_INTERVAL_MS: existing.DEAL_PUBLISHER_INTERVAL_MS || '1800000',
    DEAL_PUBLISHER_STATE_FILE: existing.DEAL_PUBLISHER_STATE_FILE || './data/deal-publisher.json',
    DEAL_PUBLISHER_PUBLISH_MODE: existing.DEAL_PUBLISHER_PUBLISH_MODE || 'changes',
    DEAL_PUBLISHER_SOURCE_URL: websiteUrl
  });
  output.write('\nSaved .env\n');
  output.write(`org: ${registration.org?.name || orgName}\n`);
  output.write('next: npm run start:deal-publisher -- --once --dry-run\n');
} finally {
  await rl.close();
}
