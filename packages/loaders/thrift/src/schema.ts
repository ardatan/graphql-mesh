import type {
  ConstValueNode,
  GraphQLEnumValueConfigMap,
  GraphQLField,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLSchema as GraphQLSchemaType,
} from 'graphql';
import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  isObjectType,
  Kind,
} from 'graphql';
import { GraphQLBigInt, GraphQLByte, GraphQLJSON, GraphQLVoid } from 'graphql-scalars';
import type {
  Comment,
  FunctionType,
  IncludeDefinition,
  ThriftDocument,
} from '@creditkarma/thrift-parser';
import { parse, SyntaxType } from '@creditkarma/thrift-parser';
import { TType } from '@creditkarma/thrift-server-core';
import { Logger } from '@graphql-hive/logger';
import { path } from '@graphql-mesh/cross-helpers';
import {
  CONNECT_LINK_URL,
  ConnectDirective,
  LinkDirective,
  SourceDirective,
} from '@graphql-mesh/transport-connect';
import type {
  GraphQLThriftAnnotations,
  StructTypeVal,
  TypeMap,
  TypeVal,
} from '@graphql-mesh/transport-thrift';
import type { ImportFn, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import { getDirectivesInExtensions } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import {
  buildCompactArgs,
  buildCompactSelection,
  buildCompactThrows,
  buildTJSONConnectBody,
  buildTJSONConnectSelection,
  buildTJSONUnionConnectSelection,
  thriftJsonContentTypeHeaders,
  TJSON_ERRORS,
  TJSON_IS_SUCCESS,
  TJSON_IS_SUCCESS_VOID,
  TJSON_IS_SUCCESS_VOID_WITH_THROWS,
  type ThriftProtocol,
} from './mapping.js';

/**
 * Options for {@link loadThriftSubgraph} / {@link loadNonExecutableGraphQLSchemaFromIDL}.
 * IDL path + HTTP endpoint become `@transport(kind: "thrift")` (binary) or
 * `@source` / `@connect` (json / TJSON).
 *
 * @example
 * ```ts
 * import { loadThriftSubgraph } from '@omnigraph/thrift';
 *
 * loadThriftSubgraph('calculator', {
 *   source: './calculator.thrift',
 *   endpoint: 'http://localhost:8080/thrift',
 *   serviceName: 'Calculator',
 *   protocol: 'binary',
 * });
 * ```
 * @example
 * ```ts
 * // TJSON over HTTP via `@connect` (no thrift transport)
 * loadThriftSubgraph('calc', {
 *   source: './calc.thrift',
 *   endpoint: 'http://localhost:4000/thrift-json',
 *   protocol: 'json',
 * });
 * ```
 */
export interface GraphQLThriftLoaderOptions {
  /**
   * Subgraph name (also default `@thrift__rpc(subgraph:)` / `@source(name:)`).
   *
   * @example 'calculator'
   */
  subgraphName: string;

  /**
   * Path or URL to the `.thrift` IDL. Local `include` paths are resolved on the
   * filesystem relative to this file. Remote IDLs can be fetched as the root
   * `source`, but remote `include` resolution is not supported (includes are
   * still resolved with filesystem `path.resolve`).
   *
   * @example './services/calculator/calculator.thrift'
   */
  source: string;
  /**
   * HTTP base URL for the Thrift endpoint - becomes `@transport(location)` (binary)
   * or `@source(http.baseURL)` (json).
   *
   * @example 'http://localhost:8080/thrift'
   */
  endpoint: string;
  /**
   * Headers sent on every RPC call (binary `@transport(headers:)` / json
   * `@source` headers). Not used for remote IDL fetch - see `schemaHeaders`.
   *
   * @default {}
   * @example { 'x-api-key': '123' }
   */
  operationHeaders?: Record<string, string>;
  /**
   * Thrift service name - optional for single-service endpoints. With `protocol: 'json'`,
   * sets `@connect(http.POST: "/<service>")`; omitted -> `POST: "/"`.
   *
   * @example 'Calculator'
   */
  serviceName?: string;
  /**
   * Emit switch: `binary` uses thrift `@transport` + `@thrift__rpc`;
   * `json` emits `@source` / `@connect` (TJSON over HTTP).
   *
   * @default 'binary'
   * @example 'json'
   */
  protocol?: ThriftProtocol;
  /**
   * Function names that should emit `entity: true` on `@thrift__rpc` / `@connect`
   * (Query entity resolvers for Mesh `_entities`).
   *
   * @default []
   * @example ['getUser', 'getTweet']
   */
  entityMethods?: string[];
  /**
   * When true, IDL `throws` are not modeled in the GraphQL return type.
   * Set false to emit exception object types + a union return (`Success | Throws...`).
   *
   * @default true
   */
  ignoreExceptions?: boolean;

  /**
   * Base directory for relative IDL paths.
   *
   * @default process.cwd()
   * @example '/app/idl'
   */
  baseDir?: string;
  /**
   * HTTP headers when `source` is a remote IDL URL. Used only during
   * compose-time fetch of that root IDL, not on runtime RPC calls. Does not
   * enable remote `include` resolution (see `source`).
   *
   * @default {}
   * @example { Authorization: 'Bearer ...' }
   */
  schemaHeaders?: Record<string, string>;
  /**
   * Custom fetch for a remote root IDL during compose (not for remote includes).
   *
   * @default defaultFetch from `@whatwg-node/fetch`
   */
  fetchFn?: MeshFetch;
  /**
   * Logger instance for IDL load / emit diagnostics.
   *
   * @default new Logger({ prefix: 'Thrift' })
   */
  log?: Logger;
  /**
   * Custom `import()` helper for Mesh file loading (local IDL / config modules).
   *
   * @default defaultImportFn
   */
  importFn?: ImportFn;
}

/**
 * Arguments for the `@thrift__rpc` field directive (binary protocol emit / hand-authored SDL).
 *
 * @example
 * ```graphql
 * type Query {
 *   add(request: AddRequestInput): Int
 *     @thrift__rpc(
 *       subgraph: "Calc"
 *       function: "add"
 *       args: """
 *         1(struct): $args.request {
 *           1(i32): left
 *           2(i32): right
 *         }
 *       """
 *       selection: "$(i32)"
 *       messageType: CALL
 *     )
 * }
 * ```
 * @example
 * ```graphql
 * # ONEWAY void - no reply body
 * type Query {
 *   zip: Void
 *     @thrift__rpc(
 *       function: "zip"
 *       args: ""
 *       selection: "$(void)"
 *       messageType: ONEWAY
 *     )
 * }
 * ```
 */
export interface ThriftRpcDirectiveArgs {
  /**
   * Owning subgraph name when composing federated schemas (optional locally).
   *
   * @example 'calculator'
   */
  subgraph?: string;
  /**
   * Optional Thrift service name for documentation / tooling on hand-authored
   * SDL. The binary thrift executor does not use this arg to select an HTTP
   * path - configure the full endpoint with `@transport(location:)` instead.
   * (JSON/`@connect` emit uses loader `serviceName` for `POST /<service>`.)
   *
   * @example 'Calculator'
   */
  service?: string;
  /**
   * IDL function / method name invoked on the wire.
   *
   * @example 'add'
   */
  function: string;
  /**
   * Compact GraphQL-arg → Thrift field-id mapping (`id(wire): $args...`).
   *
   * @example '1(i32): $args.left\n2(i32): $args.right'
   */
  args: string;
  /**
   * Compact Thrift result → GraphQL field mapping (`field: id(wire)` or `$(wire)`).
   *
   * @example 'id: 1(i64)\ntext: 2(string)'
   */
  selection: string;
  /**
   * Compact IDL `throws` mapping when `ignoreExceptions: false`
   * (`TypeName: <resultFieldId> { field: id(wire) }`).
   *
   * @example 'InvalidRequest: 1 {\n  message: 1(string)\n}'
   */
  throws?: string;
  /**
   * Thrift message type: `CALL` (expects reply) or `ONEWAY` (fire-and-forget).
   *
   * @default 'CALL'
   * @example 'ONEWAY'
   */
  messageType?: 'CALL' | 'ONEWAY';
  /**
   * When true, this Query field is an entity resolver for Mesh `_entities`.
   */
  entity?: boolean;
}

/** Thrift binary message type for `@thrift__rpc(messageType:)` (`CALL` | `ONEWAY`). */
export const ThriftMessageTypeEnum = new GraphQLEnumType({
  name: 'ThriftMessageType',
  values: {
    /** Normal RPC call; wait for and decode a reply. */
    CALL: { value: 'CALL' },
    /** Fire-and-forget; no reply body is expected. */
    ONEWAY: { value: 'ONEWAY' },
  },
});

/** Mesh Thrift binary RPC mapping directive - see {@link ThriftRpcDirectiveArgs}. */
export const thriftRpcDirective = new GraphQLDirective({
  name: 'thrift__rpc',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    /** Owning subgraph name when composing federated schemas. */
    subgraph: { type: GraphQLString },
    /** Optional service name on hand-authored SDL (not used for binary HTTP path). */
    service: { type: GraphQLString },
    /** IDL function name invoked on the wire. */
    function: { type: new GraphQLNonNull(GraphQLString) },
    /** Compact GraphQL-arg -> Thrift field-id mapping (`id(wire): $args...`). */
    args: { type: new GraphQLNonNull(GraphQLString) },
    /** Compact Thrift result -> GraphQL field mapping (`field: id(wire)` or `$(wire)`). */
    selection: { type: new GraphQLNonNull(GraphQLString) },
    /** Compact IDL throws mapping when exceptions are modeled. */
    throws: { type: GraphQLString },
    /** `CALL` or `ONEWAY`. @default 'CALL' */
    messageType: { type: ThriftMessageTypeEnum, defaultValue: 'CALL' },
    /** Mark this Query field as an entity resolver for Mesh `_entities`. */
    entity: { type: GraphQLBoolean },
  },
});

/**
 * Introspect a `.thrift` IDL and emit a non-executable GraphQL schema with
 * `@thrift__rpc` (binary) or `@connect` (json) mappings.
 *
 * Prefer {@link loadThriftSubgraph} from Mesh compose; call this directly when you
 * need the schema object (tests, custom executors).
 *
 * @example
 * ```ts
 * const schema = await loadNonExecutableGraphQLSchemaFromIDL({
 *   subgraphName: 'Calc',
 *   source: './calc.thrift',
 *   endpoint: 'http://localhost:4000/thrift',
 *   protocol: 'binary',
 * });
 * ```
 */
export async function loadNonExecutableGraphQLSchemaFromIDL({
  subgraphName,
  source,
  endpoint,
  operationHeaders = {},
  serviceName,
  protocol = 'binary',
  entityMethods = [],
  ignoreExceptions = true,

  baseDir = globalThis.process?.cwd?.(),
  schemaHeaders = {},
  fetchFn = defaultFetch,
  log = new Logger({ prefix: 'Thrift' }),
  importFn = defaultImportFn,
}: GraphQLThriftLoaderOptions) {
  const namespaceASTMap: Record<string, ThriftDocument> = {};
  await parseWithIncludes({
    idlFilePath: source,
    includesMap: namespaceASTMap,
    baseDir,
    schemaHeaders,
    fetchFn,
    log,
    importFn,
  });
  const baseNamespace = path.basename(source, '.thrift');
  return loadNonExecutableGraphQLSchemaFromThriftDocument({
    subgraphName,
    baseNamespace,
    namespaceASTMap,
    location: endpoint,
    headers: operationHeaders,
    serviceName,
    protocol,
    entityMethods,
    ignoreExceptions,
  });
}

interface ParseWithIncludesOpts {
  idlFilePath: string;
  includesMap: Record<string, ThriftDocument>;
  baseDir: string;
  schemaHeaders: Record<string, string>;
  fetchFn: MeshFetch;
  log: Logger;
  importFn: ImportFn;
}

async function parseWithIncludes({
  idlFilePath,
  includesMap,
  baseDir,
  schemaHeaders,
  fetchFn,
  log,
  importFn,
}: ParseWithIncludesOpts): Promise<Record<string, ThriftDocument>> {
  const rawThrift = await readFileOrUrl<string>(idlFilePath, {
    allowUnknownExtensions: true,
    cwd: baseDir,
    headers: schemaHeaders,
    fetch: fetchFn,
    log,
    importFn,
  });
  const parseResult = parse(rawThrift, { organize: false });
  const idlNamespace = path.basename(idlFilePath).split('.')[0];
  if (parseResult.type === SyntaxType.ThriftErrors) {
    if (parseResult.errors.length === 1) {
      throw parseResult.errors[0];
    }
    throw new AggregateError(parseResult.errors);
  }
  includesMap[idlNamespace] = parseResult;
  const includes = parseResult.body.filter(
    (statement): statement is IncludeDefinition => statement.type === SyntaxType.IncludeDefinition,
  );
  await Promise.all(
    includes.map(async include => {
      const absoluteIdlFilePath = path.isAbsolute(idlFilePath)
        ? idlFilePath
        : path.resolve(baseDir, idlFilePath);
      const includePath = path.resolve(path.dirname(absoluteIdlFilePath), include.path.value);
      await parseWithIncludes({
        idlFilePath: includePath,
        includesMap,
        baseDir,
        schemaHeaders,
        fetchFn,
        log,
        importFn,
      });
    }),
  );
  return includesMap;
}

export function loadNonExecutableGraphQLSchemaFromThriftDocument({
  subgraphName,
  baseNamespace,
  namespaceASTMap,
  location,
  headers = {},
  serviceName,
  protocol = 'binary',
  entityMethods = [],
  ignoreExceptions = true,
}: {
  subgraphName: string;
  baseNamespace: string;
  namespaceASTMap: Record<string, ThriftDocument>;
  location: string;
  headers: Record<string, string>;
  serviceName?: string;
  protocol?: ThriftProtocol;
  entityMethods?: string[];
  ignoreExceptions?: boolean;
}) {
  const enumTypeMap = new Map<string, GraphQLEnumType>();
  const outputTypeMap = new Map<string, GraphQLOutputType>();
  const inputTypeMap = new Map<string, GraphQLInputType>();
  const exceptionTypeMap = new Map<string, GraphQLObjectType>();
  const rootFields: GraphQLFieldConfigMap<any, any> = {};
  const topTypeMap: TypeMap = {};
  const entityMethodSet = new Set(entityMethods);
  const emitConnect = protocol === 'json';
  let currentId = 0;
  // Defer service mapping until every named type is in topTypeMap (forward refs).
  const pendingServices: Array<{ statement: any }> = [];
  // Typedefs can forward-ref structs/enums declared later - resolve after named types.
  const pendingTypedefs: Array<{ statement: any; typeName: string }> = [];

  for (const namespace of Object.keys(namespaceASTMap).reverse()) {
    const thriftAST = namespaceASTMap[namespace];
    for (const statement of thriftAST.body) {
      let typeName = 'name' in statement ? statement.name.value : undefined;
      if (namespace !== baseNamespace) {
        typeName = `${namespace}_${typeName}`;
      }
      switch (statement.type) {
        case SyntaxType.EnumDefinition: {
          // GraphQL always uses member names. Wire i32 tables live in:
          // - binary: compact `@thrift__rpc` `i32` + `->match` on args/selection
          // - json: `@connect` `->match` arms baked from the same table
          let nextEnumValue = 0;
          const wireValues: Record<string, number> = {};
          const enumValues = statement.members.reduce((prev, curr) => {
            let value = nextEnumValue;
            const init = curr.initializer?.value?.value;
            if (init != null) {
              // IntegerLiteral ("2") or HexLiteral ("0xa")
              value = Number.parseInt(String(init), 0);
            }
            nextEnumValue = value + 1;
            wireValues[curr.name.value] = value;
            return {
              ...prev,
              [curr.name.value]: {
                description: processComments(curr.comments),
                value: curr.name.value,
              },
            };
          }, {} as GraphQLEnumValueConfigMap);
          enumTypeMap.set(
            typeName,
            new GraphQLEnumType({
              name: typeName,
              description: processComments(statement.comments),
              values: enumValues,
            }),
          );
          topTypeMap[typeName] = { type: TType.ENUM, values: wireValues };
          break;
        }
        case SyntaxType.StructDefinition:
        case SyntaxType.ExceptionDefinition: {
          const description = processComments(statement.comments);
          const isException = statement.type === SyntaxType.ExceptionDefinition;
          const structTypeVal: StructTypeVal = {
            id: currentId++,
            name: typeName,
            type: TType.STRUCT,
            fields: {},
          };
          topTypeMap[typeName] = structTypeVal;
          const structFieldTypeMap = structTypeVal.fields;
          const fields: any[] = [];
          for (const field of statement.fields) {
            fields.push({ field, description: processComments(field.comments) });
            const { typeVal } = getGraphQLFunctionType({
              functionType: field.fieldType,
              id: field.fieldID?.value,
              enumTypeMap,
              inputTypeMap,
              outputTypeMap,
              topTypeMap,
            });
            structFieldTypeMap[field.name.value] = typeVal;
          }

          const getFieldsMap = (typeKind: 'outputType' | 'inputType'): any =>
            Object.fromEntries(
              fields.map(entry => {
                const {
                  field: { fieldType, fieldID, name, requiredness },
                } = entry;
                if (!entry.type) {
                  entry.type = getGraphQLFunctionType({
                    functionType: fieldType,
                    id: fieldID?.value,
                    enumTypeMap,
                    inputTypeMap,
                    outputTypeMap,
                    topTypeMap,
                  });
                }
                const { [typeKind]: type } = entry.type;
                return [
                  name.value,
                  {
                    type: requiredness === 'required' ? new GraphQLNonNull(type) : type,
                    description: entry.description,
                  },
                ];
              }),
            );

          // We use fields thunk to avoid circular dependency in case of recursive types
          const objectType = new GraphQLObjectType({
            name: typeName,
            description,
            fields: () => getFieldsMap('outputType'),
          });
          outputTypeMap.set(typeName, objectType);
          if (isException) {
            exceptionTypeMap.set(typeName, objectType);
          } else {
            inputTypeMap.set(
              typeName,
              new GraphQLInputObjectType({
                name: typeName + 'Input',
                description,
                fields: () => getFieldsMap('inputType'),
              }),
            );
          }
          break;
        }
        case SyntaxType.ServiceDefinition:
          pendingServices.push({ statement });
          break;
        case SyntaxType.TypedefDefinition: {
          pendingTypedefs.push({ statement, typeName: typeName! });
          break;
        }
      }
    }
  }

  for (const { statement, typeName: typedefName } of pendingTypedefs) {
    const { inputType, outputType, typeVal } = getGraphQLFunctionType({
      id: currentId++,
      functionType: statement.definitionType,
      enumTypeMap,
      inputTypeMap,
      outputTypeMap,
      topTypeMap,
    });
    inputTypeMap.set(typedefName, inputType);
    outputTypeMap.set(typedefName, outputType);
    // So compact/TJSON mapping can resolve `typedef` refs (e.g. digit → i32).
    topTypeMap[typedefName] = typeVal;
  }

  for (const { statement } of pendingServices) {
    if (statement.type !== SyntaxType.ServiceDefinition) continue;
    for (const fnIndex in statement.functions) {
      const fn = statement.functions[fnIndex];
      const fnName = fn.name.value;
      const { outputType: returnType, typeVal: returnTypeVal } = getGraphQLFunctionType({
        functionType: fn.returnType,
        id: Number(fnIndex) + 1,
        enumTypeMap,
        inputTypeMap,
        outputTypeMap,
        topTypeMap,
      });
      const args: GraphQLFieldConfigArgumentMap = {};
      const fieldTypeMap: TypeMap = {};
      for (const field of fn.fields) {
        const fieldName = field.name.value;
        const fieldDescription = processComments(field.comments);
        let { inputType: fieldType, typeVal } = getGraphQLFunctionType({
          functionType: field.fieldType,
          id: field.fieldID?.value,
          enumTypeMap,
          inputTypeMap,
          outputTypeMap,
          topTypeMap,
        });
        if (field.requiredness === 'required') {
          fieldType = new GraphQLNonNull(fieldType);
        }
        args[fieldName] = {
          type: fieldType,
          description: fieldDescription,
        };
        fieldTypeMap[fieldName] = typeVal;
      }
      const isEntity = entityMethodSet.has(fnName);
      const isOneway = Boolean(fn.oneway);
      const messageType = isOneway ? 'ONEWAY' : 'CALL';
      const throwsMeta = (fn.throws || []).map(t => ({
        id: t.fieldID?.value ?? 0,
        name: t.name.value,
        typeName: 'value' in t.fieldType ? String(t.fieldType.value).replace('.', '_') : 'unknown',
      }));

      const successTypeName = `${fnName[0].toUpperCase()}${fnName.slice(1)}Success`;
      let fieldReturnType: GraphQLOutputType = returnType;
      let modelThrows = false;
      if (!ignoreExceptions && throwsMeta.length > 0) {
        const isVoidSuccess = returnTypeVal?.type === TType.VOID;
        // Void! cannot hold a successful null - use `ok: Boolean!` for void RPC
        // success members; non-void keeps `value: <Return>!`.
        const successType = new GraphQLObjectType({
          name: successTypeName,
          fields: isVoidSuccess
            ? { ok: { type: new GraphQLNonNull(GraphQLBoolean) } }
            : { value: { type: new GraphQLNonNull(returnType as any) } },
        });
        const exceptionTypes = throwsMeta
          .map(
            t =>
              exceptionTypeMap.get(t.typeName) ||
              (outputTypeMap.get(t.typeName) as GraphQLObjectType),
          )
          .filter(Boolean) as GraphQLObjectType[];
        if (exceptionTypes.length) {
          modelThrows = true;
          fieldReturnType = new GraphQLUnionType({
            name: `${fnName[0].toUpperCase()}${fnName.slice(1)}Result`,
            types: [successType, ...exceptionTypes],
            resolveType: value => {
              // Binary client stamps `__typename` from the result field id.
              if (value && typeof value === 'object' && value.__typename) {
                return value.__typename;
              }
              if (value && typeof value === 'object') {
                if (value.ok === true) {
                  return successTypeName;
                }
                // Struct TJSON unions stamp `field0`. When present it is authoritative:
                // Hive may keep `value: { left: undefined }` keys on exception replies.
                if (typeof value.field0 === 'boolean') {
                  if (value.field0 === true) {
                    return successTypeName;
                  }
                } else if (value.value !== undefined && value.value !== null) {
                  // Scalar / non-struct success (no field0 stamp).
                  const v = value.value;
                  const emptyObj =
                    typeof v === 'object' &&
                    v !== null &&
                    !Array.isArray(v) &&
                    Object.values(v).every(x => x === undefined);
                  if (!emptyObj) {
                    return successTypeName;
                  }
                }
                // Prefer reply throw-id discriminators over shared field names.
                for (const t of throwsMeta) {
                  if (value[`__throw_${t.typeName}`] === true) {
                    return t.typeName;
                  }
                }
              }
              for (const ex of exceptionTypes) {
                const fields = Object.keys(ex.getFields());
                // Last resort when no `__throw_*` stamp (hand-authored selections).
                if (fields.some(f => (value || {})[f] !== undefined)) return ex.name;
              }
              return successTypeName;
            },
          });
        }
      }

      // Mapping bodies only - no `#` dumps inside string values and no GraphQL
      // field description dumps. Hand-authored SDL may put a GraphQL `#` comment
      // immediately above `args:` / `selection:` (AST print cannot re-emit those;
      // parser still strips `#` lines if present inside the string values).
      const compactArgs = buildCompactArgs(fieldTypeMap, topTypeMap);
      const compactSelection = buildCompactSelection(returnTypeVal, topTypeMap);
      const compactThrows =
        modelThrows && throwsMeta.length ? buildCompactThrows(throwsMeta, topTypeMap) : undefined;

      const isVoidReturn = returnTypeVal?.type === TType.VOID;

      if (emitConnect) {
        // Single-service: path `/`. Explicit serviceName: `/<service>`.
        // Do not embed `#` IDL comments in Connectors `selection` - Apollo
        // JSONSelection does not skip hash comments (unlike compact thrift mapping).
        const connectPath = serviceName ? `/${serviceName}` : '/';
        let selection = buildTJSONConnectSelection(returnTypeVal, topTypeMap);
        if (modelThrows) {
          // Union shape: success under `value`; exception fields projected beside it.
          selection = buildTJSONUnionConnectSelection(returnTypeVal, throwsMeta, topTypeMap);
        }
        const connectDir: Record<string, unknown> = {
          source: subgraphName,
          http: {
            POST: connectPath,
            body: buildTJSONConnectBody(fnName, fieldTypeMap, topTypeMap, messageType),
          },
          selection,
          ...(isEntity ? { entity: true } : {}),
        };
        // ONEWAY: no reply envelope - HTTP status alone; void mapping must not wait.
        if (!isOneway) {
          // ignoreExceptions:false → declared throws arrive as REPLY data (still msg type 2).
          // Void + throws + ignoreExceptions:true → REPLY with non-empty result (no "0");
          // require empty result struct so declared throws are not silent null.
          // Non-void CALL: require success field "0".
          const voidWithThrows = isVoidReturn && !modelThrows && throwsMeta.length > 0;
          connectDir.isSuccess = voidWithThrows
            ? TJSON_IS_SUCCESS_VOID_WITH_THROWS
            : modelThrows || isVoidReturn
              ? TJSON_IS_SUCCESS_VOID
              : TJSON_IS_SUCCESS;
          connectDir.errors = TJSON_ERRORS;
        }
        rootFields[fnName] = {
          type: fieldReturnType,
          args,
          extensions: {
            directives: {
              connect: connectDir,
            },
          },
        };
      } else {
        const thriftRpcArgs: Record<string, unknown> = {
          subgraph: subgraphName,
          function: fnName,
          args: compactArgs,
          selection: compactSelection,
          messageType,
        };
        if (compactThrows) {
          thriftRpcArgs.throws = compactThrows;
        }
        // Binary HTTP path is `@transport(location:)` - omit `service:` for
        // single-service generate. Directive arg remains for hand-authored SDL.
        if (isEntity) {
          thriftRpcArgs.entity = true;
        }
        rootFields[fnName] = {
          type: fieldReturnType,
          args,
          extensions: {
            directives: {
              thrift__rpc: thriftRpcArgs,
            },
          },
        };
      }
    }
  }

  const queryObjectType = new GraphQLObjectType({
    name: 'Query',
    fields: rootFields,
  });

  if (emitConnect) {
    const headerEntries = Object.entries(headers).map(([name, value]) => ({ name, value }));
    const schema = new GraphQLSchema({
      query: queryObjectType,
      directives: [ConnectDirective, SourceDirective, LinkDirective],
      extensions: {
        directives: {
          link: [
            {
              url: CONNECT_LINK_URL,
              import: ['@connect', '@source'],
            },
          ],
          source: [
            {
              name: subgraphName,
              http: {
                baseURL: location,
                headers: [...thriftJsonContentTypeHeaders(), ...headerEntries],
              },
            },
          ],
        },
      },
    });
    return preferMultilineDirectiveBlockStrings(schema);
  }

  const graphQLThriftAnnotations: GraphQLThriftAnnotations = {
    subgraph: subgraphName,
    kind: 'thrift',
    location,
    // Match shared `@transport(headers: [[String]])` / HTTP+OData loaders.
    // Wire layout lives in `@thrift__rpc(args/selection)`; thrift HTTP is binary.
    headers: Object.entries(headers),
  };

  // Do not `@link` `@thrift__rpc` on a custom URL - composition's
  // `detectAndAddMeshDirectives` imports unknown directives via Mesh spec
  // (`@composeDirective`). A separate thrift `@link` would exclude it from that path.
  const schema = new GraphQLSchema({
    query: queryObjectType,
    types: [ThriftMessageTypeEnum, ...exceptionTypeMap.values()],
    directives: [thriftRpcDirective],
    extensions: {
      directives: {
        transport: graphQLThriftAnnotations,
      },
    },
  });

  return preferMultilineDirectiveBlockStrings(schema);
}

/**
 * `printSchemaWithDirectives` rebuilds directive args via JS and prints strings
 * with escaped `\\n` / `\\"` unless the field `astNode` keeps `StringValue.block: true`.
 * Attach matching AST directive apps so multiline / quote-heavy args (`args`,
 * TJSON `body` / `selection` / `isSuccess` / `errors`) print as GraphQL `"""`.
 */
function preferMultilineDirectiveBlockStrings(schema: GraphQLSchemaType): GraphQLSchemaType {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type)) continue;
    for (const field of Object.values(type.getFields())) {
      attachBlockStringDirectiveAst(field);
    }
  }
  return schema;
}

function attachBlockStringDirectiveAst(field: GraphQLField<any, any>): void {
  const dirs = getDirectivesInExtensions(field);
  if (!dirs?.length) return;
  const directiveNodes = dirs.map(dir => ({
    kind: Kind.DIRECTIVE as const,
    name: { kind: Kind.NAME as const, value: dir.name },
    arguments: Object.entries(dir.args ?? {}).flatMap(([argName, argValue]) => {
      const value = constValueNodePreferBlockString(argName, argValue);
      if (value == null) return [];
      return [
        {
          kind: Kind.ARGUMENT as const,
          name: { kind: Kind.NAME as const, value: argName },
          value,
        },
      ];
    }),
  }));
  field.astNode = {
    kind: Kind.FIELD_DEFINITION,
    name: { kind: Kind.NAME, value: field.name },
    type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'String' } },
    directives: directiveNodes,
  };
}

function constValueNodePreferBlockString(argName: string, value: unknown): ConstValueNode | null {
  if (value == null) return null;
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Number.isInteger(value);
    return {
      kind: asInt ? Kind.INT : Kind.FLOAT,
      value: String(value),
    };
  }
  if (typeof value === 'string') {
    // `@thrift__rpc(messageType:)` is an enum - print bare CALL/ONEWAY.
    if (argName === 'messageType') {
      return { kind: Kind.ENUM, value };
    }
    // Prefer `"""` when the value has newlines **or** embedded `"` so print does
    // not emit hard-to-read `\"` escapes (common in TJSON `@connect` selection /
    // isSuccess / errors paths like `$->get("0")`).
    const preferBlock = value.includes('\n') || value.includes('\r') || value.includes('"');
    return { kind: Kind.STRING, value, block: preferBlock };
  }
  if (Array.isArray(value)) {
    return {
      kind: Kind.LIST,
      values: value
        .map(item => constValueNodePreferBlockString('', item))
        .filter((v): v is ConstValueNode => v != null),
    };
  }
  if (typeof value === 'object') {
    // Nested inputs e.g. `@connect(http: { POST, body })` / `errors: { message }`.
    return {
      kind: Kind.OBJECT,
      fields: Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
        const childNode = constValueNodePreferBlockString(key, child);
        if (childNode == null) return [];
        return [
          {
            kind: Kind.OBJECT_FIELD as const,
            name: { kind: Kind.NAME as const, value: key },
            value: childNode,
          },
        ];
      }),
    };
  }
  return null;
}

function processComments(comments: Comment[]): string | undefined {
  const description = comments
    .map(comment =>
      Array.isArray(comment.value) ? comment.value.join('\n') : String(comment.value ?? ''),
    )
    .join('\n');
  return description.trim() === '' ? undefined : description;
}

interface GetGraphQLFunctionTypeOpts {
  id: number;
  functionType: FunctionType;
  enumTypeMap: Map<string, GraphQLEnumType>;
  inputTypeMap: Map<string, GraphQLInputType>;
  outputTypeMap: Map<string, GraphQLOutputType>;
  topTypeMap: TypeMap;
}

function getGraphQLFunctionType({
  functionType,
  id,
  enumTypeMap,
  inputTypeMap,
  outputTypeMap,
  topTypeMap,
}: GetGraphQLFunctionTypeOpts): {
  outputType: GraphQLOutputType;
  inputType: GraphQLInputType;
  typeVal: TypeVal;
} {
  let inputType: GraphQLInputType;
  let outputType: GraphQLOutputType;
  let typeVal: TypeVal;
  switch (functionType.type) {
    case SyntaxType.BinaryKeyword:
    case SyntaxType.StringKeyword:
      inputType = GraphQLString;
      outputType = GraphQLString;
      typeVal = { type: TType.STRING };
      break;
    case SyntaxType.DoubleKeyword:
      inputType = GraphQLFloat;
      outputType = GraphQLFloat;
      typeVal = typeVal! || { type: TType.DOUBLE };
      break;
    case SyntaxType.VoidKeyword:
      typeVal = typeVal! || { type: TType.VOID };
      inputType = GraphQLVoid;
      outputType = GraphQLVoid;
      break;
    case SyntaxType.BoolKeyword:
      typeVal = typeVal! || { type: TType.BOOL };
      inputType = GraphQLBoolean;
      outputType = GraphQLBoolean;
      break;
    case SyntaxType.I8Keyword:
      inputType = GraphQLInt;
      outputType = GraphQLInt;
      typeVal = typeVal! || { type: TType.I08 };
      break;
    case SyntaxType.I16Keyword:
      inputType = GraphQLInt;
      outputType = GraphQLInt;
      typeVal = typeVal! || { type: TType.I16 };
      break;
    case SyntaxType.I32Keyword:
      inputType = GraphQLInt;
      outputType = GraphQLInt;
      typeVal = typeVal! || { type: TType.I32 };
      break;
    case SyntaxType.ByteKeyword:
      inputType = GraphQLByte;
      outputType = GraphQLByte;
      typeVal = typeVal! || { type: TType.BYTE };
      break;
    case SyntaxType.I64Keyword:
      inputType = GraphQLBigInt;
      outputType = GraphQLBigInt;
      typeVal = typeVal! || { type: TType.I64 };
      break;
    case SyntaxType.ListType: {
      const ofTypeList = getGraphQLFunctionType({
        functionType: functionType.valueType,
        id,
        enumTypeMap,
        inputTypeMap,
        outputTypeMap,
        topTypeMap,
      });
      inputType = new GraphQLList(ofTypeList.inputType);
      outputType = new GraphQLList(ofTypeList.outputType);
      typeVal = typeVal! || { type: TType.LIST, elementType: ofTypeList.typeVal };
      break;
    }
    case SyntaxType.SetType: {
      const ofSetType = getGraphQLFunctionType({
        functionType: functionType.valueType,
        id,
        enumTypeMap,
        inputTypeMap,
        outputTypeMap,
        topTypeMap,
      });
      inputType = new GraphQLList(ofSetType.inputType);
      outputType = new GraphQLList(ofSetType.outputType);
      typeVal = typeVal! || { type: TType.SET, elementType: ofSetType.typeVal };
      break;
    }
    case SyntaxType.MapType: {
      inputType = GraphQLJSON;
      outputType = GraphQLJSON;
      const ofTypeKey = getGraphQLFunctionType({
        functionType: functionType.keyType,
        id,
        enumTypeMap,
        inputTypeMap,
        outputTypeMap,
        topTypeMap,
      });
      const ofTypeValue = getGraphQLFunctionType({
        functionType: functionType.valueType,
        id,
        enumTypeMap,
        inputTypeMap,
        outputTypeMap,
        topTypeMap,
      });
      typeVal = typeVal! || {
        type: TType.MAP,
        keyType: ofTypeKey.typeVal,
        valType: ofTypeValue.typeVal,
      };
      break;
    }
    case SyntaxType.Identifier: {
      const typeName = functionType.value.replace('.', '_');
      if (enumTypeMap.has(typeName)) {
        const enumType = enumTypeMap.get(typeName)!;
        inputType = enumType;
        outputType = enumType;
        const registered = topTypeMap[typeName];
        typeVal =
          registered && registered.type === TType.ENUM
            ? { type: TType.ENUM, values: registered.values }
            : { type: TType.ENUM };
        break;
      }
      if (inputTypeMap.has(typeName)) {
        inputType = inputTypeMap.get(typeName)!;
      }
      if (outputTypeMap.has(typeName)) {
        outputType = outputTypeMap.get(typeName)!;
      }
      typeVal = {
        name: typeName,
        type: 'ref',
      };
      break;
    }
    default:
      throw new Error(`Unknown function type: ${functionType}!`);
  }
  return {
    inputType: inputType!,
    outputType: outputType!,
    typeVal: {
      ...typeVal!,
      id,
    },
  };
}
