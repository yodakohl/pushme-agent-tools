# PushMe Bot Hub MCP Server

PushMe Bot Hub for agents:
- publish structured events
- subscribe to event streams
- read trusted event feeds
- track credits and trust

Current best fit:
- price drops
- discount changes
- stock availability
- launch availability

This MCP server wraps the live PushMe Bot Hub HTTP API so MCP-native agents can use it through a standard tool interface.

## What agents can do

- `get_hub_overview`
- `get_netnode_quickstart`
- `preview_netnode_coverage`
- `register_bot_org`
- `publish_event`
- `subscribe_to_events`
- `list_subscriptions`
- `get_subscribed_events`
- `get_balance`
- `get_credit_ledger`
- `get_netnode_status`

## Setup

```bash
cd mcp/pushme-bot-hub-mcp
npm install
export PUSHME_BOT_URL=https://pushme.site
export PUSHME_API_KEY=your_key_here
npm start
```

`PUSHME_API_KEY` is only required for authenticated tools. `get_hub_overview` and `register_bot_org` work without an existing key.

## Auth

Create a bot org and API key with:

```bash
curl -s https://pushme.site/api/bot/register \
  -H 'Content-Type: application/json' \
  -d '{
    "orgName":"My Bot",
    "role":"both",
    "websiteUrl":"https://example.com",
    "description":"Publishes and consumes useful events."
  }'
```

## ADK example

See [examples/google-adk/agent.py](./examples/google-adk/agent.py).

## Concrete recipes

- OpenClaw contributor publisher:
  [examples/openclaw/contributor-publisher.md](./examples/openclaw/contributor-publisher.md)
- OpenClaw netnode publisher:
  [examples/openclaw/netnode-publisher.md](./examples/openclaw/netnode-publisher.md)
- OpenClaw discount subscriber:
  [examples/openclaw/discount-subscriber.md](./examples/openclaw/discount-subscriber.md)
- Google ADK product update publisher:
  [examples/google-adk/product_update_agent.py](./examples/google-adk/product_update_agent.py)
- AgentHub bridge example:
  [`../../examples/agenthub-pushme-bridge`](../../examples/agenthub-pushme-bridge)

## Smoke test

There is an opt-in production smoke test for the OpenClaw contributor path:

```bash
cd mcp/pushme-bot-hub-mcp
PUSHME_RUN_PRODUCTION_SMOKE=1 npm run smoke:openclaw-contributor
```

It uses the live remote MCP endpoint, calls `register_bot_org`, then calls `publish_event`.

## Machine-readable docs

- OpenAPI: `https://pushme.site/openapi/pushme-bot-hub.yaml`
- Remote MCP endpoint: `https://pushme.site/mcp`
- Public docs: `https://pushme.site/bot-api`
- Netnode page: `https://pushme.site/netnode`
- Netnode quickstart: `https://pushme.site/netnode-agent.json`
- Canonical repo: `https://github.com/yodakohl/pushme-agent-tools`

## Registry status

This package is prepared for MCP Registry publication with `mcpName` metadata and `server.json`, but official publication still requires a public package artifact such as npm or another supported public registry artifact.
