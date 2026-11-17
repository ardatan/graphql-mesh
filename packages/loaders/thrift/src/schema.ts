import type {
  GraphQLEnumValueConfigMap,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
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
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
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
} from '@graphql-mesh/transport-rest';
import type {
  GraphQLThriftAnnotations,
  StructTypeVal,
  TypeMap,
  TypeVal,
} from '@graphql-mesh/transport-thrift';
import type { ImportFn, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import {
  buildCompactArgs,
  buildCompactSelection,
  buildThriftRpcDescription,
  buildTJSONConnectBody,
  buildTJSONConnectSelection,
  thriftJsonContentTypeHeaders,
  TJSON_ERRORS,
  TJSON_IS_SUCCESS,
  type ThriftProtocol,
} from './mapping.js';

export interface GraphQLThriftLoaderOptions {
  subgraphName: string;

  source: string;
  endpoint: string;
  operationHeaders?: Record<string, string>;
  /** Thrift service name — optional for single-service endpoints. */
  serviceName?: string;
  /** Wire protocol. `json` emits `@connect` / `@source` (Apollo Router–compatible). */
  protocol?: ThriftProtocol;
  /**
   * Function names that should emit `entity: true` on `@thrift__rpc` / `@connect`
   * (Query entity resolvers).
   */
  entityMethods?: string[];
  /**
   * When true (default), IDL `throws` are not modeled in the GraphQL return type.
   * Set false to emit exception object types + a union return (`Success | Throws…`).
   */
  ignoreExceptions?: boolean;

  baseDir?: string;
  schemaHeaders?: Record<string, string>;
  fetchFn?: MeshFetch;
  log?: Logger;
  importFn?: ImportFn;
}

/** @deprecated Kept for dual-read of legacy SDL only; loader no longer emits it. */
export const FieldTypeMapScalar = new GraphQLScalarType({ name: 'FieldTypeMap' });

/** @deprecated Kept for dual-read of legacy SDL only; loader no longer emits it. */
export const fieldTypeMapDirective = new GraphQLDirective({
  name: 'fieldTypeMap',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    fieldTypeMap: {
      type: FieldTypeMapScalar,
    },
  },
});

export const ThriftMessageTypeEnum = new GraphQLEnumType({
  name: 'ThriftMessageType',
  values: {
    CALL: { value: 'CALL' },
    ONEWAY: { value: 'ONEWAY' },
  },
});

export const thriftRpcDirective = new GraphQLDirective({
  name: 'thrift__rpc',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    service: { type: GraphQLString },
    function: { type: new GraphQLNonNull(GraphQLString) },
    args: { type: new GraphQLNonNull(GraphQLString) },
    selection: { type: new GraphQLNonNull(GraphQLString) },
    messageType: { type: ThriftMessageTypeEnum, defaultValue: 'CALL' },
    entity: { type: GraphQLBoolean },
  },
});

/** @deprecated Use {@link thriftRpcDirective}. */
export const thriftMethodDirective = thriftRpcDirective;

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
  let idlServiceName: string | undefined;

  for (const namespace of Object.keys(namespaceASTMap).reverse()) {
    const thriftAST = namespaceASTMap[namespace];
    for (const statement of thriftAST.body) {
      let typeName = 'name' in statement ? statement.name.value : undefined;
      if (namespace !== baseNamespace) {
        typeName = `${namespace}_${typeName}`;
      }
      switch (statement.type) {
        case SyntaxType.EnumDefinition:
          enumTypeMap.set(
            typeName,
            new GraphQLEnumType({
              name: typeName,
              description: processComments(statement.comments),
              values: statement.members.reduce(
                (prev, curr) => ({
                  ...prev,
                  [curr.name.value]: {
                    description: processComments(curr.comments),
                    value: curr.name.value,
                  },
                }),
                {} as GraphQLEnumValueConfigMap,
              ),
            }),
          );
          // Thrift enums are i32 on the wire — register so ref resolve / wire tokens agree.
          topTypeMap[typeName] = { type: TType.I32 };
          break;
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
          idlServiceName = statement.name.value;
          for (const fnIndex in statement.functions) {
            const fn = statement.functions[fnIndex];
            const fnName = fn.name.value;
            const description = processComments(fn.comments);
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
            const effectiveServiceName = serviceName || idlServiceName;
            const isEntity = entityMethodSet.has(fnName);
            const isOneway = Boolean(fn.oneway);
            const messageType = isOneway ? 'ONEWAY' : 'CALL';
            const throwsMeta = (fn.throws || []).map(t => ({
              id: t.fieldID?.value ?? 0,
              name: t.name.value,
              typeName:
                'value' in t.fieldType ? String(t.fieldType.value).replace('.', '_') : 'unknown',
            }));

            let fieldReturnType: GraphQLOutputType = returnType;
            if (!ignoreExceptions && throwsMeta.length > 0) {
              const successTypeName = `${fnName[0].toUpperCase()}${fnName.slice(1)}Success`;
              const successType = new GraphQLObjectType({
                name: successTypeName,
                fields: {
                  value: { type: new GraphQLNonNull(returnType as any) },
                },
              });
              const exceptionTypes = throwsMeta
                .map(
                  t =>
                    exceptionTypeMap.get(t.typeName) ||
                    (outputTypeMap.get(t.typeName) as GraphQLObjectType),
                )
                .filter(Boolean) as GraphQLObjectType[];
              if (exceptionTypes.length) {
                fieldReturnType = new GraphQLUnionType({
                  name: `${fnName[0].toUpperCase()}${fnName.slice(1)}Result`,
                  types: [successType, ...exceptionTypes],
                  resolveType: value => {
                    if (
                      value &&
                      typeof value === 'object' &&
                      'value' in value &&
                      Object.keys(value).length === 1
                    ) {
                      return successTypeName;
                    }
                    for (const ex of exceptionTypes) {
                      // Best-effort: match by presence of declared fields
                      const fields = Object.keys(ex.getFields());
                      if (fields.some(f => f in (value || {}))) return ex.name;
                    }
                    return successTypeName;
                  },
                });
              }
            }

            const mappingDescription = buildThriftRpcDescription({
              serviceName: effectiveServiceName,
              functionName: fnName,
              fieldTypeMap,
              returnTypeVal,
              topTypeMap,
              protocol,
              messageType,
              throws: throwsMeta,
              ignoreExceptions,
            });
            const fieldDescription = [description, mappingDescription].filter(Boolean).join('\n\n');

            if (emitConnect) {
              // Single-service: path `/`. Explicit serviceName: `/<service>`.
              const connectPath = serviceName ? `/${serviceName}` : '/';
              rootFields[fnName] = {
                type: fieldReturnType,
                description: fieldDescription,
                args,
                extensions: {
                  directives: {
                    connect: {
                      source: subgraphName,
                      http: {
                        POST: connectPath,
                        body: buildTJSONConnectBody(fnName, fieldTypeMap, topTypeMap),
                      },
                      selection: buildTJSONConnectSelection(returnTypeVal, topTypeMap),
                      isSuccess: TJSON_IS_SUCCESS,
                      errors: TJSON_ERRORS,
                      ...(isEntity ? { entity: true } : {}),
                    },
                  },
                },
              };
            } else {
              const thriftRpcArgs: Record<string, unknown> = {
                subgraph: subgraphName,
                function: fnName,
                args: buildCompactArgs(fieldTypeMap, topTypeMap),
                selection: buildCompactSelection(returnTypeVal, topTypeMap),
                messageType,
              };
              if (serviceName) {
                thriftRpcArgs.service = serviceName;
              }
              if (isEntity) {
                thriftRpcArgs.entity = true;
              }
              rootFields[fnName] = {
                type: fieldReturnType,
                description: fieldDescription,
                args,
                extensions: {
                  directives: {
                    thrift__rpc: thriftRpcArgs,
                  },
                },
              };
            }
          }
          break;
        case SyntaxType.TypedefDefinition: {
          const { inputType, outputType, typeVal } = getGraphQLFunctionType({
            id: currentId++,
            functionType: statement.definitionType,
            enumTypeMap,
            inputTypeMap,
            outputTypeMap,
            topTypeMap,
          });
          inputTypeMap.set(typeName, inputType);
          outputTypeMap.set(typeName, outputType);
          // So compact/TJSON mapping can resolve `typedef` refs (e.g. digit → i32).
          topTypeMap[typeName] = typeVal;
          break;
        }
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
    return schema;
  }

  const graphQLThriftAnnotations: GraphQLThriftAnnotations = {
    subgraph: subgraphName,
    kind: 'thrift',
    location,
    // Match shared `@transport(headers: [[String]])` / HTTP+OData loaders.
    headers: Object.entries(headers),
    // Slim transport: wire layout lives in `@thrift__rpc(args/selection)`.
    options: {
      protocol,
    },
  };

  // Do not `@link` `@thrift__rpc` on a custom URL — composition's
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

  return schema;
}

function processComments(comments: Comment[]): string | undefined {
  const description = comments.map(comment => comment.value).join('\n');
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
        // Enums are i32 on the wire (also registered in topTypeMap).
        typeVal = { type: TType.I32 };
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
