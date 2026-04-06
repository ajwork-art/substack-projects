import { readJson, writeJson } from './json-store.js';

export function appendEvidence(event) {
  const evidence = readJson('evidence.json');
  evidence.push({ ...event, ts: new Date().toISOString() });
  writeJson('evidence.json', evidence);
}

export function appendHandoff(handoff) {
  const handoffs = readJson('handoffs.json');
  handoffs.push({ ...handoff, ts: new Date().toISOString() });
  writeJson('handoffs.json', handoffs);
}
