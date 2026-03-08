#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { registerSubscriber } from '../src/pushmeClient.mjs';
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
  output.write('PushMe webhook forwarder setup\n');
  output.write('Registers a subscriber bot and writes .env for webhook delivery.\n\n');
  const baseUrl = await ask(rl, args['bot-url'], 'PushMe base URL', existing.PUSHME_BOT_URL || 'https://pushme.site');
  const orgName = await ask(rl, args['org-name'], 'Bot name', existing.WEBHOOK_FORWARDER_NAME || 'PushMe Webhook Forwarder');
  const websiteUrl = await ask(rl, args['website-url'], 'Website URL', existing.WEBHOOK_FORWARDER_WEBSITE_URL || 'https://pushme.site/bot-api');
  const webhookUrl = await ask(rl, args['webhook-url'], 'Webhook URL', existing.WEBHOOK_FORWARDER_URL || '');
  const stores = await ask(rl, args.stores, 'Stores (comma-separated)', existing.WEBHOOK_FORWARDER_STORES || '');
  const categories = await ask(rl, args.categories, 'Categories (comma-separated)', existing.WEBHOOK_FORWARDER_CATEGORIES || '');
  const priceMax = await ask(rl, args['price-max'], 'Max price', existing.WEBHOOK_FORWARDER_PRICE_MAX || '');
  const discountMinPct = await ask(rl, args['discount-min-pct'], 'Minimum discount %', existing.WEBHOOK_FORWARDER_DISCOUNT_MIN_PCT || '');
  const registration = await registerSubscriber(baseUrl, {
    orgName,
    role: 'subscriber',
    websiteUrl,
    description: 'Forwards matched PushMe events to a webhook for agent execution.'
  });
  writeEnvFile(ENV_PATH, {
    PUSHME_API_KEY: registration.apiKey || '',
    PUSHME_BOT_URL: baseUrl,
    WEBHOOK_FORWARDER_NAME: orgName,
    WEBHOOK_FORWARDER_WEBSITE_URL: websiteUrl,
    WEBHOOK_FORWARDER_EVENT_TYPES: existing.WEBHOOK_FORWARDER_EVENT_TYPES || 'price.*,discount.*,stock.*',
    WEBHOOK_FORWARDER_TOPIC: existing.WEBHOOK_FORWARDER_TOPIC || '',
    WEBHOOK_FORWARDER_STORES: stores,
    WEBHOOK_FORWARDER_CATEGORIES: categories,
    WEBHOOK_FORWARDER_PRICE_MAX: priceMax,
    WEBHOOK_FORWARDER_DISCOUNT_MIN_PCT: discountMinPct,
    WEBHOOK_FORWARDER_URL: webhookUrl,
    WEBHOOK_FORWARDER_SECRET: existing.WEBHOOK_FORWARDER_SECRET || '',
    WEBHOOK_FORWARDER_IN_STOCK: existing.WEBHOOK_FORWARDER_IN_STOCK || 'true',
    WEBHOOK_FORWARDER_STATE_FILE: existing.WEBHOOK_FORWARDER_STATE_FILE || './data/webhook-forwarder.json',
    WEBHOOK_FORWARDER_POLL_INTERVAL_MS: existing.WEBHOOK_FORWARDER_POLL_INTERVAL_MS || '60000'
  });
  output.write('\nSaved .env\n');
  output.write(`org: ${registration.org?.name || orgName}\n`);
  output.write('next: npm run start:webhook-forwarder -- --once --dry-run\n');
} finally {
  await rl.close();
}
