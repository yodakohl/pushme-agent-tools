import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createPushmeRequestClient({ baseUrl = 'https://pushme.site', apiKey = '' } = {}) {
  const normalizedBaseUrl = String(baseUrl || 'https://pushme.site').replace(/\/$/, '');
  const normalizedApiKey = String(apiKey || '').trim();

  async function request(path, options = {}) {
    const headers = {
      'content-type': 'application/json',
      ...(options.headers || {})
    };
    if (options.auth !== false) {
      if (!normalizedApiKey) {
        throw new Error('Missing PUSHME_API_KEY');
      }
      headers.authorization = `Bearer ${normalizedApiKey}`;
    }
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body == null ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      throw new Error(`PushMe API ${response.status}: ${JSON.stringify(json)}`);
    }
    return json;
  }

  return { request, baseUrl: normalizedBaseUrl, apiKey: normalizedApiKey };
}

function jsonResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

export function buildPushmeBotHubServer({ baseUrl = 'https://pushme.site', apiKey = '' } = {}) {
  const client = createPushmeRequestClient({ baseUrl, apiKey });
  const server = new McpServer({
    name: 'pushme-bot-hub',
    version: '0.1.0'
  });

  server.registerTool(
    'get_hub_overview',
    {
      title: 'Get PushMe Bot Hub overview',
      description: 'Read public PushMe Bot Hub marketplace data: publishers, event types, and recent published events.',
      inputSchema: {
        limitRecentEvents: z.number().int().min(1).max(24).default(12)
      }
    },
    async ({ limitRecentEvents = 12 }) => {
      const data = await client.request('/api/bot/hub', { auth: false });
      return jsonResult({
        mode: data.mode,
        publishers: data.publishers,
        eventTypes: data.eventTypes,
        recentEvents: Array.isArray(data.recentEvents) ? data.recentEvents.slice(0, limitRecentEvents) : []
      });
    }
  );

  server.registerTool(
    'get_netnode_quickstart',
    {
      title: 'Get netnode quickstart',
      description:
        'Read the agent-first quickstart for running a netnode publisher, including current coverage gaps, bootstrap commands, and relevant URLs.',
      inputSchema: {}
    },
    async () => jsonResult(await client.request('/api/bot/netnode/quickstart', { auth: false }))
  );

  server.registerTool(
    'preview_netnode_coverage',
    {
      title: 'Preview netnode coverage value',
      description:
        'Estimate whether a candidate node adds useful country, provider, ASN, or network-type coverage before or during setup.',
      inputSchema: {
        location: z.string().min(2).max(120).optional(),
        countryCode: z.string().min(2).max(8).optional(),
        country: z.string().min(2).max(120).optional(),
        region: z.string().min(2).max(120).optional(),
        city: z.string().min(2).max(120).optional(),
        provider: z.string().min(2).max(160).optional(),
        asn: z.number().int().positive().optional(),
        networkType: z.string().min(2).max(80).optional()
      }
    },
    async (input) => jsonResult(await client.request('/api/bot/netnode/coverage-preview', { method: 'POST', auth: false, body: input }))
  );

  server.registerTool(
    'register_bot_org',
    {
      title: 'Register a bot org on PushMe',
      description: 'Create or reactivate a PushMe Bot Hub org and return an API key. Email is optional for unclaimed bots.',
      inputSchema: {
        orgName: z.string().min(2).max(120),
        role: z.enum(['publisher', 'subscriber', 'both']).default('both'),
        websiteUrl: z.string().url().optional(),
        description: z.string().min(12).max(500).optional(),
        email: z.string().email().optional()
      }
    },
    async ({ orgName, role = 'both', websiteUrl, description, email }) => {
      const data = await client.request('/api/bot/register', {
        method: 'POST',
        auth: false,
        body: { orgName, role, websiteUrl, description, email }
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'publish_event',
    {
      title: 'Publish a structured event',
      description: 'Publish a machine-readable event into PushMe Bot Hub using the configured auth context. Best current fit: price drops, discounts, stock availability, and launch availability.',
      inputSchema: {
        eventType: z.string().min(3).max(80),
        topic: z.string().min(2).max(120).optional(),
        title: z.string().min(8).max(220),
        summary: z.string().min(16).max(2400),
        body: z.string().min(16).max(12000).optional(),
        sourceUrl: z.string().url().optional(),
        externalId: z.string().min(2).max(120).optional(),
        tags: z.array(z.string().min(2).max(40)).max(12).optional(),
        metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe(
          'For commercial events include productName, brand, store, category, sku, region, currency, priceCurrent, pricePrevious, discountPct, inStock, expiryAt.'
        )
      }
    },
    async (input) => jsonResult(await client.request('/api/bot/publish', { method: 'POST', body: input }))
  );

  server.registerTool(
    'subscribe_to_events',
    {
      title: 'Subscribe to PushMe event stream',
      description: 'Create or update a PushMe event subscription for the configured org. Supports generic tags/keywords plus structured deal filters like brand, store, price ceiling, discount floor, and stock state.',
      inputSchema: {
        eventType: z.string().min(3).max(80),
        topic: z.string().min(2).max(120).optional(),
        filters: z.object({
          tags: z.array(z.string().min(2).max(40)).max(12).optional(),
          keywords: z.array(z.string().min(2).max(60)).max(12).optional(),
          brands: z.array(z.string().min(1).max(160)).max(12).optional(),
          stores: z.array(z.string().min(1).max(160)).max(12).optional(),
          categories: z.array(z.string().min(1).max(160)).max(12).optional(),
          productNames: z.array(z.string().min(1).max(160)).max(12).optional(),
          skus: z.array(z.string().min(1).max(80)).max(12).optional(),
          regions: z.array(z.string().min(1).max(80)).max(12).optional(),
          priceMax: z.number().nonnegative().optional(),
          discountMinPct: z.number().min(0).max(100).optional(),
          inStock: z.boolean().optional()
        }).optional()
      }
    },
    async (input) => jsonResult(await client.request('/api/bot/subscribe', { method: 'POST', body: input }))
  );

  server.registerTool(
    'list_subscriptions',
    {
      title: 'List subscriptions',
      description: 'List active subscriptions for the configured PushMe org.',
      inputSchema: {}
    },
    async () => jsonResult(await client.request('/api/bot/subscriptions'))
  );

  server.registerTool(
    'get_subscribed_events',
    {
      title: 'Get subscribed events',
      description: 'Fetch published events that match this org\'s subscriptions.',
      inputSchema: {
        sinceId: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(25)
      }
    },
    async ({ sinceId = 0, limit = 25 }) => {
      const data = await client.request(`/api/bot/subscribed-events?sinceId=${sinceId}&limit=${limit}`);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'get_balance',
    {
      title: 'Get org balance and trust',
      description: 'Read org trust score, credits balance, and rate-limit mode for the configured PushMe org.',
      inputSchema: {}
    },
    async () => jsonResult(await client.request('/api/bot/balance'))
  );

  server.registerTool(
    'get_credit_ledger',
    {
      title: 'Get credit ledger',
      description: 'Read recent credit events for the configured PushMe org.',
      inputSchema: {}
    },
    async () => jsonResult(await client.request('/api/bot/credits'))
  );

  server.registerTool(
    'get_netnode_status',
    {
      title: 'Get netnode publisher status',
      description:
        'Read authenticated netnode status for the configured org: current credits, unique coverage contribution, and recent connectivity events.',
      inputSchema: {}
    },
    async () => jsonResult(await client.request('/api/bot/netnode/status'))
  );

  server.registerPrompt(
    'publish_product_update',
    {
      title: 'Publish product update',
      description: 'Template for turning a confirmed product or pricing update into a PushMe event.'
    },
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              'Use publish_event with eventType like product_release, pricing_change, maintenance_window, or outage_update. Include a sourceUrl when available and add tags that make downstream filtering easier.'
          }
        }
      ]
    })
  );

  server.registerResource(
    'pushme-docs',
    'docs://pushme/bot-hub',
    {
      title: 'PushMe Bot Hub docs',
      description: 'Canonical docs and machine-readable links for PushMe Bot Hub.',
      mimeType: 'application/json'
    },
    async () => ({
      contents: [
        {
          uri: 'docs://pushme/bot-hub',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              botHubDocs: `${client.baseUrl}/bot-api`,
              openApi: `${client.baseUrl}/openapi/pushme-bot-hub.yaml`,
              recommendedCommercialEventTypes: [
                'price.dropped',
                'discount.started',
                'discount.changed',
                'stock.available',
                'stock.low',
                'launch.available'
              ],
              fundingExample: `${client.baseUrl}/internet-health-map`,
              netnodePage: `${client.baseUrl}/netnode`,
              netnodeQuickstart: `${client.baseUrl}/netnode-agent.json`,
              githubRepository: 'https://github.com/yodakohl/pushme-agent-tools',
              mcpSourceDirectory: 'https://github.com/yodakohl/pushme-agent-tools/tree/main/mcp/pushme-bot-hub-mcp',
              remoteEndpoint: `${client.baseUrl}/mcp`
            },
            null,
            2
          )
        }
      ]
    })
  );

  return server;
}
