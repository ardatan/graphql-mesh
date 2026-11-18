/**
 * Origin for Mesh protocol `@link` URLs (Apollo-style `specs.*.com/<name>/<version>`).
 * Per-loader stamps enable independent directive-schema versioning.
 */
export const MESH_SPECS_ORIGIN = 'https://specs.graphql-mesh.com';

/** Versions this Mesh release supports for modern `specs.graphql-mesh.com` URLs. */
export const MESH_SUPPORTED_SPEC_VERSIONS = ['v0.1'] as const;

/**
 * Shared Mesh **core** directives stamped under {@link MESH_CORE_SPEC_URL}
 * (except `@source` — see {@link MESH_GATEWAY_SOURCE_SPEC_URL}).
 */
export const MESH_CORE_DIRECTIVES = [
  '@transport',
  '@merge',
  '@source',
  '@resolveTo',
  '@pubsubOperation',
  '@pubsubPublish',
  '@hoist',
  '@extraSchemaDefinitionDirective',
] as const;

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
 * Mesh **core** `@link` for shared directives (`@transport`, `@merge`, `@hoist`,
 * `@resolveTo`, `@pubsubOperation`, `@pubsubPublish`, `@extraSchemaDefinitionDirective`, …).
 * Protocol loaders use {@link meshSpecUrl} for protocol-only dirs (`sql`, `thrift`, …)
 * and this URL for core dirs.
 *
 * **`@source` exception:** Hive Gateway currently resolves stitching `@source` only from
 * {@link MESH_GATEWAY_SOURCE_SPEC_URL} — stamp `@source` there until Gateway is updated.
 */
export const MESH_SPEC_URL = meshSpecUrl('core');

/** Alias of {@link MESH_SPEC_URL} (`https://specs.graphql-mesh.com/core/v0.1`). */
export const MESH_CORE_SPEC_URL = MESH_SPEC_URL;

/**
 * Hive Gateway (`@graphql-mesh/fusion-runtime`) currently resolves Mesh stitching
 * `@source` / `@meshSource` **only** when imported from this exact URL.
 *
 * TODO(hive-gateway): once Gateway accepts {@link MESH_CORE_SPEC_URL} for `@source`,
 * stamp `@source` under `core/v0.1` and remove / deprecate this constant.
 */
export const MESH_GATEWAY_SOURCE_SPEC_URL = 'https://the-guild.dev/graphql/mesh/spec/v1.0';

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

export interface ParsedMeshSpecUrl {
  /** Spec name segment (`core`, `sql`, `thrift`, …). Legacy Guild source URL maps to `core`. */
  name: string;
  /** Version string including leading `v` when present (`v0.1`, `v1.0`). */
  version: string;
  url: string;
  /** True for Guild / legacy Mesh URLs outside `specs.graphql-mesh.com`. */
  legacy: boolean;
}

/**
 * Parse a Mesh `@link` URL into `{ name, version }`.
 * Returns `null` when the URL is not a recognized Mesh-spec link.
 */
export function parseMeshSpecUrl(url: string | null | undefined): ParsedMeshSpecUrl | null {
  if (typeof url !== 'string' || !isMeshSpecLinkUrl(url)) {
    return null;
  }
  // Modern: https://specs.graphql-mesh.com/<name>/vX.Y
  if (url.startsWith(MESH_SPECS_ORIGIN + '/')) {
    const rest = url.slice(MESH_SPECS_ORIGIN.length + 1);
    let end = rest.length;
    while (end > 0 && rest.charCodeAt(end - 1) === 47 /* / */) {
      end -= 1;
    }
    const trimmed = rest.slice(0, end);
    const slash = trimmed.indexOf('/');
    if (slash <= 0 || slash === trimmed.length - 1) {
      return null;
    }
    const name = trimmed.slice(0, slash);
    let version = trimmed.slice(slash + 1);
    // Drop trailing path segments if any
    const nextSlash = version.indexOf('/');
    if (nextSlash >= 0) {
      version = version.slice(0, nextSlash);
    }
    if (!name || !/^v?\d+\.\d+$/.test(version)) {
      return null;
    }
    return {
      name,
      version: version.startsWith('v') ? version : `v${version}`,
      url,
      legacy: false,
    };
  }
  // Legacy Guild / graphql-mesh.com / spec.graphql-mesh.dev → treat as core
  const versionMatch = url.match(/\/(v\d+(?:\.\d+)?)\/?$/);
  const version = versionMatch?.[1] || 'v1.0';
  return {
    name: 'core',
    version: version.includes('.') ? version : `${version}.0`,
    url,
    legacy: true,
  };
}

export type MeshSpecLinkArgs = {
  url?: string;
  import?: unknown[];
};

export interface AssertSupportedMeshSpecOptions {
  /** Spec name to require, e.g. `core`, `sql`. */
  name: string;
  /** Supported modern versions (e.g. {@link MESH_SUPPORTED_SPEC_VERSIONS}). */
  supportedVersions: readonly string[];
  /** Schema `@link` directive args from `getDirectiveExtensions(schema).link`. */
  links?: MeshSpecLinkArgs[] | null;
  /**
   * When true, missing link is an error. When false, returns `undefined` if absent
   * (still errors on unsupported version when a matching link exists).
   */
  required?: boolean;
  /** Label for error messages (`@graphql-mesh/transport-sql`, `compose`, …). */
  consumer?: string;
  /**
   * Accept {@link MESH_GATEWAY_SOURCE_SPEC_URL} (and other legacy Mesh URLs) as a
   * valid `core` link. Default true for `name === 'core'`.
   */
  acceptLegacyCore?: boolean;
}

/**
 * Ensure `@link` imports include a supported Mesh spec for `name`.
 * Transports / Compose / (later) Hive Gateway call this when reading a schema.
 */
export function assertSupportedMeshSpec(
  options: AssertSupportedMeshSpecOptions,
): ParsedMeshSpecUrl | undefined {
  const {
    name,
    supportedVersions,
    links,
    required = false,
    consumer = 'Mesh',
    acceptLegacyCore = name === 'core',
  } = options;
  const list = Array.isArray(links) ? links : [];
  const matches: ParsedMeshSpecUrl[] = [];
  for (const link of list) {
    const parsed = parseMeshSpecUrl(link?.url);
    if (!parsed || parsed.name !== name) {
      continue;
    }
    if (parsed.legacy && !acceptLegacyCore) {
      continue;
    }
    matches.push(parsed);
  }
  if (matches.length === 0) {
    if (required) {
      throw new Error(
        `${consumer}: missing Mesh @link for spec "${name}". ` +
          `Expected ${meshSpecUrl(name, supportedVersions[0] || 'v0.1')} ` +
          `(supported: ${supportedVersions.join(', ')}).`,
      );
    }
    return undefined;
  }
  // Prefer a modern supported version; otherwise validate whatever we found.
  const modernSupported = matches.find(
    m => !m.legacy && supportedVersions.includes(m.version),
  );
  if (modernSupported) {
    return modernSupported;
  }
  const legacyOk = acceptLegacyCore ? matches.find(m => m.legacy) : undefined;
  if (legacyOk) {
    return legacyOk;
  }
  const found = matches.map(m => m.url).join(', ');
  throw new Error(
    `${consumer}: unsupported Mesh spec "${name}" version. ` +
      `Supported: ${supportedVersions.join(', ')}. Found: ${found}.`,
  );
}
