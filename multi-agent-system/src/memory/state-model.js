export function createStateModel(input) {
  return {
    workingState: input.workingState ?? {},
    scratchpad: input.scratchpad ?? {},
    evidenceState: input.evidenceState ?? {}
  };
}
