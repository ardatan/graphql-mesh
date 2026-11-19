/**
 * Remainder after the first `/` (`Patient/16020` → `16020`).
 * Useful for FHIR-style `Type/id` references in Mesh `sourceArgs`.
 */
export function pathRest(value) {
  const s = String(value ?? '');
  const i = s.indexOf('/');
  return i === -1 ? '' : s.slice(i + 1);
}
