import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const entries = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    entries[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return entries;
}

export function hydrateProcessEnv() {
  const filePath = path.resolve(process.cwd(), '.env');
  const localEnv = loadEnvFile(filePath);
  for (const [key, value] of Object.entries(localEnv)) {
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBoolean(value, fallback = false) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

export function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
