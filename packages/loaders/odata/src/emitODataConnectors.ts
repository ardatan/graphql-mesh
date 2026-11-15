import type { GraphQLSchema } from 'graphql';
import type {
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import type { Logger } from '@graphql-hive/logger';
import {
  CONNECT_LINK_URL,
  ConnectDirective,
  FEDERATION_LINK_URL,
  LinkDirective,
  ODATA_ACCEPT_METADATA,
  ODATA_ERROR_MAPPING,
  ODATA_QUERY_OPTIONS_QUERY_PARAMS,
  SourceDirective,
} from './odataConnectors.js';
import type { ODataFieldEmit } from './types.js';

/** Mesh `{env.X}` / `{args.X}` → Connectors `{$env.X}` / `{$args.X}`. */
function toConnectHeaderValue(value: string): string {
  return String(value)
    .replace(/\{env\./g, '{$env.')
    .replace(/\{args\./g, '{$args.')
    .replace(/\{context\./g, '{$context.')
    .replace(/\{this\./g, '{$this.');
}

function headersToConnectMappings(
  headers?: Record<string, string> | [string, string][],
): Array<{ name: string; value: string }> | undefined {
  if (!headers) return undefined;
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  if (!entries.length) return undefined;
  return entries.map(([name, value]) => ({
    name,
    value: toConnectHeaderValue(String(value)),
  }));
}

/** Build `{ __typename: "T", …fields }` for one union match arm / default. */
function odataTypenameSelectionObject(
  schemaComposer: SchemaComposer,
  name: string,
  visited: Set<string>,
): string {
  let exclusive = '';
  try {
    const otc = schemaComposer.getOTC(name);
    exclusive = entitySelection(schemaComposer, otc, visited);
  } catch {
    exclusive = '';
  }
  // `@key` field only inside match arms. Multi-field object literals (and nested
  // groups / `_odataId: $->get("@odata.id")`) → Router v2.19 `nom::Eof`.
  // Additional fields are filled via type-level `@connect` entity follow-up when
  // the gateway supports it; Hive maps scalars from the same JSON when present.
  let keyField: string | undefined;
  try {
    keyField = (
      (schemaComposer.getOTC(name).getExtensions() as any)?.odata?.entityInfo
        ?.identifierFieldName as string | undefined
    );
  } catch {
    keyField = undefined;
  }
  if (!keyField && exclusive) {
    let body = exclusive;
    for (let i = 0; i < 8; i++) {
      const next = body.replace(/\b\w+\s*\{[^{}]*\}/g, ' ');
      if (next === body) break;
      body = next;
    }
    keyField = body
      .replace(/\b_odataId\s*:\s*\S+/g, ' ')
      .replace(/\brest\s*:\s*\S+/g, ' ')
      .trim()
      .split(/\s+/)
      .find(Boolean);
  }
  void visited;
  return keyField
    ? `{ __typename: ${JSON.stringify(name)}, ${keyField} }`
    : `{ __typename: ${JSON.stringify(name)} }`;
}

/**
 * Connectors abstract spread: map OData `@odata.type` → concrete `__typename`.
 * Required by Apollo Router for interface/union selections (same pattern as OpenAPI
 * `... $_type->match(...)`).
 *
 * When `defaultTypeName` is set, missing `@odata.type` (common for the declared
 * base type under `odata.metadata=minimal`) falls back via `[@, { … }]`.
 */
function odataAbstractTypenameSpread(
  schemaComposer: SchemaComposer,
  memberTypeNames: string[],
  defaultTypeName?: string,
): string {
  const arms: string[] = [];
  for (const name of memberTypeNames) {
    if (!schemaComposer.isObjectType(name)) continue;
    let odataType = `#${name}`;
    try {
      const otc = schemaComposer.getOTC(name);
      odataType =
        ((otc.getExtensions() as any)?.odata?.entityInfo?.odataTypeName as string) || odataType;
    } catch {
      // keep `#name` fallback
    }
    arms.push(
      `[${JSON.stringify(odataType)}, ${odataTypenameSelectionObject(schemaComposer, name, new Set())}]`,
    );
  }
  if (!arms.length) return '';
  const def =
    defaultTypeName &&
    memberTypeNames.includes(defaultTypeName) &&
    schemaComposer.isObjectType(defaultTypeName)
      ? defaultTypeName
      : undefined;
  if (def) {
    return `... $->get("@odata.type")->match(${arms.join(', ')}, [@, ${odataTypenameSelectionObject(schemaComposer, def, new Set())}])`;
  }
  return `... $->get("@odata.type")->match(${arms.join(', ')})`;
}

/**
 * Connectors JSONSelection for an OData entity/complex type.
 * Apollo Router requires object/list fields to use `{ … }` groups (bare names fail).
 * Skip fields with arguments (bound ops / queryOptions nav) — those get their own `@connect`.
 */
function entitySelection(
  schemaComposer: SchemaComposer,
  entityTC: ObjectTypeComposer | InterfaceTypeComposer,
  visited: Set<string> = new Set(),
): string {
  const typeName = entityTC.getTypeName();
  // Cycle detection only — do not truncate acyclic complex property chains
  // (depth limits drop nested scalars with no lazy-fetch fallback).
  if (visited.has(typeName)) {
    return '';
  }
  // Unions: only `__typename` discriminator arms (no field bag on the union itself).
  if (schemaComposer.isUnionType(typeName)) {
    try {
      const utc = schemaComposer.getUTC(typeName);
      const members = (utc.getTypes?.() || [])
        .map((t: any) => (typeof t === 'string' ? t : t.getTypeName?.()))
        .filter((n: unknown): n is string => typeof n === 'string');
      const defaultTypename = (utc.getExtensions() as any)?.odata?.defaultTypename as
        | string
        | undefined;
      return odataAbstractTypenameSpread(schemaComposer, members, defaultTypename);
    } catch {
      return '';
    }
  }
  visited = new Set(visited);
  visited.add(typeName);

  const extBag = (entityTC.getExtensions() as any) || {};
  const entityInfo = extBag.odata?.entityInfo as
    { actualFields?: string[]; navigationFields?: string[] } | undefined;
  const navigationFields = new Set(entityInfo?.navigationFields || []);

  const lines: string[] = [];
  for (const fieldName of entityTC.getFieldNames()) {
    const field = entityTC.getField(fieldName);
    const fieldOData = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
    const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    // Bound/unbound ops and navigation properties get field-level `@connect`
    // (Apollo OData connector pattern) — not inlined into the parent selection.
    if (
      fieldOData.boundFunction ||
      fieldOData.boundAction ||
      fieldOData.unboundFunction ||
      fieldOData.unboundAction ||
      fieldOData.singularNav ||
      fieldOData.pluralNav ||
      fieldOData.navProp ||
      fieldDirs.connect ||
      navigationFields.has(fieldName)
    ) {
      continue;
    }
    // Nested-only entities use `$this._odataId` (absolute `@odata.id`).
    if (fieldName === '_odataId') {
      lines.push('_odataId: $->get("@odata.id")');
      continue;
    }
    const typeNameStr =
      typeof (field.type as any)?.getTypeName === 'function'
        ? (field.type as any).getTypeName()
        : String(field.type);
    const named = typeNameStr.replace(/[[\]!]/g, '');
    // Open-type catch-all: Map the whole entity JSON (replaces Mesh `@resolveRoot`).
    if (fieldName === 'rest' && named === 'JSON') {
      lines.push('rest: $');
      continue;
    }
    let nested = '';
    if (
      schemaComposer.isObjectType(named) ||
      schemaComposer.isInterfaceType(named) ||
      schemaComposer.isUnionType(named)
    ) {
      try {
        const childTC = schemaComposer.getAnyTC(named) as
          ObjectTypeComposer | InterfaceTypeComposer;
        nested = entitySelection(schemaComposer, childTC, visited);
      } catch {
        nested = '';
      }
      if (!nested) {
        // Empty object expansion (cycle / only-arg fields) — omit; bare name is invalid.
        continue;
      }
      lines.push(`${fieldName} { ${nested} }`);
    } else {
      // Scalar / enum / JSON
      lines.push(fieldName);
    }
  }
  return lines.join(' ');
}

function listSelection(
  schemaComposer: SchemaComposer,
  entityTC: ObjectTypeComposer | InterfaceTypeComposer,
): string {
  const inner = entitySelection(schemaComposer, entityTC);
  return inner ? `$.value { ${inner} }` : '$.value';
}

function fieldTypeNameString(field: ObjectTypeComposerFieldConfig<any, any>): string {
  return typeof (field.type as any)?.getTypeName === 'function'
    ? (field.type as any).getTypeName()
    : String(field.type);
}

function selectionForFieldReturnType(
  schemaComposer: SchemaComposer,
  field: ObjectTypeComposerFieldConfig<any, any>,
): string {
  const typeName = fieldTypeNameString(field);
  const isList = typeName.includes('[');
  const named = typeName.replace(/[[\]!]/g, '');
  // JSON / complex: whole body. Primitive scalars (and lists of them) are wrapped
  // as `{"value": …}` in OData JSON — unwrap with `$.value`.
  if (named === 'JSON') {
    return '$';
  }
  if (named === 'Int' || named === 'Float' || named === 'Boolean') {
    return '$.value';
  }
  // Unions: `@odata.type`→`__typename` match (no field bag on the union itself).
  if (schemaComposer.isUnionType(named)) {
    try {
      const utc = schemaComposer.getUTC(named);
      const members = (utc.getTypes?.() || [])
        .map((t: any) => (typeof t === 'string' ? t : t.getTypeName?.()))
        .filter((n: unknown): n is string => typeof n === 'string');
      const defaultTypename = (utc.getExtensions() as any)?.odata?.defaultTypename as
        | string
        | undefined;
      const spread = odataAbstractTypenameSpread(schemaComposer, members, defaultTypename);
      if (!spread) return '$';
      return isList ? `$.value { ${spread} }` : spread;
    } catch {
      return '$';
    }
  }
  let entityTC: ObjectTypeComposer | InterfaceTypeComposer | undefined;
  try {
    entityTC = schemaComposer.getAnyTC(named) as any;
  } catch {
    entityTC = undefined;
  }
  if (!entityTC || typeof (entityTC as any).getFieldNames !== 'function') {
    return '$';
  }
  if (isList) {
    return listSelection(schemaComposer, entityTC);
  }
  return entitySelection(schemaComposer, entityTC) || '$';
}

/** OData function/action call args: `(lat={$args.lat},userName='{$args.userName}')`. */
function odataCallArgsSuffix(
  schemaComposer: SchemaComposer,
  field: ObjectTypeComposerFieldConfig<any, any>,
): string {
  const args = field.args || {};
  const parts: string[] = [];
  for (const [name, argConfig] of Object.entries(args)) {
    if (name === 'queryOptions') continue;
    const argTypeName = (
      typeof (argConfig.type as any)?.getTypeName === 'function'
        ? (argConfig.type as any).getTypeName()
        : String(argConfig.type)
    ).replace(/[[\]!]/g, '');
    // Binding parameters are Input objects (PersonInput, TripInput) — parent supplies `$this`.
    if (argTypeName.endsWith('Input') || argTypeName.endsWith('UpdateInput')) {
      continue;
    }
    try {
      if (schemaComposer.getITC(argTypeName)) {
        continue;
      }
    } catch {
      // not an input type
    }
    const isStringish =
      argTypeName === 'String' ||
      argTypeName === 'ID' ||
      argTypeName === 'GUID' ||
      schemaComposer.isEnumType(argTypeName);
    parts.push(isStringish ? `${name}='{$args.${name}}'` : `${name}={$args.${name}}`);
  }
  // OData omits `()` when there are no parameters (bound-with-only-binding-arg).
  if (!parts.length) return '';
  return `(${parts.join(',')})`;
}

function connectArgs(opts: {
  source: string;
  http: Record<string, unknown>;
  selection: string;
  entity?: boolean;
}) {
  // Shared `errors` / headers live on `@source` — Connectors inherit them
  // (Hive: `connect.errors || source.errors`; Apollo Router same).
  return {
    source: opts.source,
    http: opts.http,
    selection: opts.selection,
    ...(opts.entity ? { entity: true } : {}),
  };
}

/** Internal GraphQL field holding OData `@odata.id` for nested `@connect` absolute URLs. */
const ODATA_ID_FIELD = '_odataId';

export type ODataConnectSchemaMeta = {
  source: {
    name: string;
    http: Record<string, unknown>;
    errors: { message: string };
  };
  link: Array<{ url: string; import: string[] }>;
};

/**
 * Rewrite Mesh OData field directives to Federation Connectors `@connect` / `@source`,
 * and switch the subgraph to `transport-rest` (Hive `$select` via Accept odata.metadata).
 *
 * Navigation / bound ops:
 * - Types with an entity set → `/EntitySet/{$this.key}/Nav` (Apollo OData pattern)
 * - Nested-only types → `{$this._odataId}/Nav` (Hive fills `_odataId` from the
 *   request URL when `odata.metadata=minimal` omits `@odata.id`)
 */
export function emitODataConnectors(
  schemaComposer: SchemaComposer,
  opts: {
    name: string;
    endpoint: string;
    operationHeaders?: Record<string, string>;
  },
): ODataConnectSchemaMeta {
  schemaComposer.addDirective(ConnectDirective);
  schemaComposer.addDirective(SourceDirective);
  schemaComposer.addDirective(LinkDirective);
  // Do not register a local `@key` / `@inaccessible` directive def — federation `@link` owns them.

  const sourceName = opts.name;

  // Ensure every keyed entity exposes `_odataId` before root/entity selections are built.
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    const otc = tc as ObjectTypeComposer | InterfaceTypeComposer;
    const earlyExt = (otc.getExtensions() as any) || {};
    const entityInfo = earlyExt.odata?.entityInfo as { identifierFieldName?: string } | undefined;
    if (!entityInfo?.identifierFieldName) continue;
    if (otc.hasField(ODATA_ID_FIELD)) continue;
    otc.addFields({
      [ODATA_ID_FIELD]: {
        type: 'String',
        description: 'OData @odata.id (inaccessible; absolute URL for nested @connect paths)',
        extensions: {
          directives: { inaccessible: true },
        },
      } as any,
    });
  }
  const setConnect = (
    parent: ObjectTypeComposer | InterfaceTypeComposer | typeof schemaComposer.Query,
    fieldName: string,
    args: ReturnType<typeof connectArgs>,
  ) => {
    // Replace the field config (don't mutate shared interface/object extension bags).
    const field = parent.getField(fieldName);
    parent.setField(fieldName, {
      type: field.type,
      args: field.args,
      description: field.description,
      deprecationReason: field.deprecationReason,
      extensions: {
        directives: { connect: args },
      },
    } as any);
  };

  /** Drop emit-time odata hints from interface fields — objects own the `@connect`. */
  const clearODataFieldEmit = (
    parent: ObjectTypeComposer | InterfaceTypeComposer,
    fieldName: string,
  ) => {
    const field = parent.getField(fieldName);
    const odata = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
    if (
      !odata.pluralNav &&
      !odata.singularNav &&
      !odata.navProp &&
      !odata.boundFunction &&
      !odata.boundAction
    ) {
      return;
    }
    const dirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    parent.setField(fieldName, {
      type: field.type,
      args: field.args,
      description: field.description,
      deprecationReason: field.deprecationReason,
      extensions: dirs.connect ? { directives: { connect: dirs.connect } } : {},
    } as any);
  };

  const rewriteRoot = (rootName: 'Query' | 'Mutation') => {
    const root = schemaComposer[rootName];
    for (const fieldName of root.getFieldNames()) {
      const field = root.getField(fieldName);
      const dirs = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
      const returnTypeName = field.type.getTypeName().replace(/[[\]!]/g, '');
      let entityTC: ObjectTypeComposer | InterfaceTypeComposer | undefined;
      try {
        entityTC = schemaComposer.getAnyTC(returnTypeName) as any;
      } catch {
        entityTC = undefined;
      }

      if (dirs.entitySet) {
        const entitySetName = dirs.entitySet.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${entitySetName}`,
              queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
            },
            selection: entityTC ? listSelection(schemaComposer, entityTC) : '$.value',
          }),
        );
        continue;
      }

      if (dirs.entitySetByIdentifier) {
        const { entitySetName, identifierFieldName } = dirs.entitySetByIdentifier;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              // Trailing slash matches historical Mesh OData URL shape / TripPin mocks.
              GET: `/${entitySetName}/{$args.${identifierFieldName}}/`,
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
            // Apollo Router rejects `entity: true` on Mutation (`ENTITY_NOT_ON_ROOT_QUERY`).
            // Unions have no key fields — `entity: true` on `IPerson` etc. fails resolvable-key creation.
            entity:
              rootName === 'Query' &&
              Boolean(returnTypeName) &&
              schemaComposer.isObjectType(returnTypeName),
          }),
        );
        continue;
      }

      if (dirs.entitySetCount) {
        const entitySetName = dirs.entitySetCount.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${entitySetName}/$count`,
              queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
            },
            // `$count` returns a raw integer body — selection is the root value.
            selection: '$',
          }),
        );
        continue;
      }

      if (dirs.createEntitySet) {
        const entitySetName = dirs.createEntitySet.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              POST: `/${entitySetName}`,
              body: '$args.input',
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.deleteEntitySet) {
        const { entitySetName, identifierFieldName } = dirs.deleteEntitySet;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              DELETE: `/${entitySetName}/{$args.${identifierFieldName}}/`,
            },
            // DELETE has an empty/non-JSON body — literal root is intentional.
            selection: '$',
          }),
        );
        continue;
      }

      if (dirs.updateEntitySet) {
        const { entitySetName, identifierFieldName } = dirs.updateEntitySet;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              PATCH: `/${entitySetName}/{$args.${identifierFieldName}}/`,
              body: '$args.input',
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.singleton) {
        const singletonName = dirs.singleton.singletonName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: { GET: `/${singletonName}` },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.unboundFunction) {
        const functionName = dirs.unboundFunction.functionName as string;
        const callArgs = odataCallArgsSuffix(schemaComposer, field);
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${functionName}${callArgs}`,
              queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
            },
            selection: selectionForFieldReturnType(schemaComposer, field),
          }),
        );
        continue;
      }

      if (dirs.unboundAction) {
        const actionName = dirs.unboundAction.actionName as string;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              POST: `/${actionName}`,
              body: '$args',
            },
            selection: selectionForFieldReturnType(schemaComposer, field),
          }),
        );
        continue;
      }
    }
  };

  rewriteRoot('Query');
  rewriteRoot('Mutation');

  // typeName → OData entity set (for Apollo-style `/EntitySet/{$this.key}/…` nav connects).
  const entitySetByType = new Map<string, string>();
  /** First entity set wins — TripPin also exposes `NewComePeople` for `Person`. */
  const rememberEntitySet = (typeName: string, entitySetName: string) => {
    if (!typeName || !entitySetName) return;
    const setOnce = (name: string) => {
      if (!entitySetByType.has(name)) {
        entitySetByType.set(name, entitySetName);
      }
    };
    setOnce(typeName);
    // PeopleByUserName returns `IPerson` — also stamp concrete `Person` + implementers.
    if (typeName.startsWith('I') && schemaComposer.isObjectType(typeName.slice(1))) {
      setOnce(typeName.slice(1));
    }
    if (schemaComposer.isInterfaceType(typeName)) {
      // Stamp object types that declare this interface (People → Person/Manager/…).
      for (const other of schemaComposer.types.values()) {
        const otherName = (other as any).getTypeName?.();
        if (typeof otherName !== 'string' || !schemaComposer.isObjectType(otherName)) continue;
        try {
          const ifaces = (other as ObjectTypeComposer).getInterfaces?.() || [];
          if (
            ifaces.some((i: any) => (typeof i === 'string' ? i : i.getTypeName?.()) === typeName)
          ) {
            setOnce(otherName);
          }
        } catch {
          // ignore
        }
      }
    }
  };

  for (const qName of schemaComposer.Query.getFieldNames()) {
    const qField = schemaComposer.Query.getField(qName);
    const connect = (qField.extensions as any)?.directives?.connect;
    const returnName = qField.type.getTypeName().replace(/[[\]!]/g, '');
    const getPath = connect?.http?.GET as string | undefined;
    if (connect?.entity && getPath) {
      const match = getPath.match(/^\/([^/]+)\//);
      if (match) {
        rememberEntitySet(returnName, match[1]);
      }
    }
  }

  // Entity types: `@key` + type-level `@connect` + nav/bound field `@connect`.
  for (const tc of schemaComposer.types.values()) {
    if (!('getTypeName' in tc) || typeof (tc as any).getExtensions !== 'function') {
      continue;
    }
    const typeName = (tc as ObjectTypeComposer).getTypeName();
    if (
      typeName.startsWith('__') ||
      typeName.endsWith('Input') ||
      typeName.endsWith('UpdateInput')
    ) {
      continue;
    }
    const extensions = (tc as ObjectTypeComposer).getExtensions() as any;
    const entityInfo = extensions?.odata?.entityInfo;
    if (!entityInfo) {
      continue;
    }
    const identifierFieldName = entityInfo.identifierFieldName;
    if (!identifierFieldName) {
      continue;
    }
    const isIface = schemaComposer.isInterfaceType(typeName);
    const isObject = schemaComposer.isObjectType(typeName);
    if (!isIface && !isObject) {
      continue;
    }
    const otc = tc as ObjectTypeComposer;
    const entitySetName = entitySetByType.get(typeName);

    // Field-level `@connect` for nav + bound ops.
    // Prefer entity-set relative paths (Apollo OData pattern). Nested-only types use
    // `{$this._odataId}` (Hive synthesizes id from the parent request URL).
    if (isObject) {
      const basePath = entitySetName
        ? `/${entitySetName}/{$this.${identifierFieldName}}`
        : `{$this.${ODATA_ID_FIELD}}`;
      for (const fieldName of otc.getFieldNames()) {
        const field = otc.getField(fieldName);
        const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
        const dirs = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
        if (fieldDirs.connect) {
          continue;
        }
        if (dirs.pluralNav) {
          const navName = dirs.pluralNav.navigationPropertyName as string;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                GET: `${basePath}/${navName}`,
                queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.navProp) {
          const navName = dirs.navProp.navigationPropertyName as string;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: { GET: `${basePath}/${navName}` },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.singularNav) {
          const navName = dirs.singularNav.navigationPropertyName as string;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: { GET: `${basePath}/${navName}/{$args.id}/` },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.boundFunction) {
          const functionRef = dirs.boundFunction.functionRef as string;
          const callArgs = odataCallArgsSuffix(schemaComposer, field);
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                GET: `${basePath}/${functionRef}${callArgs}`,
                queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.boundAction) {
          const actionRef = dirs.boundAction.actionRef as string;
          // OData action bodies exclude the binding parameter (URL identifies the entity).
          const bodyArgs: string[] = [];
          for (const [argName, argConfig] of Object.entries(field.args || {})) {
            if (argName === 'queryOptions') continue;
            const argTypeName = (
              typeof (argConfig.type as any)?.getTypeName === 'function'
                ? (argConfig.type as any).getTypeName()
                : String(argConfig.type)
            ).replace(/[[\]!]/g, '');
            if (argTypeName.endsWith('Input') || argTypeName.endsWith('UpdateInput')) {
              continue;
            }
            try {
              if (schemaComposer.getITC(argTypeName)) continue;
            } catch {
              // scalar / enum arg — include in body
            }
            bodyArgs.push(argName);
          }
          const body =
            bodyArgs.length === 0
              ? '$({})'
              : bodyArgs.length === Object.keys(field.args || {}).length
                ? '$args'
                : `$args { ${bodyArgs.join(' ')} }`;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                POST: `${basePath}/${actionRef}`,
                body,
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
        }
      }
    } else if (isIface) {
      // Interface fields stay bare; implementing objects carry `@connect`.
      for (const fieldName of otc.getFieldNames()) {
        clearODataFieldEmit(otc, fieldName);
      }
    }

    // Skip redundant `IFoo` type-level `@key`/`@connect` when concrete `Foo` exists.
    if (typeName.startsWith('I') && schemaComposer.isObjectType(typeName.slice(1))) {
      continue;
    }

    const existing = [...(otc.getDirectives() || [])];
    if (isObject && !existing.some(d => d.name === 'key')) {
      existing.push({
        name: 'key',
        args: { fields: identifierFieldName },
      });
    }

    // `@connect` is OBJECT-only (Federation Connectors).
    if (isObject && !existing.some(d => d.name === 'connect') && entitySetName) {
      existing.push({
        name: 'connect',
        args: connectArgs({
          source: sourceName,
          http: {
            GET: `/${entitySetName}/{$this.${identifierFieldName}}/`,
          },
          selection: entitySelection(schemaComposer, otc as any) || '$',
        }),
      });
    }
    otc.setDirectives(existing);
  }

  // Ensure connect-only bags on fields that already have `@connect`.
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    const typed = tc as ObjectTypeComposer | InterfaceTypeComposer;
    for (const fieldName of typed.getFieldNames()) {
      const field = typed.getField(fieldName);
      const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
      if (!fieldDirs.connect) continue;
      typed.setFieldExtensions(fieldName, { directives: { connect: fieldDirs.connect } } as any);
    }
  }

  // Drop emit-time `extensions.odata` (entityInfo + field hints). Public SDL is Connectors-only.
  for (const tc of schemaComposer.types.values()) {
    const typed = tc as any;
    const ext = typed.getExtensions?.() as any;
    if (ext?.odata) {
      delete ext.odata;
    }
    // Root Query/Mutation fields may still carry odata hints if setConnect was skipped.
    if (typeof typed.getFieldNames === 'function' && typeof typed.getField === 'function') {
      for (const fieldName of typed.getFieldNames()) {
        const field = typed.getField(fieldName);
        const fext = (field.extensions as any) || {};
        if (fext.odata) {
          const next = { ...fext };
          delete next.odata;
          if (typeof typed.setFieldExtensions === 'function') {
            typed.setFieldExtensions(fieldName, next);
          } else if (typeof typed.setField === 'function') {
            typed.setField(fieldName, {
              type: field.type,
              args: field.args,
              description: field.description,
              deprecationReason: field.deprecationReason,
              extensions: next,
            });
          }
        }
      }
    }
  }

  const mergedHeaders = {
    Accept: ODATA_ACCEPT_METADATA,
    ...(opts.operationHeaders || {}),
  };
  const headerMappings = headersToConnectMappings(mergedHeaders);

  return {
    source: {
      name: sourceName,
      http: {
        baseURL: opts.endpoint,
        ...(headerMappings ? { headers: headerMappings } : {}),
      },
      errors: ODATA_ERROR_MAPPING,
    },
    link: [
      {
        url: CONNECT_LINK_URL,
        import: ['@connect', '@source'],
      },
      {
        url: FEDERATION_LINK_URL,
        import: ['@key', '@inaccessible'],
      },
    ],
  };
}

/**
 * Restore OData inheritance as GraphQL unions (Router Connectors reject interface
 * `implements` expand). Call after BaseType field merge, before {@link emitODataConnectors}.
 *
 * - Abstract base → union with the same name = transitive concrete descendants
 * - Non-abstract base with children → `I{Base} = Base | …descendants`; rewrite
 *   output fields typed as `Base` → `I{Base}`
 */
export function emitODataPolymorphicUnions(
  schemaComposer: SchemaComposer,
  opts: {
    abstractTypeNames: Set<string>;
    childrenByBase: Map<string, Set<string>>;
    log?: Logger;
  },
): void {
  const { abstractTypeNames, childrenByBase, log } = opts;

  function transitiveDescendants(base: string): Set<string> {
    const out = new Set<string>();
    const stack = [...(childrenByBase.get(base) || [])];
    while (stack.length) {
      const n = stack.pop()!;
      if (out.has(n)) continue;
      out.add(n);
      for (const c of childrenByBase.get(n) || []) {
        stack.push(c);
      }
    }
    return out;
  }

  function typeNameTokenRe(name: string): RegExp {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Avoid lookbehind for broader TS/downlevel targets: prefix captured in $1.
    return new RegExp(`(^|[^A-Za-z0-9_])(${esc})(?![A-Za-z0-9_])`);
  }

  function rewriteTypeName(typeStr: string, from: string, to: string): string {
    return typeStr.replace(typeNameTokenRe(from), `$1${to}`);
  }

  /** Rebind output fields (and roots) that reference `fromType` to `toType`. */
  function rewriteOutputFields(fromType: string, toType: string) {
    const re = typeNameTokenRe(fromType);
    for (const tc of schemaComposer.types.values()) {
      const typeName = (tc as any).getTypeName?.();
      if (typeof typeName !== 'string') continue;
      if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
        continue;
      }
      const otc = tc as ObjectTypeComposer | InterfaceTypeComposer;
      for (const fieldName of otc.getFieldNames()) {
        const field = otc.getField(fieldName);
        const typeStr = fieldTypeNameString(field);
        if (!re.test(typeStr)) continue;
        // Always set a string type so graphql-compose re-resolves (important when
        // replacing an abstract object with a same-named union).
        otc.setField(fieldName, {
          ...field,
          type: rewriteTypeName(typeStr, fromType, toType),
        });
      }
    }
  }

  function isKeyedOrAbstractEntity(typeName: string): boolean {
    if (abstractTypeNames.has(typeName)) return true;
    try {
      if (!schemaComposer.isObjectType(typeName)) return false;
      const otc = schemaComposer.getOTC(typeName);
      return Boolean(
        (otc.getExtensions() as any)?.odata?.entityInfo?.identifierFieldName,
      );
    } catch {
      return false;
    }
  }

  /** Skip PlanItem-style trees without a dedicated entity set — typename-only
   *  match arms empty their fields under Router Connectors expand. */
  function hasEntitySetOrAbstract(typeName: string): boolean {
    if (abstractTypeNames.has(typeName)) return true;
    try {
      const otc = schemaComposer.getOTC(typeName);
      // Type-level `@connect` is stamped later; approximate via identifier +
      // Query root fields returning this type or I{type}.
      const id = (otc.getExtensions() as any)?.odata?.entityInfo?.identifierFieldName;
      if (!id) return false;
      for (const fieldName of schemaComposer.Query.getFieldNames()) {
        const t = fieldTypeNameString(schemaComposer.Query.getField(fieldName));
        if (t.includes(typeName)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const bases = new Set<string>([...childrenByBase.keys(), ...abstractTypeNames]);
  for (const base of bases) {
    const descendants = transitiveDescendants(base);
    if (!descendants.size) continue;

    // Complex-type inheritance (e.g. Location → AirportLocation) stays as field
    // merge only — unions would force fragments on every `AddressInfo { Address }`.
    if (!isKeyedOrAbstractEntity(base)) {
      continue;
    }
    // Avoid IPlanItem until match arms can carry full selections on Router.
    if (!hasEntitySetOrAbstract(base) && !abstractTypeNames.has(base)) {
      continue;
    }

    const isAbstract = abstractTypeNames.has(base);
    const members: string[] = [];
    if (!isAbstract && schemaComposer.isObjectType(base)) {
      members.push(base);
    }
    for (const d of [...descendants].sort()) {
      if (schemaComposer.isObjectType(d) && !members.includes(d)) {
        members.push(d);
      }
    }
    // Need ≥2 members, or a single concrete child of an abstract base.
    if (members.length < 2 && !(isAbstract && members.length === 1)) {
      continue;
    }

    const unionName = isAbstract ? base : `I${base}`;
    if (!isAbstract && schemaComposer.has(unionName)) {
      log?.warn?.(`OData: skip polymorphic union ${unionName}; name already exists`);
      continue;
    }
    if (isAbstract && schemaComposer.isUnionType(base)) {
      continue;
    }

    const defaultTypename =
      !isAbstract && members.includes(base) ? base : members[0];

    let abstractOrphan: string | undefined;
    if (isAbstract && schemaComposer.isObjectType(base)) {
      // ListComposer wrappers keep the abstract OTC alive after `delete(name)`.
      // Rename it out of the way, create the union under the public name, rebind
      // fields to the union, then drop the orphan.
      const otc = schemaComposer.getOTC(base);
      abstractOrphan = `__ODataAbstract_${base}`;
      schemaComposer.delete(base);
      otc.setTypeName(abstractOrphan);
      schemaComposer.set(abstractOrphan, otc);
    }

    schemaComposer.createUnionTC({
      name: unionName,
      types: members,
      description: isAbstract
        ? `OData abstract type ${base} (union of concrete implementations)`
        : `OData polymorphic ${base} (union of ${base} and subtypes)`,
      extensions: {
        odata: { defaultTypename },
      },
    });

    if (abstractOrphan) {
      rewriteOutputFields(abstractOrphan, unionName);
      schemaComposer.delete(abstractOrphan);
    }

    // Non-abstract: Person → IPerson. Abstract: string refs → union (same name).
    rewriteOutputFields(base, unionName);
  }
}

export function applyODataConnectSchemaExtensions(
  schema: GraphQLSchema,
  meta: ODataConnectSchemaMeta,
  subgraphName: string,
  endpoint: string,
  odataOpts?: {
    batch?: 'none' | 'json' | 'multipart';
    expandNavProps?: boolean;
  },
) {
  const schemaExtensions: any = (schema.extensions ||= {});
  const directiveExtensions = (schemaExtensions.directives ||= {});
  directiveExtensions.source = [meta.source];
  directiveExtensions.link = [...(directiveExtensions.link || []), ...meta.link];
  // `@source` carries baseURL + Accept. Emit Mesh `@transport` only when Hive needs
  // OData-specific `options.odata` (batch / expandNavProps). Otherwise compose injects
  // a minimal `kind: rest` entry from `@source` for connectors subgraphs.
  if (odataOpts && Object.keys(odataOpts).length) {
    directiveExtensions.transport = {
      kind: 'rest',
      subgraph: subgraphName,
      location: endpoint,
      options: { odata: odataOpts },
    };
  }
}
