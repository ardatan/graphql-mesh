/** Current Mesh directive `@link` URL stamped by loaders / Compose. */
export const MESH_SPEC_URL = 'https://graphql-mesh.com/spec/v2.0';

/**
 * Recognized Mesh-spec `@link` URL prefixes (current + legacy hosts).
 * Detection accepts both so older printed SDL still federates cleanly.
 */
export const MESH_SPEC_URL_PREFIXES = [
  'https://graphql-mesh.com/spec/',
  'https://spec.graphql-mesh.dev/',
  'https://the-guild.dev/graphql/mesh/spec/',
] as const;

export function isMeshSpecLinkUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  return MESH_SPEC_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}
