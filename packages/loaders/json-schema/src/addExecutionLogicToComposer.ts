import type { GraphQLScalarType } from 'graphql';
import {
  getNamedType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  isInterfaceType,
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
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  buildConnectHttpArgs,
  buildSelectionForType,
  buildSourceDirectiveArgs,
  buildStatusUnionConnectExtras,
  CONNECT_LINK_URL,
  ConnectDirective,
  inferBodySelection,
  LinkDirective,
  MESH_SPEC_LINK_URL,
  MeshRestOptionsDirective,
  SourceDirective,
  toConnectLinkExpression,
} from './connectAnnotations.js';
import {
  PubSubOperationDirective,
  ResolveRootDirective,
  ResponseMetadataDirective,
} from './directives.js';
import type {
  JSONSchemaHTTPJSONOperationConfig,
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
  }: AddExecutionLogicToComposerOptions,
) {
  log.debug(`Attaching execution directives to the schema`);
  type PendingLinks = {
    linkMap: Record<string, JSONSchemaLinkConfig>;
    typeTC: ObjectTypeComposer | InterfaceTypeComposer;
  };
  const pendingLinks: PendingLinks[] = [];
  let meshRestOptionsFieldUsed = false;

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
            )
          : '$') ||
        '$';
      const fields = {
        [linkName]: {
          ...targetField,
          directives: [
            {
              name: 'connect',
              args: {
                source: subgraphName,
                http: linkHttp,
                selection: linkSelection,
              },
            },
          ],
          get args() {
            return linkObj.args ? {} : targetField?.args;
          },
          get description() {
            return linkObj.description || targetField?.description;
          },
        },
      };
      typeTC.addFields(fields);
      if (schemaComposer.isInterfaceType(typeTC)) {
        const iFaceTC = typeTC as InterfaceTypeComposer;
        for (const subTC of schemaComposer.types.values()) {
          if ('getInterfaces' in subTC) {
            if (
              subTC.getInterfaces().some(iFace => iFace.getTypeName() === iFaceTC.getTypeName())
            ) {
              subTC.addFields(fields);
            }
          }
        }
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
      const returnNamedType = getNamedType(field.type.getType());
      const selection =
        buildSelectionForType(field.type.getType(), { skipFields }) ||
        // Scalar / empty responses still need a non-empty Connectors selection
        `$`;
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
        bodySelection: inferBodySelection(operationConfig),
      });
      const statusUnionExtras =
        isUnionType(returnNamedType) && buildStatusUnionConnectExtras(returnNamedType);
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
      // Mesh-only options: emit `@meshRestOptions` so compose→SDL→reload keeps them
      // (field.extensions alone are dropped when the schema is printed).
      const operationQueryStringOptions = operationConfig.queryStringOptions;
      const httpOpForRest =
        'path' in operationConfig
          ? (operationConfig as JSONSchemaHTTPJSONOperationConfig)
          : undefined;
      const requestBaseBody =
        httpOpForRest &&
        (httpOpForRest.requestTypeName ||
          httpOpForRest.requestSample != null ||
          httpOpForRest.requestSchema != null) &&
        httpOpForRest.requestBaseBody != null
          ? httpOpForRest.requestBaseBody
          : undefined;
      const isBinary = 'binary' in operationConfig && Boolean((operationConfig as any).binary);
      const operationTimeout =
        'timeout' in operationConfig && typeof (operationConfig as any).timeout === 'number'
          ? (operationConfig as any).timeout
          : undefined;
      const meshRestArgs: Record<string, unknown> = {
        ...(operationConfig.queryStringOptionsByParam
          ? { queryStringOptionsByParam: operationConfig.queryStringOptionsByParam }
          : {}),
        ...((operationQueryStringOptions || queryStringOptions) && {
          queryStringOptions: operationQueryStringOptions ?? queryStringOptions,
        }),
        ...(requestBaseBody !== undefined ? { requestBaseBody } : {}),
        ...(isBinary ? { isBinary: true } : {}),
        ...(operationTimeout !== undefined ? { timeout: operationTimeout } : {}),
      };
      if (Object.keys(meshRestArgs).length) {
        meshRestOptionsFieldUsed = true;
        schemaComposer.addDirective(MeshRestOptionsDirective);
        field.directives.push({
          name: 'meshRestOptions',
          args: JSON.parse(JSON.stringify(meshRestArgs)),
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
        schemaComposer.addDirective(ResponseMetadataDirective);
        typeTC.addFields({
          _response: {
            type: responseMetadataType,
            directives: [
              {
                name: 'responseMetadata',
                args: {
                  subgraph: subgraphName,
                },
              },
            ],
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
              schemaComposer.addDirective(ResponseMetadataDirective);
              typeTC.addFields({
                _response: {
                  type: responseMetadataType,
                  directives: [
                    {
                      name: 'responseMetadata',
                      args: {
                        subgraph: subgraphName,
                      },
                    },
                  ],
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

  log.debug(`Building the executable schema.`);
  if (schemaComposer.Query.getFieldNames().length === 0) {
    schemaComposer.Query.addFields({
      dummy: {
        type: 'String',
        resolve: () => 'dummy',
      },
    });
  }

  // Only declare/import `@meshRestOptions` when a field emitted it or schema-level qs is set.
  const meshRestOptionsUsed = meshRestOptionsFieldUsed || Boolean(queryStringOptions);

  schemaComposer.addDirective(ConnectDirective);
  schemaComposer.addDirective(SourceDirective);
  schemaComposer.addDirective(LinkDirective);
  if (meshRestOptionsUsed) {
    schemaComposer.addDirective(MeshRestOptionsDirective);
  }
  let schema = schemaComposer.buildSchema();
  const schemaExtensions: any = (schema.extensions = schema.extensions || {});
  schemaExtensions.directives = schemaExtensions.directives || {};
  // Apollo Connectors source — replaces Mesh @transport for REST subgraphs
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
  if (meshRestOptionsUsed) {
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
  // Schema-level qs defaults (also mirrored per-field via @meshRestOptions when set)
  if (queryStringOptions) {
    schemaExtensions.meshRestOptions = {
      ...(schemaExtensions.meshRestOptions || {}),
      queryStringOptions,
    };
  }
  // Fix orphaned interfaces; drop Mesh `@resolveRootField` from *output* fields —
  // JSON key remapping is already folded into `@connect(selection:)` aliases
  // (`foo_bar: foo-bar`). Keep it on input/argument fields so request bodies still
  // de-sanitize GraphQL names → JSON property names via resolveDataByUnionInputType.
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
    // Use OBJECT/INTERFACE field mappers — MapperKind.FIELD also matches input fields.
    [MapperKind.OBJECT_FIELD]: fieldConfig => stripResolveRootFieldFromConfig(fieldConfig),
    [MapperKind.INTERFACE_FIELD]: fieldConfig => stripResolveRootFieldFromConfig(fieldConfig),
  });
  // Drop the directive definition when nothing references it anymore (GET-only APIs).
  if (!schemaHasResolveRootFieldUsage(schema)) {
    schema = mapSchema(schema, {
      [MapperKind.DIRECTIVE]: directive =>
        directive.name === 'resolveRootField' ? null : directive,
    });
  }
  return schema;
}

function schemaHasResolveRootFieldUsage(schema: import('graphql').GraphQLSchema): boolean {
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    if ('getFields' in type) {
      for (const field of Object.values(type.getFields())) {
        const ext = (field as any).extensions?.directives?.resolveRootField;
        if (ext?.length) return true;
        if (
          (field as any).astNode?.directives?.some((d: any) => d.name.value === 'resolveRootField')
        ) {
          return true;
        }
        if ('args' in field) {
          for (const arg of (field as any).args || []) {
            if (arg.extensions?.directives?.resolveRootField?.length) return true;
            if (arg.astNode?.directives?.some((d: any) => d.name.value === 'resolveRootField')) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function stripResolveRootFieldFromConfig<
  T extends {
    astNode?: { directives?: readonly { name: { value: string } }[] } | null;
    extensions?: unknown;
  },
>(config: T): T {
  const ext = config.extensions as { directives?: Record<string, unknown> } | undefined;
  const hasExt = Boolean(ext?.directives?.resolveRootField);
  const hasAst = Boolean(
    config.astNode?.directives?.some(d => d.name.value === 'resolveRootField'),
  );
  if (!hasExt && !hasAst) {
    return config;
  }
  const nextExt = ext
    ? {
        ...ext,
        directives: ext.directives
          ? Object.fromEntries(
              Object.entries(ext.directives).filter(([name]) => name !== 'resolveRootField'),
            )
          : ext.directives,
      }
    : config.extensions;
  const nextAst =
    config.astNode && hasAst
      ? {
          ...config.astNode,
          directives: (config.astNode.directives || []).filter(
            d => d.name.value !== 'resolveRootField',
          ),
        }
      : config.astNode;
  return {
    ...config,
    extensions: nextExt,
    astNode: nextAst as T['astNode'],
  };
}
