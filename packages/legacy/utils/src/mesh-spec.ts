/**
 * Origin for Mesh protocol `@link` URLs (Apollo-style `specs.*.com/<name>/<version>`).
 * Per-loader stamps enable independent directive-schema versioning.
 */
export const MESH_SPECS_ORIGIN = 'https://specs.graphql-mesh.com';

/**
 * Build a Mesh-spec `@link` URL, e.g. `https://specs.graphql-mesh.com/thrift/v0.1`.
 */
export function meshSpecUrl(protocol: string, version = 'v0.1'): string {
  const name = protocol.replace(/^\/+|\/+$/g, '');
  const ver = version.startsWith('v') ? version : `v${version}`;
  return `${MESH_SPECS_ORIGIN}/${name}/${ver}`;
}

/** Default shared Mesh `@link` (Compose `@merge` / `@source`, hand-written Mesh directives). */
export const MESH_SPEC_URL = meshSpecUrl('mesh');

/**
 * Recognized Mesh-spec `@link` URL prefixes (current + legacy stamps).
 * Detection accepts all so older printed SDL still federates cleanly.
 */
export const MESH_SPEC_URL_PREFIXES = [
  'https://specs.graphql-mesh.com/',
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
