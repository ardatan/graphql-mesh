import type { GraphQLSchema } from 'graphql';
import { getDirectiveExtensions, mapSchema, MapperKind } from '@graphql-tools/utils';
import {
  assertSupportedMeshSpec,
  MESH_SUPPORTED_SPEC_VERSIONS,
  parseMeshSpecUrl,
  type MeshSpecLinkArgs,
} from './mesh-spec.js';

export interface ValidateMeshDirectivesOptions {
  /** Label for error messages. */
  consumer?: string;
  /**
   * When true, require a Mesh `core` `@link` if any Mesh core directive is used.
   * @default true
   */
  requireCoreLinkForUsages?: boolean;
  /**
   * Soft mode: do not require a Mesh `core` `@link` when usages are present
   * (unified-graph extract may omit links). Shape / unsupported-version errors
   * still throw.
   * @default false
   */
  soft?: boolean;
}

export interface MeshDirectiveValidationIssue {
  message: string;
  directive?: string;
}

/** Directives that are always Mesh (never Apollo Connectors). */
const MESH_CORE_USAGE_NAMES = new Set([
  'transport',
  'merge',
  'meshSource',
  'resolveTo',
  'pubsubOperation',
  'pubsubPublish',
  'hoist',
  'extraSchemaDefinitionDirective',
]);

/** Mesh stitching `@source` has `subgraph:`; Apollo Connectors `@source` has `http:`. */
function isMeshStitchingSourceArgs(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { subgraph?: unknown }).subgraph === 'string'
  );
}

/**
 * Validate Mesh directive **syntax / contract** on a subgraph or unified schema.
 *
 * First slice (GM-37):
 * - `@link` Mesh spec URLs parse + supported versions (`assertSupportedMeshSpec`)
 * - `@transport` shape: required non-empty `kind` string; `subgraph`/`location` strings when present
 * - `@hoist.pathConfig` must be an array when present
 * - If Mesh core dirs are used, a `core` (or legacy) Mesh `@link` should exist
 *
 * Throws on the first hard error unless `soft: true` (returns issues).
 */
export function validateMeshDirectives(
  schema: GraphQLSchema,
  options: ValidateMeshDirectivesOptions = {},
): MeshDirectiveValidationIssue[] {
  const consumer = options.consumer || 'Mesh';
  const soft = options.soft === true;
  const requireCoreLinkForUsages =
    options.requireCoreLinkForUsages !== false && !soft;
  const issues: MeshDirectiveValidationIssue[] = [];

  const fail = (message: string, directive?: string) => {
    const issue = { message: `${consumer}: ${message}`, directive };
    issues.push(issue);
    throw new Error(issue.message);
  };

  const schemaDirs = getDirectiveExtensions(schema) || {};
  const links = (schemaDirs.link || []) as MeshSpecLinkArgs[];

  // Spec URL contract: every Mesh `@link` must parse; unsupported versions error.
  for (const link of links) {
    const url = link?.url;
    if (typeof url !== 'string') continue;
    const parsed = parseMeshSpecUrl(url);
    if (!parsed) {
      // Non-Mesh links (Apollo federation/connect/join) — ignore.
      continue;
    }
    try {
      assertSupportedMeshSpec({
        name: parsed.name,
        supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
        links: [link],
        required: true,
        consumer,
        acceptLegacyCore: true,
      });
    } catch (err) {
      fail((err as Error).message.replace(/^[^:]+:\s*/, ''), parsed.name);
    }
  }

  // @transport usages (schema extensions + SCHEMA directive apps via extensions).
  const transports = asArray(schemaDirs.transport);
  for (const transport of transports) {
    validateTransportArgs(transport, fail);
  }

  // Also scan type/field extensions for mistakenly placed @transport (should be SCHEMA-only).
  let sawCoreUsage = transports.length > 0;
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      const dirs = getDirectiveExtensions(type) || {};
      for (const name of Object.keys(dirs) as string[]) {
        if (MESH_CORE_USAGE_NAMES.has(name)) {
          sawCoreUsage = true;
        }
        if (name === 'transport') {
          fail(`@transport is SCHEMA-only; found on type "${type.name}"`, 'transport');
        }
      }
      return type;
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const dirs = getDirectiveExtensions(fieldConfig) || {};
      for (const name of Object.keys(dirs) as string[]) {
        if (MESH_CORE_USAGE_NAMES.has(name)) {
          sawCoreUsage = true;
        }
        if (name === 'transport') {
          fail(
            `@transport is SCHEMA-only; found on field "${typeName}.${fieldName}"`,
            'transport',
          );
        }
      }
      // Validate `@hoist(pathConfig:)` when present (arg is `pathConfig`, not `path`).
      for (const hoist of asArray(dirs.hoist)) {
        if (!hoist || typeof hoist !== 'object') continue;
        if (hoist.pathConfig == null) continue;
        if (!Array.isArray(hoist.pathConfig)) {
          fail(
            `@hoist.pathConfig must be an array on ${typeName}.${fieldName}`,
            'hoist',
          );
        }
      }
      return fieldConfig;
    },
  });

  // Schema-level Mesh dirs also count as usage
  for (const name of Object.keys(schemaDirs) as string[]) {
    if (MESH_CORE_USAGE_NAMES.has(name)) {
      sawCoreUsage = true;
    }
  }
  for (const src of asArray(schemaDirs.source)) {
    if (isMeshStitchingSourceArgs(src)) {
      sawCoreUsage = true;
    }
  }

  if (requireCoreLinkForUsages && sawCoreUsage) {
    try {
      assertSupportedMeshSpec({
        name: 'core',
        supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
        links,
        required: true,
        consumer,
        acceptLegacyCore: true,
      });
    } catch (err) {
      fail(
        `Mesh core directives are used but no supported core @link was found. ${
          (err as Error).message
        }`,
        'core',
      );
    }
  }

  return issues;
}

function validateTransportArgs(
  transport: Record<string, unknown> | null | undefined,
  fail: (message: string, directive?: string) => void,
) {
  if (transport == null || typeof transport !== 'object') {
    fail('@transport args must be an object', 'transport');
    return;
  }
  if (transport.kind == null || transport.kind === '') {
    fail('@transport.kind is required', 'transport');
  } else if (typeof transport.kind !== 'string') {
    fail('@transport.kind must be a string', 'transport');
  }
  if (transport.subgraph != null && typeof transport.subgraph !== 'string') {
    fail('@transport.subgraph must be a string', 'transport');
  }
  if (transport.location != null && typeof transport.location !== 'string') {
    fail('@transport.location must be a string', 'transport');
  }
  if (
    transport.options != null &&
    (typeof transport.options !== 'object' || Array.isArray(transport.options))
  ) {
    fail('@transport.options must be an object', 'transport');
  }
  if (transport.headers != null && !Array.isArray(transport.headers)) {
    fail('@transport.headers must be an array', 'transport');
  }
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
