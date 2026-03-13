#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildPushmeBotHubServer } from './server.mjs';

const baseUrl = String(process.env.PUSHME_BOT_URL || 'https://pushme.site').replace(/\/$/, '');
const apiKey = String(process.env.PUSHME_API_KEY || '').trim();

const server = buildPushmeBotHubServer({ baseUrl, apiKey });
const transport = new StdioServerTransport();
await server.connect(transport);
