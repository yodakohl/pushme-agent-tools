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
  output.write('PushMe CrabbitMQ forwarder setup\n');
  output.write('Registers a subscriber bot and writes .env for queue delivery.\n\n');
  const baseUrl = await ask(rl, args['bot-url'], 'PushMe base URL', existing.PUSHME_BOT_URL || 'https://pushme.site');
  const orgName = await ask(rl, args['org-name'], 'Bot name', existing.CRABBITMQ_FORWARDER_NAME || 'PushMe CrabbitMQ Forwarder');
  const websiteUrl = await ask(rl, args['website-url'], 'Website URL', existing.CRABBITMQ_FORWARDER_WEBSITE_URL || 'https://pushme.site/bot-api');
  const queueUrl = await ask(rl, args['queue-url'], 'CrabbitMQ ingress URL', existing.CRABBITMQ_FORWARDER_URL || '');
  const queue = await ask(rl, args.queue, 'Queue name', existing.CRABBITMQ_FORWARDER_QUEUE || 'external-events');
  const routingKey = await ask(rl, args['routing-key'], 'Routing key', existing.CRABBITMQ_FORWARDER_ROUTING_KEY || 'pushme.event');
  const consumerGroup = await ask(rl, args['consumer-group'], 'Consumer group', existing.CRABBITMQ_FORWARDER_CONSUMER_GROUP || '');
  const eventTypes = await ask(rl, args['event-types'], 'Event types (comma-separated)', existing.CRABBITMQ_FORWARDER_EVENT_TYPES || 'net.*,status.*,policy.*');
  const topic = await ask(rl, args.topic, 'Topic', existing.CRABBITMQ_FORWARDER_TOPIC || '');
  const registration = await registerSubscriber(baseUrl, {
    orgName,
    role: 'subscriber',
    websiteUrl,
    description: 'Pushes matched PushMe events into a CrabbitMQ queue ingress endpoint.'
  });
  writeEnvFile(ENV_PATH, {
    PUSHME_API_KEY: registration.apiKey || '',
    PUSHME_BOT_URL: baseUrl,
    CRABBITMQ_FORWARDER_NAME: orgName,
    CRABBITMQ_FORWARDER_WEBSITE_URL: websiteUrl,
    CRABBITMQ_FORWARDER_EVENT_TYPES: eventTypes,
    CRABBITMQ_FORWARDER_TOPIC: topic,
    CRABBITMQ_FORWARDER_URL: queueUrl,
    CRABBITMQ_FORWARDER_SECRET: existing.CRABBITMQ_FORWARDER_SECRET || '',
    CRABBITMQ_FORWARDER_QUEUE: queue,
    CRABBITMQ_FORWARDER_ROUTING_KEY: routingKey,
    CRABBITMQ_FORWARDER_CONSUMER_GROUP: consumerGroup,
    CRABBITMQ_FORWARDER_POLL_INTERVAL_MS: existing.CRABBITMQ_FORWARDER_POLL_INTERVAL_MS || '60000',
    CRABBITMQ_FORWARDER_STATE_FILE: existing.CRABBITMQ_FORWARDER_STATE_FILE || './data/crabbitmq-forwarder.json'
  });
  output.write('\nSaved .env\n');
  output.write(`org: ${registration.org?.name || orgName}\n`);
  output.write('next: npm run start:crabbitmq-forwarder -- --once --dry-run\n');
} finally {
  await rl.close();
}
