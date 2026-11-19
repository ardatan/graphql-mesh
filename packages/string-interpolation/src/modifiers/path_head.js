/**
 * First `/`-separated segment (`Patient/16020` → `Patient`).
 * Useful for FHIR-style `Type/id` references in Mesh `sourceArgs`.
 */
export function pathHead(value) {
  const s = String(value ?? '');
  const i = s.indexOf('/');
  return i === -1 ? s : s.slice(0, i);
}
