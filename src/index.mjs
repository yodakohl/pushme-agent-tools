import { loadConfig } from './config.mjs';
import { ensureSubscription, fetchSubscribedEvents } from './pushmeClient.mjs';
import { createServer } from './server.mjs';
import { loadState, reduceEvents, saveState } from './state.mjs';

const config = loadConfig();
if (!config.apiKey) {
  console.error('Missing PUSHME_API_KEY. Run `npm run setup` first.');
  process.exit(1);
}

let state = loadState(config.stateFile);
const runtime = {
  config,
  getState: () => state,
  setState: (next) => { state = next; }
};

async function pollOnce() {
  try {
    for (const eventType of config.eventTypes) {
      await ensureSubscription(config.baseUrl, config.apiKey, eventType, config.topic, config.filters);
    }
    const response = await fetchSubscribedEvents(config.baseUrl, config.apiKey, state.sinceId || 0);
    const nextState = reduceEvents(state, response.events || [], config);
    state = nextState;
    saveState(config.stateFile, state);
    console.log(`[buyer-opportunity-inbox] poll ok events=${(response.events || []).length} open=${state.opportunities.filter((item) => item.status !== 'acknowledged').length}`);
  } catch (error) {
    state = {
      ...state,
      lastPollAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : String(error)
    };
    saveState(config.stateFile, state);
    console.error('[buyer-opportunity-inbox] poll failed', state.lastError);
  }
}

const server = createServer(runtime);
server.listen(config.port, () => {
  console.log(`[buyer-opportunity-inbox] listening on http://localhost:${config.port}`);
});

await pollOnce();
setInterval(pollOnce, config.pollIntervalMs).unref();
