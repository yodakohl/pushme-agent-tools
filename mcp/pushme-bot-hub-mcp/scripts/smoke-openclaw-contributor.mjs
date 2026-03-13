#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

const baseUrl = String(process.env.PUSHME_BOT_URL || 'https://pushme.site').replace(/\/$/, '');
const mcpUrl = new URL(`${baseUrl}/mcp`);
const runFlag = String(process.env.PUSHME_RUN_PRODUCTION_SMOKE || '').trim();

if (runFlag !== '1') {
  console.error('Refusing to run. Set PUSHME_RUN_PRODUCTION_SMOKE=1 to execute the production smoke test.');
  process.exit(1);
}

async function connectClient(apiKey = '') {
  const client = new Client({
    name: 'pushme-openclaw-smoke',
    version: '0.1.0'
  });
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: apiKey
      ? {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        }
      : undefined
  });
  await client.connect(transport);
  return { client, transport };
}

async function callTool(client, name, args) {
  const result = await client.request(
    {
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    },
    CallToolResultSchema
  );

  const textItem = Array.isArray(result.content) ? result.content.find((item) => item.type === 'text') : null;
  if (!textItem || typeof textItem.text !== 'string') {
    throw new Error(`Tool ${name} returned no text payload`);
  }
  try {
    return JSON.parse(textItem.text);
  } catch (error) {
    throw new Error(`Tool ${name} returned non-JSON text: ${textItem.text}`);
  }
}

async function main() {
  const smokeId = `openclaw-smoke-${Date.now()}`;

  const unauthenticated = await connectClient();
  let registerResult;
  try {
    registerResult = await callTool(unauthenticated.client, 'register_bot_org', {
      orgName: 'PushMe OpenClaw Smoke Publisher',
      role: 'publisher',
      websiteUrl: 'https://pushme.site/openclaw-contributor.json',
      description: 'Production smoke publisher for the OpenClaw contributor quickstart.'
    });
  } finally {
    await unauthenticated.client.close();
  }

  const apiKey = String(registerResult?.apiKey || '').trim();
  if (!apiKey) {
    throw new Error(`register_bot_org returned no apiKey: ${JSON.stringify(registerResult)}`);
  }

  const authenticated = await connectClient(apiKey);
  let publishResult;
  try {
    publishResult = await callTool(authenticated.client, 'publish_event', {
      eventType: 'stock.available',
      topic: 'openclaw-smoke-tests',
      title: 'OpenClaw contributor smoke test stock event',
      summary: 'Production smoke test for register_bot_org plus publish_event via PushMe MCP using a compliant commercial event.',
      sourceUrl: 'https://pushme.site/openclaw-contributor.json',
      externalId: smokeId,
      tags: ['openclaw', 'smoke-test', 'mcp'],
      metadata: {
        channel: 'openclaw',
        kind: 'smoke_test',
        ephemeral: true,
        smokeId,
        productName: 'PushMe OpenClaw Smoke Fixture',
        brand: 'PushMe',
        store: 'PushMe Lab',
        category: 'Integration',
        currency: 'USD',
        inStock: true
      }
    });
  } finally {
    await authenticated.client.close();
  }

  const eventId = Number(publishResult?.id ?? 0) || 0;
  if (!eventId) {
    throw new Error(`publish_event returned no event id: ${JSON.stringify(publishResult)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        smokeId,
        orgId: registerResult?.org?.id ?? null,
        eventId,
        eventType: publishResult?.eventType ?? null,
        createdAt: publishResult?.createdAt ?? null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
