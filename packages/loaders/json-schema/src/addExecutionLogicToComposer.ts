import type { GraphQLFieldConfig, GraphQLScalarType, GraphQLSchema } from 'graphql';
import {
  getNamedType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLString,
  GraphQLUnionType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql';
import type {
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  SchemaComposer,
} from 'graphql-compose';
import { GraphQLJSON } from 'graphql-compose';
import type { IStringifyOptions } from 'qs';
import { type Logger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import { entityKeyFieldsFromHttpPath } from '@graphql-mesh/fusion-composition';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  bakeEnumRootSelection,
  bakeInputBodySelection,
  buildConnectHttpArgs,
  buildSelectionForType,
  buildSourceDirectiveArgs,
  buildStatusUnionConnectExtras,
  CONNECT_LINK_URL,
  ConnectDirective,
  flushConnectSelectionPassthroughWarnings,
  inferBodySelection,
  LinkDirective,
  MESH_SPEC_LINK_URL,
  MeshRestOptionsDirective,
  remainingQueryStringOptionsByParam,
  resolveConnectSelectionLimit,
  rewriteConnectPathEnumArgs,
  SourceDirective,
  toConnectLinkExpression,
  warnConnectSelectionPassthrough,
  wrapArgExprWithEnumMatch,
} from './connectAnnotations.js';
import { PubSubOperationDirective, ResolveRootDirective } from './directives.js';
import { getMeshTypeConnect, registerMeshEntityType } from './entityRefs.js';
import type {
  ConnectSelectionOptions,
  JSONSchemaLinkConfig,
  JSONSchemaOperationConfig,
  OperationHeadersConfiguration,
} from './types.js';
import { getOperationMetadata, isPubSubOperationConfig } from './utils.js';

/**
 * Split a Connectors selection / object-literal body at top-level commas or
 * newlines, respecting quotes and `()`/`{}`/`[]` nesting (e.g. `joinNotNull(",")`).
 */
export function splitTopLevelEntries(inner: string): string[] {
  const entries: string[] = [];
  let buf = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (escape) {
      buf += ch;
      escape = false;
      continue;
    }
    if ((inSingle || inDouble) && ch === '\\') {
      buf += ch;
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      buf += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      buf += ch;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
      else if (
        (ch === ',' || ch === '\n') &&
        depthParen === 0 &&
        depthBrace === 0 &&
        depthBracket === 0
      ) {
        const part = buf.trim();
        if (part) entries.push(part);
        buf = '';
        continue;
      }
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) entries.push(last);
  return entries;
}

/**
 * Drop selection entries that still reference unmapped `$args.*`, keeping
 * rewritten / literal entries (including nested commas in method args).
 */
export function dropUnmappedArgEntries(selection: string): string | undefined {
  const trimmed = selection.trim();
  if (!trimmed.includes('$args')) {
    return selection;
  }
  if (trimmed.startsWith('{')) {
    const inner = trimmed.slice(1, trimmed.lastIndexOf('}'));
    const kept = splitTopLevelEntries(inner).filter(part => !part.includes('$args'));
    if (!kept.length) return undefined;
    return `{\n  ${kept.join('\n  ')}\n}`;
  }
  const keptLines = splitTopLevelEntries(selection).filter(part => !part.includes('$args'));
  if (!keptLines.length) return undefined;
  return keptLines.join('\n');
}

export interface AddExecutionLogicToComposerOptions {
  schemaComposer: SchemaComposer;
  endpoint: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: OperationHeadersConfiguration;
  log: Logger;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions;
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
  handlerName?: string;
  connectSelection?: ConnectSelectionOptions;
}

const responseMetadataType = new GraphQLObjectType({
  name: 'ResponseMetadata',
  fields: {
    url: { type: GraphQLString },
    method: { type: GraphQLString },
    status: { type: GraphQLInt },
    statusText: { type: GraphQLString },
    headers: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
  },
});

/**
 * Mesh `exposeResponseMetadata` → `_response` selection.
 * Apollo-portable: `$status`, `$`, `$("METHOD")`. Runtime-only url / statusText /
 * headers are filled after selection in the Connectors executor (no Mesh `$` vars).
 */
function responseMetadataConnectSelection(httpMethod: string): string {
  const methodLiteral = JSON.stringify(String(httpMethod || 'GET').toUpperCase());
  return `_response: { method: $(${methodLiteral}) status: $status body: $ }`;
}

export function addExecutionDirectivesToComposer(
  subgraphName: string,
  {
    schemaComposer,
    log,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName,
    connectSelection,
  }: AddExecutionLogicToComposerOptions,
) {
  const selectionLimit = resolveConnectSelectionLimit(connectSelection, log);
  log.debug(`Attaching execution directives to the schema`);
  type PendingLinks = {
    linkMap: Record<string, JSONSchemaLinkConfig>;
    typeTC: ObjectTypeComposer | InterfaceTypeComposer;
  };
  const pendingLinks: PendingLinks[] = [];
  let meshRestOptionsFieldUsed = false;

  // Pass 0: register GET-by-key return types as entity-resolvable so later
  // selections can emit `field: { id: fieldId }` stubs instead of huge trees.
  for (const operationConfig of operations) {
    if (!('path' in operationConfig) || !operationConfig.path) {
      continue;
    }
    if (isPubSubOperationConfig(operationConfig)) {
      continue;
    }
    const { httpMethod, rootTypeName, fieldName } = getOperationMetadata(operationConfig);
    if (rootTypeName !== 'Query' || String(httpMethod).toUpperCase() !== 'GET') {
      continue;
    }
    const rootTypeComposer = schemaComposer[rootTypeName];
    if (!rootTypeComposer?.hasField?.(fieldName)) {
      continue;
    }
    const field = rootTypeComposer.getField(fieldName);
    registerEntityTypeFromGetPath(getNamedType(field.type.getType()), String(operationConfig.path));
  }

  const handleLinkMap = (
    linkMap: Record<string, JSONSchemaLinkConfig>,
    typeTC: ObjectTypeComposer | InterfaceTypeComposer,
  ) => {
    for (const linkName in linkMap) {
      const linkObj = linkMap[linkName];
      let targetField: ObjectTypeComposerFieldConfig<any, any> | undefined;
      try {
        targetField = schemaComposer.Query.getField(linkObj.fieldName);
      } catch {
        try {
          targetField = schemaComposer.Mutation.getField(linkObj.fieldName);
        } catch {}
      }
      if (!targetField) {
        log.debug(`Field ${linkObj.fieldName} not found in ${subgraphName} for link ${linkName}`);
      }
      schemaComposer.addDirective(ConnectDirective);
      // Reuse the target field's @connect http config, rewriting args -> $this via link args
      const targetConnect = targetField?.directives?.find(d => d.name === 'connect');
      const targetHttp = targetConnect?.args?.http ? { ...targetConnect.args.http } : undefined;
      let pathTemplate: string | undefined;
      if (targetHttp) {
        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
          if (targetHttp[method]) {
            pathTemplate = String(targetHttp[method]);
            break;
          }
        }
      }
      const linkArgExprs: Record<string, string> = {};
      if (linkObj.args) {
        for (const [argName, interpolation] of Object.entries(linkObj.args)) {
          linkArgExprs[argName] = toConnectLinkExpression(interpolation);
        }
      }
      if (pathTemplate && Object.keys(linkArgExprs).length) {
        for (const [argName, connectExpr] of Object.entries(linkArgExprs)) {
          pathTemplate = pathTemplate.replaceAll(`{$args.${argName}}`, connectExpr);
          // Also support unconverted Mesh `{args.x}` left in some paths
          pathTemplate = pathTemplate.replaceAll(`{args.${argName}}`, connectExpr);
        }
      }
      const linkHttp: Record<string, unknown> = targetHttp
        ? {
            ...targetHttp,
            ...(pathTemplate
              ? {
                  GET: targetHttp.GET ? pathTemplate : undefined,
                  POST: targetHttp.POST ? pathTemplate : undefined,
                  PUT: targetHttp.PUT ? pathTemplate : undefined,
                  PATCH: targetHttp.PATCH ? pathTemplate : undefined,
                  DELETE: targetHttp.DELETE ? pathTemplate : undefined,
                  HEAD: targetHttp.HEAD ? pathTemplate : undefined,
                }
              : {}),
          }
        : {
            GET: '/',
          };
      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rewriteArgsExpr = (template: string) => {
        let out = template;
        for (const [argName, connectExpr] of Object.entries(linkArgExprs)) {
          // Keep templates with `{...}` interpolations intact for resolveTemplate.
          const replacement =
            connectExpr.includes('{') || connectExpr.startsWith('$(') || connectExpr.startsWith('$')
              ? connectExpr
              : `$(${JSON.stringify(connectExpr)})`;
          out = out.replaceAll(`{$args.${argName}}`, replacement);
          out = out.replace(
            new RegExp(`\\$args\\.${escapeRegExp(argName)}(?![\\w])`, 'g'),
            () => replacement,
          );
          out = out.replaceAll(`{args.${argName}}`, replacement);
        }
        return out;
      };
      // Rewrite target `$args.*` in queryParams / body / headers to link expressions.
      if (typeof linkHttp.queryParams === 'string' && Object.keys(linkArgExprs).length) {
        linkHttp.queryParams = rewriteArgsExpr(String(linkHttp.queryParams));
      }
      // Only strip leftover `$args` when the link mapped some args (unmapped remainders).
      // Links with no args mapping expose target args to the caller — keep selections.
      if (
        linkObj.args &&
        typeof linkHttp.queryParams === 'string' &&
        linkHttp.queryParams.includes('$args')
      ) {
        const cleaned = dropUnmappedArgEntries(String(linkHttp.queryParams));
        if (cleaned == null) {
          delete linkHttp.queryParams;
        } else {
          linkHttp.queryParams = cleaned;
        }
      }
      if (typeof linkHttp.body === 'string' && Object.keys(linkArgExprs).length) {
        linkHttp.body = rewriteArgsExpr(String(linkHttp.body));
      }
      if (linkObj.args && typeof linkHttp.body === 'string' && linkHttp.body.includes('$args')) {
        delete linkHttp.body;
      }
      if (Array.isArray(linkHttp.headers) && Object.keys(linkArgExprs).length) {
        linkHttp.headers = linkHttp.headers.map(
          (h: { name: string; value?: string; from?: string }) =>
            h?.value
              ? {
                  ...h,
                  value: rewriteArgsExpr(String(h.value)),
                }
              : h,
        );
      }
      for (const key of Object.keys(linkHttp)) {
        if (linkHttp[key] == null) {
          delete linkHttp[key];
        }
      }

      const linkSelection =
        targetConnect?.args?.selection ||
        (targetField?.type
          ? buildSelectionForType(
              typeof targetField.type === 'function'
                ? (targetField.type as any)()
                : (targetField.type as any),
              { limit: selectionLimit },
            )
          : '$') ||
        '$';
      const connectDirective = {
        name: 'connect',
        args: {
          source: subgraphName,
          http: linkHttp,
          selection: linkSelection,
        },
      };
      const fieldBase = {
        ...targetField,
        get args() {
          return linkObj.args ? {} : targetField?.args;
        },
        get description() {
          return linkObj.description || targetField?.description;
        },
      };
      // Apollo Router rejects `@connect` on interface fields, and putting the same
      // `@connect` on every implementor while the field remains on the interface
      // breaks Connectors subgraph extraction ("Electronics missing field self").
      // So for interface link maps: emit `@connect` only on concrete implementors
      // and do *not* declare the link field on the interface itself. Object types
      // keep the previous behaviour.
      if (schemaComposer.isInterfaceType(typeTC)) {
        const iFaceTC = typeTC as InterfaceTypeComposer;
        const implementorFields = {
          [linkName]: {
            ...fieldBase,
            directives: [connectDirective],
          },
        };
        for (const subTC of schemaComposer.types.values()) {
          if ('getInterfaces' in subTC) {
            if (
              subTC.getInterfaces().some(iFace => iFace.getTypeName() === iFaceTC.getTypeName())
            ) {
              subTC.addFields(implementorFields);
            }
          }
        }
      } else {
        typeTC.addFields({
          [linkName]: {
            ...fieldBase,
            directives: [connectDirective],
          },
        });
      }
    }
  };

  // Pass 1: attach @connect on root fields so link targets exist before pass 2.
  for (const operationConfig of operations) {
    const { httpMethod, rootTypeName, fieldName } = getOperationMetadata(operationConfig);

    const rootTypeComposer = schemaComposer[rootTypeName];

    const field = rootTypeComposer.getField(fieldName);

    if (isPubSubOperationConfig(operationConfig)) {
      field.description =
        operationConfig.description || `PubSub Topic: ${operationConfig.pubsubTopic}`;
      field.directives = field.directives || [];
      schemaComposer.addDirective(PubSubOperationDirective);
      field.directives.push({
        name: 'pubsubOperation',
        args: {
          subgraph: subgraphName,
          pubsubTopic: operationConfig.pubsubTopic,
        },
      });
    } else if (operationConfig.path) {
      if (process.env.DEBUG === '1' || process.env.DEBUG === 'fieldDetails') {
        field.description = `
>**Method**: \`${operationConfig.method}\`
>**Base URL**: \`${endpoint}\`
>**Path**: \`${operationConfig.path}\`
${operationConfig.description || ''}
`;
      } else {
        field.description = operationConfig.description;
      }

      field.directives = field.directives || [];
      schemaComposer.addDirective(ConnectDirective);
      const skipFields = new Set<string>();
      if ('links' in operationConfig && operationConfig.links) {
        for (const linkName of Object.keys(operationConfig.links)) {
          skipFields.add(linkName);
        }
      }
      // `_response` is baked into selection below — never expand as a normal JSON field.
      skipFields.add('_response');
      if ('responseByStatusCode' in operationConfig) {
        for (const statusCode in operationConfig.responseByStatusCode) {
          const responseConfig = operationConfig.responseByStatusCode[statusCode];
          if (responseConfig.links) {
            for (const linkName of Object.keys(responseConfig.links)) {
              skipFields.add(linkName);
            }
          }
        }
      }
      const exposeResponseMetadata =
        Boolean(
          'exposeResponseMetadata' in operationConfig && operationConfig.exposeResponseMetadata,
        ) ||
        Object.values(
          ('responseByStatusCode' in operationConfig && operationConfig.responseByStatusCode) || {},
        ).some(responseConfig => Boolean(responseConfig?.exposeResponseMetadata));
      const returnNamedType = getNamedType(field.type.getType());
      const interfaceImplementations =
        isInterfaceType(returnNamedType) && 'getInterfaceImplementors' in (schemaComposer as any)
          ? ((schemaComposer as any).getInterfaceImplementors?.(returnNamedType.name) || []).map(
              (tc: any) => tc.getType?.() || tc,
            )
          : isInterfaceType(returnNamedType)
            ? [...schemaComposer.types.values()]
                .filter((tc: any) => {
                  try {
                    return tc
                      .getInterfaces?.()
                      ?.some?.((i: any) => i.getTypeName?.() === returnNamedType.name);
                  } catch {
                    return false;
                  }
                })
                .map((tc: any) => tc.getType())
            : [];
      const statusUnionExtras =
        isUnionType(returnNamedType) && buildStatusUnionConnectExtras(returnNamedType);
      // Fresh visit budget per field so one Stripe op cannot starve the rest.
      selectionLimit.passthroughVisits = 0;
      const builtSelection = buildSelectionForType(field.type.getType(), {
        skipFields,
        implementations: interfaceImplementations,
        limit: selectionLimit,
      });
      let selection =
        builtSelection ||
        // Scalar / empty responses still need a non-empty Connectors selection
        `$`;
      // Ensure status-union `__typename` bake is present even when field pick was `$`/empty.
      if (
        statusUnionExtras?.typenameSelection &&
        selection === '$' &&
        !selection.includes('__typename')
      ) {
        selection = statusUnionExtras.typenameSelection;
      } else if (
        statusUnionExtras?.typenameSelection &&
        selection !== '$' &&
        !selection.includes('__typename')
      ) {
        selection = `${statusUnionExtras.typenameSelection} ${selection}`;
      }
      if (
        !builtSelection &&
        selection === '$' &&
        selectionLimit.overLimit === 'passthrough' &&
        (isObjectType(returnNamedType) ||
          isInterfaceType(returnNamedType) ||
          isUnionType(returnNamedType))
      ) {
        warnConnectSelectionPassthrough(selectionLimit, returnNamedType.name);
      }
      // Bake Mesh `_response` (hardcoded method; `$status` / `body: $`; rest filled at runtime).
      if (exposeResponseMetadata && !selection.includes('_response:')) {
        const metaSelection = responseMetadataConnectSelection(String(httpMethod));
        selection =
          selection === '$' || selection === '$root'
            ? `$ ${metaSelection}`
            : `${selection} ${metaSelection}`;
      }
      const http = buildConnectHttpArgs({
        httpMethod,
        path: operationConfig.path,
        headers: operationConfig.headers,
        queryParamArgMap: operationConfig.queryParamArgMap,
        queryStringOptionsByParam: operationConfig.queryStringOptionsByParam as
          | Record<
              string,
              { arrayFormat?: string; destructObject?: boolean; [key: string]: unknown }
            >
          | undefined,
        argTypeMap: operationConfig.argTypeMap as Record<string, { type?: string }> | undefined,
        // Prefer baking QS into queryParams; only unbaked form+explode remains below.
        queryStringOptions: operationConfig.queryStringOptions ?? queryStringOptions,
        bodySelection: inferBodySelection(operationConfig),
      });
      field.directives.push({
        name: 'connect',
        args: JSON.parse(
          JSON.stringify({
            source: subgraphName,
            http,
            selection,
            ...(statusUnionExtras?.isSuccess ? { isSuccess: statusUnionExtras.isSuccess } : {}),
          }),
        ),
      });
      // Rare leftover: form+explode on `@oneOf` / open objects cannot be written
      // onto queryParams keys; keep `@meshRestOptions` for runtime destructObject.
      const leftoverByParam = remainingQueryStringOptionsByParam(
        operationConfig.queryStringOptionsByParam as
          | Record<string, { arrayFormat?: string; destructObject?: boolean; deepObject?: boolean }>
          | undefined,
        operationConfig.queryParamArgMap,
        operationConfig.argTypeMap as
          | Record<
              string,
              { type?: string; properties?: Record<string, unknown>; anyOf?: any[]; oneOf?: any[] }
            >
          | undefined,
      );
      if (leftoverByParam) {
        meshRestOptionsFieldUsed = true;
        schemaComposer.addDirective(MeshRestOptionsDirective);
        const meshRestArgs = { queryStringOptionsByParam: leftoverByParam };
        field.directives.push({
          name: 'meshRestOptions',
          args: structuredClone(meshRestArgs),
        });
        field.extensions = field.extensions || {};
        (field.extensions as any).meshRestOptions = {
          ...((field.extensions as any).meshRestOptions || {}),
          ...meshRestArgs,
        };
      }

      if ('links' in operationConfig && operationConfig.links) {
        const typeTC = schemaComposer.getAnyTC(field.type.getTypeName());
        pendingLinks.push({
          linkMap: operationConfig.links,
          typeTC: typeTC as ObjectTypeComposer,
        });
      }

      if ('exposeResponseMetadata' in operationConfig && operationConfig.exposeResponseMetadata) {
        const typeTC = schemaComposer.getOTC(field.type.getTypeName());
        typeTC.addFields({
          _response: {
            type: responseMetadataType,
          },
        });
      }

      if ('responseByStatusCode' in operationConfig) {
        const unionOrSingleTC = schemaComposer.getAnyTC(getNamedType(field.type.getType()));
        const types =
          'getTypes' in unionOrSingleTC ? unionOrSingleTC.getTypes() : [unionOrSingleTC];
        const statusCodeOneOfIndexMap: Record<string, number> = {};
        const directives = unionOrSingleTC.getDirectives();
        for (const directive of directives) {
          if (directive.name === 'statusCodeOneOfIndex') {
            statusCodeOneOfIndexMap[directive.args?.statusCode as string] = directive.args
              ?.oneOfIndex as number;
          }
        }
        for (const statusCode in operationConfig.responseByStatusCode) {
          const responseConfig = operationConfig.responseByStatusCode[statusCode];
          if (responseConfig.links || responseConfig.exposeResponseMetadata) {
            const typeTCThunked = types[statusCodeOneOfIndexMap[statusCode] || 0];
            const originalName = typeTCThunked.getTypeName();
            let typeTC = schemaComposer.getAnyTC(originalName);
            if (!('addFieldArgs' in typeTC)) {
              schemaComposer.addDirective(ResolveRootDirective);
              typeTC = schemaComposer.createObjectTC({
                name: `${operationConfig.field}_${statusCode}_response`,
                fields: {
                  [originalName]: {
                    type: typeTC as any,
                    directives: [
                      {
                        name: 'resolveRoot',
                        args: {
                          subgraph: subgraphName,
                        },
                      },
                    ],
                  },
                },
              });
              // If it is a scalar or enum type, it cannot be a union type, so we can set it directly
              types[0] = typeTC;
              field.type = typeTC;
            }
            if (responseConfig.exposeResponseMetadata) {
              typeTC.addFields({
                _response: {
                  type: responseMetadataType,
                },
              });
            }
            if (responseConfig.links) {
              pendingLinks.push({
                linkMap: responseConfig.links,
                typeTC: typeTC as ObjectTypeComposer,
              });
            }
          }
        }
      }
    }
  }

  // Pass 2: wire link fields after every target @connect exists.
  for (const { linkMap, typeTC } of pendingLinks) {
    handleLinkMap(linkMap, typeTC);
  }

  // Pass 2b: cross-schema HATEOAS — type-level `@connect` on entity stub targets
  // so Hive hydrateEntityStub works inside this subgraph (no Mesh `@resolveTo`).
  schemaComposer.addDirective(ConnectDirective);
  for (const tc of schemaComposer.types.values()) {
    if (!('getTypeName' in tc) || typeof (tc as any).getDirectives !== 'function') {
      continue;
    }
    const typeName = (tc as ObjectTypeComposer).getTypeName();
    const meshTypeConnect = getMeshTypeConnect(typeName);
    if (!meshTypeConnect?.http) {
      continue;
    }
    const typeDirectives = [...((tc as ObjectTypeComposer).getDirectives() || [])];
    const already = typeDirectives.some(
      d =>
        d.name === 'connect' &&
        JSON.stringify(d.args?.http) === JSON.stringify(meshTypeConnect.http),
    );
    if (already) {
      continue;
    }
    typeDirectives.push({
      name: 'connect',
      args: {
        source: meshTypeConnect.source || subgraphName,
        http: meshTypeConnect.http,
        selection: meshTypeConnect.selection || 'id',
      },
    });
    (tc as ObjectTypeComposer).setDirectives(typeDirectives);
    registerMeshEntityType(typeName, ['id']);
  }

  log.debug(`Building the executable schema.`);
  if (schemaComposer.Query.getFieldNames().length === 0) {
    // Mutation-only OpenAPI: GraphQL still requires a Query type. A plain `dummy`
    // field is marked @inaccessible by Apollo Router Connectors (no @connect),
    // which then rejects an empty Query API schema. Emit a virtual connector so
    // the same Mesh SG works on Hive and Router.
    schemaComposer.addDirective(ConnectDirective);
    schemaComposer.Query.addFields({
      dummy: {
        type: 'String',
        directives: [
          {
            name: 'connect',
            args: {
              selection: '$("dummy")',
            },
          },
        ],
        resolve: () => 'dummy',
      },
    });
  }

  schemaComposer.addDirective(ConnectDirective);
  schemaComposer.addDirective(SourceDirective);
  schemaComposer.addDirective(LinkDirective);
  if (meshRestOptionsFieldUsed) {
    schemaComposer.addDirective(MeshRestOptionsDirective);
  }
  let schema = schemaComposer.buildSchema();
  const schemaExtensions: any = (schema.extensions = schema.extensions || {});
  schemaExtensions.directives = schemaExtensions.directives || {};
  // Federation Connectors source — replaces Mesh @transport for REST subgraphs
  schemaExtensions.directives.source = [
    buildSourceDirectiveArgs({
      name: subgraphName,
      endpoint,
      headers:
        typeof operationHeaders === 'object' && operationHeaders
          ? (operationHeaders as Record<string, string>)
          : undefined,
      queryParams,
    }),
  ];
  const linkDirectives: Array<{ url: string; import: string[] }> = [
    {
      url: CONNECT_LINK_URL,
      import: ['@connect', '@source'],
    },
  ];
  if (meshRestOptionsFieldUsed) {
    linkDirectives.push({
      url: MESH_SPEC_LINK_URL,
      import: ['@meshRestOptions'],
    });
  }
  schemaExtensions.directives.link = [
    ...(schemaExtensions.directives.link || []),
    ...linkDirectives,
  ];
  // Keep handlerName available for debugging without Mesh @transport
  schemaExtensions.meshHandlerName = handlerName;
  // Schema-level qs defaults for form-urlencoded bodies / any unbaked nested objects.
  // Query-string shapes are preferred baked into `@connect(http.queryParams:)`.
  if (queryStringOptions) {
    schemaExtensions.meshRestOptions = {
      ...(schemaExtensions.meshRestOptions || {}),
      queryStringOptions,
    };
  }
  // Fix orphaned interfaces; bake Connectors equivalents while `@enum` is still present.
  schema = mapSchema(schema, {
    [MapperKind.TYPE]: type => {
      if (isInterfaceType(type)) {
        const { objects, interfaces } = schema.getImplementations(type);
        if (objects.length === 0 && interfaces.length === 0) {
          return new GraphQLObjectType(type.toConfig() as any);
        }
      }
      return type;
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) =>
      finalizeConnectorsField(fieldConfig, typeName),
    [MapperKind.INTERFACE_FIELD]: (fieldConfig, _fieldName, typeName) =>
      finalizeConnectorsField(fieldConfig, typeName),
  });
  // Strip Mesh execution directives now that connect selections/paths carry the remap.
  schema = mapSchema(schema, {
    [MapperKind.ENUM_VALUE]: enumValueConfig => stripDirectiveFromConfig(enumValueConfig, 'enum'),
    [MapperKind.OBJECT_TYPE]: type => stripTypeDirective(type, 'discriminator'),
    [MapperKind.INTERFACE_TYPE]: type => stripTypeDirective(type, 'discriminator'),
    [MapperKind.UNION_TYPE]: type => {
      let next = stripTypeDirective(type, 'discriminator');
      next = stripTypeDirective(next, 'statusCodeTypeName');
      return next;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      let next = stripDirectiveFromConfig(fieldConfig, 'resolveRoot');
      next = stripDirectiveFromConfig(next, 'flatten');
      next = stripDirectiveFromConfig(next, 'resolveRootField');
      next = stripDirectiveFromConfig(next, 'dictionary');
      return next;
    },
    [MapperKind.INTERFACE_FIELD]: fieldConfig => {
      let next = stripDirectiveFromConfig(fieldConfig, 'resolveRoot');
      next = stripDirectiveFromConfig(next, 'flatten');
      next = stripDirectiveFromConfig(next, 'resolveRootField');
      next = stripDirectiveFromConfig(next, 'dictionary');
      return next;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: fieldConfig =>
      stripDirectiveFromConfig(fieldConfig, 'resolveRootField'),
    [MapperKind.ARGUMENT]: argConfig => stripDirectiveFromConfig(argConfig, 'resolveRootField'),
  });
  // Drop unused Mesh directive definitions when nothing references them.
  schema = mapSchema(schema, {
    [MapperKind.DIRECTIVE]: directive => {
      if (
        (directive.name === 'enum' ||
          directive.name === 'discriminator' ||
          directive.name === 'resolveRootField' ||
          directive.name === 'resolveRoot' ||
          directive.name === 'flatten' ||
          directive.name === 'statusCodeTypeName' ||
          directive.name === 'dictionary') &&
        !schemaHasDirectiveUsage(schema, directive.name)
      ) {
        return null;
      }
      return directive;
    },
  });
  flushConnectSelectionPassthroughWarnings(selectionLimit);
  return schema;
}

function finalizeConnectorsField(
  fieldConfig: GraphQLFieldConfig<any, any>,
  typeName: string,
): GraphQLFieldConfig<any, any> {
  let next = fieldConfig;
  const ext = (next.extensions || {}) as { directives?: Record<string, any[]> };
  // After `schemaComposer.buildSchema()`, directives often live on `astNode` only —
  // `getDirectiveExtensions` merges AST + extensions (extensions alone miss `@connect`).
  const directives = {
    ...(getDirectiveExtensions(next) || {}),
    ...(ext.directives || {}),
  };

  // Root HTTP `@connect`: rewrite enum args, bake input RRF body, bake enum `$` roots.
  if (directives.connect?.length) {
    directives.connect = directives.connect.map((connectArgs: any) => {
      let nextConnect = { ...connectArgs };
      if (nextConnect.http) {
        const http = { ...nextConnect.http };
        if (next.args) {
          for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
            if (typeof http[method] === 'string') {
              http[method] = rewriteConnectPathEnumArgs(http[method], next.args as any);
            }
          }
          if (typeof http.queryParams === 'string') {
            http.queryParams = rewriteQueryParamsEnumArgs(http.queryParams, next.args as any);
          }
          if (Array.isArray(http.headers)) {
            http.headers = http.headers.map((h: any) =>
              h?.value != null
                ? { ...h, value: rewriteConnectPathEnumArgs(String(h.value), next.args as any) }
                : h,
            );
          }
          if (typeof http.body === 'string') {
            http.body = bakeInputBodySelection(http.body, next.args as any);
          }
        }
        nextConnect = { ...nextConnect, http };
      }
      if (typeof nextConnect.selection === 'string' && next.type) {
        nextConnect = {
          ...nextConnect,
          selection: bakeEnumRootSelection(nextConnect.selection, next.type as any),
        };
      }
      return nextConnect;
    });
    next = {
      ...next,
      extensions: { ...ext, directives: { ...directives } },
      astNode: undefined,
    };
  }

  // Output Mesh dirs → Connectors / drop (input RRF baked into http.body above).
  let fieldDirsChanged = false;
  if (directives.resolveRootField) {
    delete directives.resolveRootField;
    fieldDirsChanged = true;
  }
  // `@resolveRoot` → virtual `@connect(selection: "$")` (parent value IS the field).
  if (directives.resolveRoot?.length && !directives.connect?.length) {
    directives.connect = [{ selection: '$' }];
    delete directives.resolveRoot;
    fieldDirsChanged = true;
  } else if (directives.resolveRoot) {
    delete directives.resolveRoot;
    fieldDirsChanged = true;
  }
  if (directives.flatten) {
    delete directives.flatten;
    fieldDirsChanged = true;
  }
  // `@dictionary` baked into parent `@connect(selection:)` as `$->entries->filter(...)`.
  if (directives.dictionary) {
    delete directives.dictionary;
    fieldDirsChanged = true;
  }
  if (fieldDirsChanged) {
    next = {
      ...next,
      extensions: { ...ext, directives },
      astNode: undefined,
    };
  }

  return next;
}

function rewriteQueryParamsEnumArgs(
  queryParams: string,
  args: Record<string, { type: any }>,
): string {
  let next = queryParams;
  for (const [argName, arg] of Object.entries(args || {})) {
    const named = getNamedType(arg.type);
    if (!isEnumType(named)) continue;
    const bare = `$args.${argName}`;
    // GraphQL argument names are [_A-Za-z0-9]; boundary avoids `$args.sort` → `$args.sortOrder`.
    const bareRe = new RegExp(`\\$args\\.${argName}(?![\\w])(?!->match\\()`, 'g');
    if (!bareRe.test(next)) continue;
    bareRe.lastIndex = 0;
    const wrapped = wrapArgExprWithEnumMatch(bare, named);
    next = next.replace(bareRe, () => wrapped);
  }
  return next;
}

/**
 * Register object/interface return types of Query GET-by-key operations so
 * parent selections can emit entity stubs (`supplier: { id: supplierId }`).
 * Key detection is shared with fusion composition (`entityKeyFieldsFromHttpPath`).
 */
function registerEntityTypeFromGetPath(
  returnNamedType: ReturnType<typeof getNamedType>,
  path: string,
): void {
  if (!isObjectType(returnNamedType) && !isInterfaceType(returnNamedType)) {
    return;
  }
  const keyFields = entityKeyFieldsFromHttpPath(
    path,
    Object.keys(returnNamedType.getFields()).map(String),
  );
  if (keyFields?.length) {
    registerMeshEntityType(returnNamedType.name, keyFields);
  }
}

function stripDirectiveFromConfig<T extends { extensions?: any; astNode?: any }>(
  config: T,
  directiveName: string,
): T {
  const ext = config.extensions as { directives?: Record<string, unknown> } | undefined;
  if (
    !ext?.directives?.[directiveName] &&
    !config.astNode?.directives?.some((d: any) => d.name.value === directiveName)
  ) {
    return config;
  }
  const directives = { ...(ext?.directives || {}) };
  delete directives[directiveName];
  return {
    ...config,
    extensions: { ...ext, directives },
    astNode: undefined,
  };
}

function stripTypeDirective(type: any, directiveName: string): any {
  const ext = type.extensions as { directives?: Record<string, unknown> } | undefined;
  const hasExt = Boolean(ext?.directives?.[directiveName]);
  const hasAst = Boolean(
    type.astNode?.directives?.some((d: any) => d.name.value === directiveName),
  );
  if (!hasExt && !hasAst) return type;
  const directives = { ...(ext?.directives || {}) };
  delete directives[directiveName];
  const config = type.toConfig();
  const nextConfig = {
    ...config,
    extensions: { ...ext, directives },
    astNode: undefined,
  };
  if (isObjectType(type)) return new GraphQLObjectType(nextConfig);
  if (isInterfaceType(type)) return new GraphQLInterfaceType(nextConfig);
  if (isUnionType(type)) return new GraphQLUnionType(nextConfig);
  return type;
}

function schemaHasDirectiveUsage(schema: GraphQLSchema, name: string): boolean {
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    const typeExt = (type.extensions as any)?.directives?.[name];
    if (typeExt) return true;
    if (type.astNode?.directives?.some((d: any) => d.name.value === name)) return true;
    if ('getValues' in type && typeof (type as any).getValues === 'function') {
      for (const ev of (type as any).getValues()) {
        if ((ev.extensions as any)?.directives?.[name]) return true;
        if (ev.astNode?.directives?.some((d: any) => d.name.value === name)) return true;
      }
    }
    if ('getFields' in type) {
      for (const field of Object.values((type as any).getFields())) {
        if ((field as any).extensions?.directives?.[name]) return true;
        if ((field as any).astNode?.directives?.some((d: any) => d.name.value === name)) {
          return true;
        }
        for (const arg of (field as any).args || []) {
          if (arg.extensions?.directives?.[name]) return true;
          if (arg.astNode?.directives?.some((d: any) => d.name.value === name)) return true;
        }
      }
    }
  }
  return false;
}
