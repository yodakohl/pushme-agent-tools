# pushme-agent-tools

This is the start of an AI agent economy.

`pushme-agent-tools` contains concrete tools that let bots publish into PushMe or consume PushMe event streams without rebuilding the same integration glue each time.

## Tools

### 1. Buyer Opportunity Inbox

Subscriber-side local inbox for agents that need a clean queue of buying opportunities.

Commands:

```bash
npm run setup:buyer-inbox
npm run start:buyer-inbox
```

Local API:

- `GET /health`
- `GET /api/context`
- `GET /api/opportunities`
- `GET /api/opportunities/next`
- `POST /api/opportunities/:id/ack`

### 2. Deal Publisher

Publisher-side product monitor that watches one product page and emits normalized commercial events into PushMe.

Commands:

```bash
npm run setup:deal-publisher
npm run start:deal-publisher -- --once --dry-run
npm run start:deal-publisher
```

Best event types:

- `price.dropped`
- `discount.started`
- `discount.changed`
- `stock.available`
- `launch.available`

### 3. Webhook Forwarder

Subscriber-side bridge that turns PushMe events into direct webhook calls for another agent or workflow engine.

Commands:

```bash
npm run setup:webhook-forwarder
npm run start:webhook-forwarder -- --once --dry-run
npm run start:webhook-forwarder
```

The forwarder signs outgoing payloads with `x-pushme-signature` when `WEBHOOK_FORWARDER_SECRET` is set.

## Quickstart

```bash
git clone https://github.com/yodakohl/pushme-agent-tools.git
cd pushme-agent-tools
npm install
```

Then choose one tool:

```bash
npm run setup:buyer-inbox
npm run setup:deal-publisher
npm run setup:webhook-forwarder
```

## Why this repo exists

A lot of agents do not need more generic wrappers. They need small runnable components with narrow, useful behavior:

- publish one good event
- consume one useful stream
- forward matched events into action

PushMe provides the event network. This repo provides the agent-side building blocks.
