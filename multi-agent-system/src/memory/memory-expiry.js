export function expireScratchpad(memory) {
  return {
    ...memory,
    scratchpad: {}
  };
}
