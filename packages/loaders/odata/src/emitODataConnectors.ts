import type { SchemaComposer } from 'graphql-compose';
import type { ObjectTypeComposer, InterfaceTypeComposer } from 'graphql-compose';
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
 * Skip fields with arguments (bound ops / queryOptions nav) — residual Mesh resolvers.
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

  const lines: string[] = [];
  for (const fieldName of entityTC.getFieldNames()) {
    const field = entityTC.getField(fieldName);
    const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    // Bound/unbound ops stay on Mesh residual resolvers (not in Connectors selection).
    if (
      fieldDirs.boundFunction ||
      fieldDirs.boundAction ||
      fieldDirs.unboundFunction ||
      fieldDirs.unboundAction ||
      fieldDirs.singularNav // FriendsById(id:) — key lookup, not parent payload
    ) {
      continue;
    }
    const named = field.type.getTypeName().replace(/[[\]!]/g, '');
    let nested = '';
    if (schemaComposer.isObjectType(named) || schemaComposer.isInterfaceType(named)) {
      try {
        const childTC = schemaComposer.getAnyTC(named) as ObjectTypeComposer | InterfaceTypeComposer;
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
  // Do not register a local `@key` directive def — federation `@link` owns it.
  // Usages are attached on entity types below via `setDirectives`.

  const sourceName = opts.name;
  const setConnect = (
    parent: ObjectTypeComposer | typeof schemaComposer.Query,
    fieldName: string,
    args: ReturnType<typeof connectArgs>,
  ) => {
    parent.setFieldExtensions(fieldName, {
      directives: { connect: args },
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
            selection: entityTC
              ? listSelection(schemaComposer, entityTC)
              : '$.value',
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

      // unbound/bound function & action: keep Mesh directives — residual
      // `processODataResidualDirectives` wires them (OData function URL shapes).
    }
  };

  rewriteRoot('Query');
  rewriteRoot('Mutation');

  // Entity types: `@key` + type-level `@connect` + nav field `@connect`.
  for (const tc of schemaComposer.types.values()) {
    if (!('getTypeName' in tc) || typeof (tc as any).getExtensions !== 'function') {
      continue;
    }
    const typeName = (tc as ObjectTypeComposer).getTypeName();
    if (typeName.startsWith('__') || typeName.endsWith('Input') || typeName.endsWith('UpdateInput')) {
      continue;
    }
    const extensions = (tc as ObjectTypeComposer).getExtensions() as any as EntityTypeExtensions;
    const entityInfo = extensions?.directives?.entityInfo;
    if (!entityInfo) {
      continue;
    }
    const identifierFieldName = entityInfo.identifierFieldName;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    // Prefer GraphQL object types (not `I*` interfaces) for type-level connect.
    const skipTypeConnect =
      typeName.startsWith('I') && schemaComposer.isObjectType(typeName.slice(1));

    const otc = tc as ObjectTypeComposer;

    // Nav fields stay plain GraphQL fields: Hive `$expand` (from Accept odata.metadata)
    // fills them on the parent fetch. Field-level `@connect` would re-fetch and N+1.

    if (!identifierFieldName || skipTypeConnect) {
      continue;
    }

    const existing = [...(otc.getDirectives() || [])];
    if (!existing.some(d => d.name === 'key')) {
      existing.push({
        name: 'key',
        args: { fields: identifierFieldName },
      });
    }
    let entitySetName: string | undefined;
    for (const qName of schemaComposer.Query.getFieldNames()) {
      const qField = schemaComposer.Query.getField(qName);
      const connect = (qField.extensions as any)?.directives?.connect;
      if (connect?.entity && qField.type.getTypeName().replace(/[[\]!]/g, '') === typeName) {
        const getPath = connect.http?.GET as string | undefined;
        const match = getPath?.match(/^\/([^/]+)\//);
        if (match) {
          entitySetName = match[1];
          break;
        }
      }
    }
    if (entitySetName && !existing.some(d => d.name === 'connect')) {
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
        import: ['@key'],
      },
    ],
  };
}

export function applyODataConnectSchemaExtensions(
  schema: import('graphql').GraphQLSchema,
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
