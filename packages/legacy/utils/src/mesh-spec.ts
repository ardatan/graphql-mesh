/**
 * Origin for Mesh protocol `@link` URLs (Apollo-style `specs.*.com/<name>/<version>`).
 * Per-loader stamps enable independent directive-schema versioning.
 */
export const MESH_SPECS_ORIGIN = 'https://specs.graphql-mesh.com';

/** Strip leading/trailing `/` without regex (avoids ReDoS on long `/` runs). */
function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 47 /* / */) {
    start += 1;
  }
  while (end > start && value.charCodeAt(end - 1) === 47 /* / */) {
    end -= 1;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}

/**
 * Build a Mesh-spec `@link` URL, e.g. `https://specs.graphql-mesh.com/thrift/v0.1`.
 */
export function meshSpecUrl(protocol: string, version = 'v0.1'): string {
  const name = trimSlashes(protocol);
  const ver = version.startsWith('v') ? version : `v${version}`;
  return `${MESH_SPECS_ORIGIN}/${name}/${ver}`;
}

/**
 * Mesh **core** `@link` for shared directives (`@transport`, `@merge`, `@source` /
 * `@meshSource`, `@resolveTo`, `@pubsubOperation`, `@pubsubPublish`, …).
 * Protocol loaders use {@link meshSpecUrl} for protocol-only dirs (`sql`, `thrift`, …)
 * and this URL for core dirs.
 */
export const MESH_SPEC_URL = meshSpecUrl('core');

/** Alias of {@link MESH_SPEC_URL} (`https://specs.graphql-mesh.com/core/v0.1`). */
export const MESH_CORE_SPEC_URL = MESH_SPEC_URL;

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
