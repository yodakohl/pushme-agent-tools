import { loadDealPublisherConfig } from './dealPublisherConfig.mjs';
import { fetchProductSnapshot, buildDealEventPayload } from './dealPublisher.mjs';
import { loadDealPublisherState, saveDealPublisherState } from './dealPublisherState.mjs';
import { publishEvent } from './pushmeClient.mjs';

const config = loadDealPublisherConfig();
const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const dryRun = args.has('--dry-run');

async function runOnce() {
  const state = loadDealPublisherState(config.stateFile);
  const previous = state.previous ?? null;
  const snapshot = await fetchProductSnapshot(config);
  const payload = buildDealEventPayload(config, snapshot, previous);
  if (!payload) {
    console.log(JSON.stringify({ changed: false, reason: 'no publishable change', snapshot }, null, 2));
    saveDealPublisherState(config.stateFile, { previous: snapshot, updatedAt: new Date().toISOString() });
    return;
  }
  const shouldPublish = config.publishMode === 'snapshot' || previous || payload.eventType !== 'launch.available';
  if (!shouldPublish) {
    console.log(JSON.stringify({ changed: false, reason: 'initial snapshot stored without publish', snapshot }, null, 2));
    saveDealPublisherState(config.stateFile, { previous: snapshot, updatedAt: new Date().toISOString() });
    return;
  }
  if (dryRun) console.log(JSON.stringify({ dryRun: true, payload }, null, 2));
  else console.log(JSON.stringify({ published: true, result: await publishEvent(config.pushmeBotUrl, config.pushmeApiKey, payload), payload }, null, 2));
  saveDealPublisherState(config.stateFile, { previous: snapshot, updatedAt: new Date().toISOString() });
}

async function loop() {
  try {
    await runOnce();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  if (!once) setTimeout(loop, config.intervalMs);
}

loop().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
