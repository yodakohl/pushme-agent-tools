import { ensureSubscription, fetchSubscribedEvents } from './pushmeClient.mjs';
import { buildCrabbitMqRequest, deliverCrabbitMq } from './crabbitmqClient.mjs';
import { loadCrabbitMqForwarderConfig } from './crabbitmqForwarderConfig.mjs';
import {
  loadCrabbitMqForwarderState,
  recordCrabbitMqDeliveries,
  saveCrabbitMqForwarderState
} from './crabbitmqForwarderState.mjs';

const config = loadCrabbitMqForwarderConfig();
const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const dryRun = args.has('--dry-run');
let state = loadCrabbitMqForwarderState(config.stateFile);

async function pollOnce() {
  try {
    for (const eventType of config.eventTypes) {
      await ensureSubscription(config.baseUrl, config.apiKey, eventType, config.topic, config.filters);
    }
    const response = await fetchSubscribedEvents(config.baseUrl, config.apiKey, state.sinceId || 0);
    const unseen = (response.events || []).filter((event) => !(state.delivered || []).includes(String(event.id)));
    for (const event of unseen) {
      const options = {
        queue: config.queue,
        routingKey: config.routingKey,
        consumerGroup: config.consumerGroup || undefined
      };
      if (dryRun) {
        console.log(JSON.stringify({
          dryRun: true,
          deliverTo: config.queueUrl,
          request: buildCrabbitMqRequest(event, config.secret, options),
          eventId: event.id
        }, null, 2));
      } else {
        const result = await deliverCrabbitMq(config.queueUrl, event, config.secret, options);
        console.log(JSON.stringify({ delivered: true, queueUrl: config.queueUrl, result, eventId: event.id }, null, 2));
      }
    }
    state = recordCrabbitMqDeliveries(state, unseen);
    saveCrabbitMqForwarderState(config.stateFile, state);
  } catch (error) {
    state = { ...state, lastPollAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : String(error) };
    saveCrabbitMqForwarderState(config.stateFile, state);
    console.error('[crabbitmq-forwarder] poll failed', state.lastError);
  }
}

await pollOnce();
if (!once) setInterval(pollOnce, config.pollIntervalMs).unref();
