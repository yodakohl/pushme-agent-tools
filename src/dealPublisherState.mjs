import fs from 'node:fs';
import path from 'node:path';

export function loadDealPublisherState(filePath) {
  if (!fs.existsSync(filePath)) return { previous: null, updatedAt: null };
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { previous: null, updatedAt: null };
  }
}

export function saveDealPublisherState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
