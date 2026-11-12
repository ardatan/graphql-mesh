import {
  getNamedType,
  GraphQLObjectType,
  isInterfaceType,
  isObjectType,
  type GraphQLSchema,
} from 'graphql';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

/**
 * Federation Connectors entity helpers (shared contract).
 *
 * Used by fusion composition (`entity: true` / type-level `$this.<key>`) and by
 * REST loaders (selection stubs like `supplier: { id: supplierId }`) so both
 * sides agree on key/FK naming and stub shape.
 *
 * When a Query field arg name differs from the entity `@key` field (e.g.
 * `getPetById(petId)` → `Pet.id`), `entity: true` is invalid — Connectors
 * require arg names to match key fields. Apollo's pattern for that case is a
 * **type-level** `@connect` using `$this.<keyField>`:
 * https://www.apollographql.com/docs/graphos/connectors/entities/patterns
 *
 * Entity stubs across connectors:
 * https://www.apollographql.com/docs/graphos/connectors/entities/across-subgraphs
 */

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Marker for Connectors entity-stub `__typename: $("…")` fragments (linear scan). */
const ENTITY_STUB_TYPENAME_MARKER = '__typename: $("';

/** Replace `$args.<keyArg>` with `$this.<keyField>` in Connectors path/body/header exprs. */
export function rewriteArgsToThis(value: string, keyArg: string, keyField: string): string {
  if (!value || !keyArg) {
    return value;
  }
  // `$args.petId` and `{$args.petId}` (brace form is covered by the bare replace).
  return value.replaceAll(`$args.${keyArg}`, `$this.${keyField}`);
}

/**
 * Clone a field-level `@connect` into a type-level entity connector:
 * rewrite `$args.<keyArg>` → `$this.<keyField>`, drop `entity`.
 */
export function toTypeLevelEntityConnect(
  connectArgs: Record<string, any>,
  keyArg: string,
  keyField: string,
): Record<string, any> {
  const { entity: _entity, http, ...rest } = connectArgs;
  const nextHttp = http && typeof http === 'object' ? { ...http } : http;
  if (nextHttp && typeof nextHttp === 'object') {
    for (const method of HTTP_METHODS) {
      if (typeof nextHttp[method] === 'string') {
        nextHttp[method] = rewriteArgsToThis(nextHttp[method], keyArg, keyField);
      }
    }
    if (typeof nextHttp.queryParams === 'string') {
      nextHttp.queryParams = rewriteArgsToThis(nextHttp.queryParams, keyArg, keyField);
    }
    if (typeof nextHttp.body === 'string') {
      nextHttp.body = rewriteArgsToThis(nextHttp.body, keyArg, keyField);
    }
    if (Array.isArray(nextHttp.headers)) {
      nextHttp.headers = nextHttp.headers.map((h: any) =>
        h?.value != null
          ? { ...h, value: rewriteArgsToThis(String(h.value), keyArg, keyField) }
          : h,
      );
    }
  }
  return {
    ...rest,
    ...(nextHttp != null ? { http: nextHttp } : {}),
  };
}

/** True when type already has an equivalent type-level connect (same source + HTTP path). */
export function hasEquivalentTypeConnect(
  existing: Array<Record<string, any>> | undefined,
  candidate: Record<string, any>,
): boolean {
  if (!existing?.length) {
    return false;
  }
  const candPath = connectPrimaryPath(candidate);
  return existing.some(c => {
    if ((c.source || '') !== (candidate.source || '')) {
      return false;
    }
    return connectPrimaryPath(c) === candPath;
  });
}

function connectPrimaryPath(connectArgs: Record<string, any>): string {
  const http = connectArgs?.http;
  if (!http || typeof http !== 'object') {
    return '';
  }
  for (const method of HTTP_METHODS) {
    if (typeof http[method] === 'string') {
      return `${method}:${http[method]}`;
    }
  }
  return '';
}

/**
 * From a GET path template, find the entity key field whose `$args.<key>` appears
 * and exists on the return type (e.g. `/customers/{$args.id}` + type field `id`).
 */
export function entityKeyFieldsFromHttpPath(
  path: string,
  typeFieldNames: Iterable<string>,
): string[] | undefined {
  if (!path) {
    return undefined;
  }
  const pathWithoutQuery = path.split('?')[0];
  const fieldSet = typeFieldNames instanceof Set ? typeFieldNames : new Set(typeFieldNames);
  for (const key of fieldSet) {
    // Accept Connectors (`$args.id` / `{$args.id}`) and Mesh OpenAPI (`{args.id}`) forms.
    if (
      pathWithoutQuery.includes(`{$args.${key}}`) ||
      pathWithoutQuery.includes(`$args.${key}`) ||
      pathWithoutQuery.includes(`{args.${key}}`)
    ) {
      return [key];
    }
  }
  return undefined;
}

/**
 * Candidate parent JSON/GraphQL field names for a foreign key next to `fieldName`
 * (e.g. `supplier` → `supplierId`, `supplier_id`, …).
 */
export function parentFkFieldCandidates(fieldName: string, keyField = 'id'): string[] {
  const candidates = [
    `${fieldName}Id`,
    `${fieldName}_id`,
    `${fieldName}ID`,
    `${fieldName}_${keyField}`,
  ];
  if (keyField !== 'id') {
    candidates.push(`${fieldName}${keyField[0].toUpperCase()}${keyField.slice(1)}`);
  }
  return candidates;
}

/**
 * Infer ` { id: supplierId }` style entity-ref map when the parent has a scalar FK
 * beside an entity-typed object field. Composite keys need an explicit link map.
 */
export function inferEntityRefFromParentFkNames(
  parentFieldNames: Iterable<string>,
  fieldName: string,
  keyFields: string[],
): Record<string, string> | undefined {
  if (keyFields.length !== 1) {
    return undefined;
  }
  const keyField = keyFields[0];
  const parentSet = parentFieldNames instanceof Set ? parentFieldNames : new Set(parentFieldNames);
  for (const fromField of parentFkFieldCandidates(fieldName, keyField)) {
    if (parentSet.has(fromField)) {
      return { [keyField]: fromField };
    }
  }
  return undefined;
}

/**
 * Connectors selection fragment for an entity stub:
 * `supplier: { __typename: $("Supplier") id: supplierId }`
 */
export function formatEntityStubSelection(
  fieldName: string,
  entityTypeName: string,
  entityRef: Record<string, string>,
): string {
  const parts = [
    `__typename: $(${JSON.stringify(entityTypeName)})`,
    ...Object.entries(entityRef).map(([keyField, fromField]) =>
      keyField === fromField ? keyField : `${keyField}: ${fromField}`,
    ),
  ];
  return `${fieldName}: { ${parts.join(' ')} }`;
}

/**
 * Parse entity type → key fields from Connectors stub fragments in a selection.
 * Linear `indexOf` scan (no nested/ambiguous regex — avoids ReDoS on large selections).
 */
export function parseEntityStubTypesFromSelection(
  selection: string | undefined | null,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!selection) {
    return out;
  }
  let from = 0;
  while (from < selection.length) {
    const typIdx = selection.indexOf(ENTITY_STUB_TYPENAME_MARKER, from);
    if (typIdx < 0) {
      break;
    }
    const nameStart = typIdx + ENTITY_STUB_TYPENAME_MARKER.length;
    const nameEnd = selection.indexOf('")', nameStart);
    if (nameEnd < 0) {
      break;
    }
    const typeName = selection.slice(nameStart, nameEnd);
    const afterTypename = nameEnd + 2;
    const closeIdx = selection.indexOf('}', afterTypename);
    if (closeIdx < 0) {
      break;
    }
    // Stub body after `__typename: $("Type")` — `id: supplierId` pairs.
    const keyFields = parseStubKeyFields(selection.slice(afterTypename, closeIdx));
    from = closeIdx + 1;
    if (!typeName || !keyFields.length) {
      continue;
    }
    const existing = out.get(typeName);
    if (!existing) {
      out.set(typeName, keyFields);
    } else {
      for (const k of keyFields) {
        if (!existing.includes(k)) {
          existing.push(k);
        }
      }
    }
  }
  return out;
}

/** Extract left-hand names from `id: supplierId sku: sku` stub bodies (O(n)). */
function parseStubKeyFields(body: string): string[] {
  const keyFields: string[] = [];
  let i = 0;
  const isIdentStart = (c: string) =>
    (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
  const isIdent = (c: string) => isIdentStart(c) || (c >= '0' && c <= '9');
  while (i < body.length) {
    while (i < body.length && body.charCodeAt(i) <= 32) {
      i++;
    }
    if (i >= body.length) {
      break;
    }
    if (!isIdentStart(body[i])) {
      i++;
      continue;
    }
    const start = i;
    i++;
    while (i < body.length && isIdent(body[i])) {
      i++;
    }
    const name = body.slice(start, i);
    while (i < body.length && body.charCodeAt(i) <= 32) {
      i++;
    }
    if (body[i] !== ':') {
      continue;
    }
    keyFields.push(name);
    i++; // skip ':'
    while (i < body.length && body.charCodeAt(i) <= 32) {
      i++;
    }
    // Skip value token (identifier / path); stop before next `name:`.
    while (i < body.length && body.charCodeAt(i) > 32 && body[i] !== ':') {
      i++;
    }
  }
  return keyFields;
}

/**
 * Subgraphs that only *reference* an entity via Connectors stubs need
 * `@key(fields: "…", resolvable: false)` so Hive Federation plans `_entities`
 * against the owning subgraph. Apollo Router resolves stubs natively; without
 * the non-resolvable key Hive leaves stub fields (e.g. `supplier.name`) null.
 *
 * Skips types that already have `@key` (resolvable owners from `entity: true`).
 * https://www.apollographql.com/docs/graphos/connectors/entities/across-subgraphs
 */
export function ensureNonResolvableKeysForEntityStubs(schema: GraphQLSchema): GraphQLSchema {
  const stubTypes = new Map<string, string[]>();

  const absorbConnectSelections = (directives: Record<string, any[]> | undefined) => {
    for (const connect of directives?.connect || []) {
      const fromSelection = parseEntityStubTypesFromSelection(connect?.selection);
      for (const [typeName, keyFields] of fromSelection) {
        const existing = stubTypes.get(typeName);
        if (!existing) {
          stubTypes.set(typeName, [...keyFields]);
        } else {
          for (const k of keyFields) {
            if (!existing.includes(k)) {
              existing.push(k);
            }
          }
        }
      }
    }
  };

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    absorbConnectSelections(getDirectiveExtensions(type));
    for (const field of Object.values(type.getFields())) {
      absorbConnectSelections(getDirectiveExtensions(field));
      const meshEntityRef = (field.extensions as { meshEntityRef?: Record<string, string> } | undefined)
        ?.meshEntityRef;
      if (meshEntityRef && Object.keys(meshEntityRef).length) {
        const named = getNamedType(field.type);
        if (isObjectType(named) || isInterfaceType(named)) {
          const keys = Object.keys(meshEntityRef);
          const existing = stubTypes.get(named.name);
          if (!existing) {
            stubTypes.set(named.name, keys);
          } else {
            for (const k of keys) {
              if (!existing.includes(k)) {
                existing.push(k);
              }
            }
          }
        }
      }
    }
  }

  if (!stubTypes.size) {
    return schema;
  }

  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      const keyFields = stubTypes.get(type.name);
      if (!keyFields?.length) {
        return type;
      }
      const typeDirectives = getDirectiveExtensions(type) || {};
      if (typeDirectives.key?.length) {
        // Owning subgraph already has a resolvable `@key` from `entity: true`.
        return type;
      }
      // Type-level `@connect` means this subgraph can resolve the entity (Hive hydrate /
      // Router entity fill) — use a normal `@key`, not `resolvable: false`.
      const hasTypeConnect = Boolean(typeDirectives.connect?.length);
      typeDirectives.key = [
        {
          fields: keyFields.join(' '),
          ...(hasTypeConnect ? {} : { resolvable: false }),
        },
      ];
      const extensions: Record<string, unknown> = { ...(type.extensions || {}) };
      extensions.directives = typeDirectives;
      return new GraphQLObjectType({
        ...type.toConfig(),
        extensions,
        astNode: undefined,
      });
    },
  });
}
