import type { GraphQLSchema } from 'graphql';
import type {
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  SchemaComposer,
} from 'graphql-compose';
import {
  CONNECT_LINK_URL,
  ConnectDirective,
  FEDERATION_LINK_URL,
  LinkDirective,
  ODATA_ACCEPT_METADATA,
  ODATA_ERROR_MAPPING,
  ODATA_QUERY_OPTIONS_QUERY_PARAMS,
  SourceDirective,
} from './connectDirectives.js';
import type { EntityTypeExtensions } from './types.js';

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

/**
 * Connectors JSONSelection for an OData entity/complex type.
 * Apollo Router requires object/list fields to use `{ … }` groups (bare names fail).
 * Skip fields with arguments (bound ops / queryOptions nav) — those get their own `@connect`.
 */
function entitySelection(
  schemaComposer: SchemaComposer,
  entityTC: ObjectTypeComposer | InterfaceTypeComposer,
  depth = 0,
  visited: Set<string> = new Set(),
): string {
  const typeName = entityTC.getTypeName();
  if (visited.has(typeName) || depth > 2) {
    return '';
  }
  visited = new Set(visited);
  visited.add(typeName);

  const extBag = (entityTC.getExtensions() as any) || {};
  const entityInfo = (extBag.directives?.entityInfo || extBag.odataEntityInfo) as
    { actualFields?: string[]; navigationFields?: string[] } | undefined;
  const navigationFields = new Set(entityInfo?.navigationFields || []);

  const lines: string[] = [];
  for (const fieldName of entityTC.getFieldNames()) {
    const field = entityTC.getField(fieldName);
    const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    // Bound/unbound ops and navigation properties get field-level `@connect`
    // (Apollo OData connector pattern) — not inlined into the parent selection.
    if (
      fieldDirs.boundFunction ||
      fieldDirs.boundAction ||
      fieldDirs.unboundFunction ||
      fieldDirs.unboundAction ||
      fieldDirs.singularNav ||
      fieldDirs.pluralNav ||
      fieldDirs.navProp ||
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
    if (schemaComposer.isObjectType(named) || schemaComposer.isInterfaceType(named)) {
      try {
        const childTC = schemaComposer.getAnyTC(named) as
          ObjectTypeComposer | InterfaceTypeComposer;
        nested = entitySelection(schemaComposer, childTC, depth + 1, visited);
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
  if (named === 'JSON' || named === 'Int' || named === 'Float' || named === 'Boolean') {
    return '$';
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
  return {
    source: opts.source,
    http: opts.http,
    selection: opts.selection,
    ...(opts.entity ? { entity: true } : {}),
    errors: ODATA_ERROR_MAPPING,
  };
}

/** Mesh field directives fully replaced by `@connect` — drop defs after emit. */
const MESH_DIRECTIVES_REPLACED_BY_CONNECT = [
  'entitySet',
  'entitySetByIdentifier',
  'entitySetCount',
  'createEntitySet',
  'deleteEntitySet',
  'updateEntitySet',
  'singleton',
  'pluralNav',
  'singularNav',
  'navProp',
  'boundFunction',
  'boundAction',
  'unboundFunction',
  'unboundAction',
] as const;

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
    const entityInfo = (earlyExt.directives?.entityInfo || earlyExt.odataEntityInfo) as
      { identifierFieldName?: string } | undefined;
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

  /** Drop Mesh nav/bound dirs from interface fields — objects own the `@connect`. */
  const clearMeshFieldDirectives = (
    parent: ObjectTypeComposer | InterfaceTypeComposer,
    fieldName: string,
  ) => {
    const field = parent.getField(fieldName);
    const dirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    if (
      !dirs.pluralNav &&
      !dirs.singularNav &&
      !dirs.navProp &&
      !dirs.boundFunction &&
      !dirs.boundAction
    ) {
      return;
    }
    parent.setField(fieldName, {
      type: field.type,
      args: field.args,
      description: field.description,
      deprecationReason: field.deprecationReason,
      extensions: {},
    } as any);
  };

  const rewriteRoot = (rootName: 'Query' | 'Mutation') => {
    const root = schemaComposer[rootName];
    for (const fieldName of root.getFieldNames()) {
      const field = root.getField(fieldName);
      const dirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
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
            entity: true,
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
    const entityInfo = (extensions?.directives?.entityInfo || extensions?.odataEntityInfo) as
      EntityTypeExtensions['directives']['entityInfo'] | undefined;
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
        const dirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
        if (dirs.connect) {
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
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                POST: `${basePath}/${actionRef}`,
                body: '$args',
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
        }
      }
    } else if (isIface) {
      // Interface fields stay bare; implementing objects carry `@connect`.
      for (const fieldName of otc.getFieldNames()) {
        clearMeshFieldDirectives(otc, fieldName);
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

    // `@connect` is OBJECT-only (Federation Connectors). Abstract OData types use
    // interface `Foo` + object `TFoo` — put type-level connect on the object.
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

  // `@entityInfo` is loader metadata — keep on extensions for any in-process readers,
  // but strip from SDL (`@key` already carries the identifier for Hive `$select`).
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    const typed = tc as ObjectTypeComposer | InterfaceTypeComposer;
    const ext = typed.getExtensions() as any;
    if (ext?.directives?.entityInfo) {
      ext.odataEntityInfo = ext.directives.entityInfo;
      delete ext.directives.entityInfo;
    }
    typed.setDirectives([...(typed.getDirectives() || [])].filter(d => d.name !== 'entityInfo'));
  }
  // Also strip from input types that carried entityInfo.
  for (const tc of schemaComposer.types.values()) {
    if ((tc as any)?.constructor?.name !== 'InputTypeComposer') continue;
    const typed = tc as any;
    const ext = typed.getExtensions?.() as any;
    if (ext?.directives?.entityInfo) {
      ext.odataEntityInfo = ext.directives.entityInfo;
      delete ext.directives.entityInfo;
    }
    if (typeof typed.setDirectives === 'function') {
      typed.setDirectives(
        [...(typed.getDirectives?.() || [])].filter((d: any) => d.name !== 'entityInfo'),
      );
    }
  }

  // Drop Mesh directive definitions with no remaining usages.
  // Keep `@abstractType` only when OData Abstract="true".
  // `@entityInfo` / `@resolveRoot` are not in public SDL (runtime / `rest: $`).
  const stillUsed = new Set<string>();
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (schemaComposer.isObjectType(typeName) || schemaComposer.isInterfaceType(typeName)) {
      const typed = tc as ObjectTypeComposer | InterfaceTypeComposer;
      for (const d of typed.getDirectives() || []) {
        stillUsed.add(d.name);
      }
      for (const fieldName of typed.getFieldNames()) {
        const fieldDirs = ((typed.getField(fieldName).extensions as any)?.directives ||
          {}) as Record<string, unknown>;
        for (const name of Object.keys(fieldDirs)) {
          stillUsed.add(name);
        }
        for (const d of typed.getFieldDirectives(fieldName) || []) {
          stillUsed.add(d.name);
        }
      }
    }
  }
  for (const rootName of ['Query', 'Mutation'] as const) {
    const root = schemaComposer[rootName];
    for (const fieldName of root.getFieldNames()) {
      const fieldDirs = ((root.getField(fieldName).extensions as any)?.directives || {}) as Record<
        string,
        unknown
      >;
      for (const name of Object.keys(fieldDirs)) {
        stillUsed.add(name);
      }
    }
  }
  for (const dirName of [
    ...MESH_DIRECTIVES_REPLACED_BY_CONNECT,
    'entityInfo',
    'resolveRoot',
  ] as const) {
    if (stillUsed.has(dirName)) continue;
    try {
      if (schemaComposer.hasDirective(dirName)) {
        schemaComposer.removeDirective(schemaComposer.getDirective(dirName));
      }
    } catch {
      // ignore
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

export function applyODataConnectSchemaExtensions(
  schema: GraphQLSchema,
  meta: ODataConnectSchemaMeta,
  subgraphName: string,
  endpoint: string,
  operationHeaders?: Record<string, string>,
) {
  const schemaExtensions: any = (schema.extensions ||= {});
  const directiveExtensions = (schemaExtensions.directives ||= {});
  directiveExtensions.source = [meta.source];
  directiveExtensions.link = [...(directiveExtensions.link || []), ...meta.link];
  // Hive TransportEntry: rest — Connectors execution (no @graphql-mesh/transport-odata).
  directiveExtensions.transport = {
    kind: 'rest',
    subgraph: subgraphName,
    location: endpoint,
    headers: Object.entries({
      Accept: ODATA_ACCEPT_METADATA,
      ...(operationHeaders || {}),
    }),
  };
}
