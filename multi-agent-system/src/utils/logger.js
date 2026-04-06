export function logEvent(label, payload) {
  const entry = { label, payload, ts: new Date().toISOString() };
  console.log(JSON.stringify(entry, null, 2));
  return entry;
}
