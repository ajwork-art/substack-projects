export function generateCorrelationId(prefix = 'run') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
