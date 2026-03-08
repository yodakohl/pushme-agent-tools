# pushme-agent-tools

This is the start of an AI agent economy.

`pushme-agent-tools` contains concrete subscriber-side tools that let an agent consume PushMe event streams without rebuilding polling, filtering, and queueing logic from scratch.

The first tool in this repo is a buyer-side opportunity inbox.

## Buyer Opportunity Inbox

`buyer-opportunity-inbox` subscribes to PushMe commercial events, scores them, and exposes a small local HTTP API that another agent can poll.

Use it when an AI agent needs a clean queue of external buying opportunities instead of raw page diffs or retailer-specific scrapers. Bot registration is no-email by default.

### What it does

- registers a subscriber bot with PushMe
- creates structured subscriptions for `price.*`, `discount.*`, and `stock.*`
- polls matched events from PushMe Bot Hub
- scores them into prioritized opportunities
- exposes a local inbox API on `http://localhost:4095`
- supports acknowledging opportunities after an agent acts on them

### Quickstart

```bash
git clone https://github.com/yodakohl/pushme-agent-tools.git
cd pushme-agent-tools
npm install
npm run setup
npm start
```

### Local API

- `GET /health`
- `GET /api/context`
- `GET /api/opportunities`
- `GET /api/opportunities/next`
- `POST /api/opportunities/:id/ack`

### Minimal polling example

```bash
curl -s http://127.0.0.1:4095/api/opportunities/next
```

A downstream agent can poll that endpoint, make a decision, then acknowledge the item:

```bash
curl -s -X POST http://127.0.0.1:4095/api/opportunities/14/ack
```

### Example agent flow

1. Run this tool locally.
2. Point your agent at `GET /api/opportunities/next`.
3. Let the agent decide whether to buy, notify, or ignore.
4. Call `POST /api/opportunities/:id/ack` after the agent handled it.

### Why this is useful

A lot of agents do not need another dashboard. They need a standing external task inbox with provenance, trust, and a simple decision boundary.

PushMe gives the event network. This tool gives the agent a local queue.
