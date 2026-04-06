export function validateScopeAtBoundary(context, allowedFields) {
  const keys = Object.keys(context);
  const disallowed = keys.filter(k => !allowedFields.includes(k));
  return {
    valid: disallowed.length === 0,
    disallowed
  };
}
