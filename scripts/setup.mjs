#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { registerSubscriber } from '../src/pushmeClient.mjs';

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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const entries = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    entries[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return entries;
}

function writeEnvFile(filePath, values) {
  const lines = [
    `PUSHME_API_KEY=${values.PUSHME_API_KEY || ''}`,
    `PUSHME_BOT_URL=${values.PUSHME_BOT_URL || 'https://pushme.site'}`,
    `AGENT_TOOL_NAME=${values.AGENT_TOOL_NAME || 'Buyer Opportunity Inbox'}`,
    `AGENT_TOOL_WEBSITE_URL=${values.AGENT_TOOL_WEBSITE_URL || 'https://pushme.site/deals'}`,
    `AGENT_TOOL_POLICY=${values.AGENT_TOOL_POLICY || 'Watch for discounted games, GPUs, and Raspberry Pi hardware that look worth buying.'}`,
    `AGENT_TOOL_EVENT_TYPES=${values.AGENT_TOOL_EVENT_TYPES || 'price.*,discount.*,stock.*'}`,
    `AGENT_TOOL_TOPIC=${values.AGENT_TOOL_TOPIC || ''}`,
    `AGENT_TOOL_BRANDS=${values.AGENT_TOOL_BRANDS || ''}`,
    `AGENT_TOOL_STORES=${values.AGENT_TOOL_STORES || ''}`,
    `AGENT_TOOL_CATEGORIES=${values.AGENT_TOOL_CATEGORIES || ''}`,
    `AGENT_TOOL_PRODUCT_NAMES=${values.AGENT_TOOL_PRODUCT_NAMES || ''}`,
    `AGENT_TOOL_REGIONS=${values.AGENT_TOOL_REGIONS || ''}`,
    `AGENT_TOOL_PRICE_MAX=${values.AGENT_TOOL_PRICE_MAX || ''}`,
    `AGENT_TOOL_DISCOUNT_MIN_PCT=${values.AGENT_TOOL_DISCOUNT_MIN_PCT || ''}`,
    `AGENT_TOOL_IN_STOCK=${values.AGENT_TOOL_IN_STOCK || 'true'}`,
    `AGENT_TOOL_PORT=${values.AGENT_TOOL_PORT || '4095'}`,
    `AGENT_TOOL_POLL_INTERVAL_MS=${values.AGENT_TOOL_POLL_INTERVAL_MS || '60000'}`,
    `AGENT_TOOL_STATE_FILE=${values.AGENT_TOOL_STATE_FILE || './data/buyer-opportunities.json'}`
  ];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function promptValue(rl, supplied, label, fallback = '') {
  if (String(supplied ?? '').trim()) return String(supplied).trim();
  if (!process.stdin.isTTY) return String(fallback).trim();
  const suffix = fallback ? ` [${fallback}]` : '';
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || fallback;
}

async function main() {
  const args = parseArgs(process.argv);
  const existing = { ...loadEnvFile(EXAMPLE_ENV_PATH), ...loadEnvFile(ENV_PATH) };
  const rl = readline.createInterface({ input, output });
  try {
    output.write('PushMe buyer opportunity inbox setup\n');
    output.write('Registers a subscriber bot and writes .env for a local agent inbox.\n\n');

    const baseUrl = await promptValue(rl, args['bot-url'], 'PushMe base URL', existing.PUSHME_BOT_URL || 'https://pushme.site');
    const orgName = await promptValue(rl, args['org-name'], 'Bot name', existing.AGENT_TOOL_NAME || 'Buyer Opportunity Inbox');
    const websiteUrl = await promptValue(rl, args['website-url'], 'Website URL', existing.AGENT_TOOL_WEBSITE_URL || 'https://pushme.site/deals');
    const policy = await promptValue(rl, args.policy, 'Buying policy', existing.AGENT_TOOL_POLICY || 'Watch for discounted games, GPUs, and Raspberry Pi hardware that look worth buying.');
    const brands = await promptValue(rl, args.brands, 'Brands (comma-separated)', existing.AGENT_TOOL_BRANDS || '');
    const stores = await promptValue(rl, args.stores, 'Stores (comma-separated)', existing.AGENT_TOOL_STORES || '');
    const categories = await promptValue(rl, args.categories, 'Categories (comma-separated)', existing.AGENT_TOOL_CATEGORIES || '');
    const priceMax = await promptValue(rl, args['price-max'], 'Max price', existing.AGENT_TOOL_PRICE_MAX || '');
    const discountMinPct = await promptValue(rl, args['discount-min-pct'], 'Minimum discount %', existing.AGENT_TOOL_DISCOUNT_MIN_PCT || '');

    const registration = await registerSubscriber(baseUrl, {
      orgName,
      role: 'subscriber',
      websiteUrl,
      description: 'Consumes structured commercial events from PushMe and exposes a local opportunity inbox for AI agents.'
    });

    writeEnvFile(ENV_PATH, {
      ...existing,
      PUSHME_API_KEY: registration.apiKey || '',
      PUSHME_BOT_URL: baseUrl,
      AGENT_TOOL_NAME: orgName,
      AGENT_TOOL_WEBSITE_URL: websiteUrl,
      AGENT_TOOL_POLICY: policy,
      AGENT_TOOL_EVENT_TYPES: existing.AGENT_TOOL_EVENT_TYPES || 'price.*,discount.*,stock.*',
      AGENT_TOOL_TOPIC: existing.AGENT_TOOL_TOPIC || '',
      AGENT_TOOL_BRANDS: brands,
      AGENT_TOOL_STORES: stores,
      AGENT_TOOL_CATEGORIES: categories,
      AGENT_TOOL_PRODUCT_NAMES: existing.AGENT_TOOL_PRODUCT_NAMES || '',
      AGENT_TOOL_REGIONS: existing.AGENT_TOOL_REGIONS || '',
      AGENT_TOOL_PRICE_MAX: priceMax,
      AGENT_TOOL_DISCOUNT_MIN_PCT: discountMinPct,
      AGENT_TOOL_IN_STOCK: existing.AGENT_TOOL_IN_STOCK || 'true',
      AGENT_TOOL_PORT: existing.AGENT_TOOL_PORT || '4095',
      AGENT_TOOL_POLL_INTERVAL_MS: existing.AGENT_TOOL_POLL_INTERVAL_MS || '60000',
      AGENT_TOOL_STATE_FILE: existing.AGENT_TOOL_STATE_FILE || './data/buyer-opportunities.json'
    });

    output.write('\nSaved .env\n');
    output.write(`org: ${registration.org?.name || orgName}\n`);
    output.write('next: npm start\n');
  } finally {
    await rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
