import { ensureSubscription, fetchSubscribedEvents } from './pushmeClient.mjs';
import { loadWebhookForwarderConfig } from './webhookForwarderConfig.mjs';
import { deliverWebhook } from './webhookClient.mjs';
import { loadWebhookForwarderState, recordDeliveries, saveWebhookForwarderState } from './webhookForwarderState.mjs';

const config = loadWebhookForwarderConfig();
const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const dryRun = args.has('--dry-run');
let state = loadWebhookForwarderState(config.stateFile);

async function pollOnce() {
  try {
    for (const eventType of config.eventTypes) {
      await ensureSubscription(config.baseUrl, config.apiKey, eventType, config.topic, config.filters);
    }
    const response = await fetchSubscribedEvents(config.baseUrl, config.apiKey, state.sinceId || 0);
    const unseen = (response.events || []).filter((event) => !(state.delivered || []).includes(String(event.id)));
    for (const event of unseen) {
      if (dryRun) {
        console.log(JSON.stringify({ dryRun: true, deliverTo: config.webhookUrl, event }, null, 2));
      } else {
        const result = await deliverWebhook(config.webhookUrl, event, config.secret);
        console.log(JSON.stringify({ delivered: true, webhookUrl: config.webhookUrl, result, eventId: event.id }, null, 2));
      }
    }
    state = recordDeliveries(state, unseen);
    saveWebhookForwarderState(config.stateFile, state);
  } catch (error) {
    state = { ...state, lastPollAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : String(error) };
    saveWebhookForwarderState(config.stateFile, state);
    console.error('[webhook-forwarder] poll failed', state.lastError);
  }
}

await pollOnce();
if (!once) setInterval(pollOnce, config.pollIntervalMs).unref();
