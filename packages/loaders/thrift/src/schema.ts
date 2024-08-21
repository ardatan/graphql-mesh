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
} from 'graphql';
import { GraphQLBigInt, GraphQLByte, GraphQLJSON, GraphQLVoid } from 'graphql-scalars';
import type {
  Comment,
  FunctionType,
  IncludeDefinition,
  ThriftDocument,
} from '@creditkarma/thrift-parser';
import { parse, SyntaxType } from '@creditkarma/thrift-parser';
import type { IMethodAnnotations, IThriftAnnotations } from '@creditkarma/thrift-server-core';
import { TType } from '@creditkarma/thrift-server-core';
import { path } from '@graphql-mesh/cross-helpers';
import type {
  GraphQLThriftAnnotations,
  StructTypeVal,
  TypeMap,
  TypeVal,
} from '@graphql-mesh/transport-thrift';
import type { ImportFn, Logger, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, readFileOrUrl } from '@graphql-mesh/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export interface GraphQLThriftLoaderOptions {
  subgraphName: string;

  source: string;
  endpoint: string;
  operationHeaders?: Record<string, string>;
  serviceName: string;

  baseDir?: string;
  schemaHeaders?: Record<string, string>;
  fetchFn?: MeshFetch;
  logger?: Logger;
  importFn?: ImportFn;
}

export const FieldTypeMapScalar = new GraphQLScalarType({ name: 'FieldTypeMap' });

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

export async function loadNonExecutableGraphQLSchemaFromIDL({
  subgraphName,
  source,
  endpoint,
  operationHeaders = {},
  serviceName,

  baseDir = process.cwd(),
  schemaHeaders = {},
  fetchFn = defaultFetch,
  logger = new DefaultLogger('Thrift'),
  importFn = defaultImportFn,
}: GraphQLThriftLoaderOptions) {
  const namespaceASTMap: Record<string, ThriftDocument> = {};
  await parseWithIncludes({
    idlFilePath: source,
    includesMap: namespaceASTMap,
    baseDir,
    schemaHeaders,
    fetchFn,
    logger,
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
  });
}

interface ParseWithIncludesOpts {
  idlFilePath: string;
  includesMap: Record<string, ThriftDocument>;
  baseDir: string;
  schemaHeaders: Record<string, string>;
  fetchFn: MeshFetch;
  logger: Logger;
  importFn: ImportFn;
}

async function parseWithIncludes({
  idlFilePath,
  includesMap,
  baseDir,
  schemaHeaders,
  fetchFn,
  logger,
  importFn,
}: ParseWithIncludesOpts): Promise<Record<string, ThriftDocument>> {
  const rawThrift = await readFileOrUrl<string>(idlFilePath, {
    allowUnknownExtensions: true,
    cwd: baseDir,
    headers: schemaHeaders,
    fetch: fetchFn,
    logger,
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
        logger,
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
}: {
  subgraphName: string;
  baseNamespace: string;
  namespaceASTMap: Record<string, ThriftDocument>;
  location: string;
  headers: Record<string, string>;
  serviceName: string;
}) {
  const enumTypeMap = new Map<string, GraphQLEnumType>();
  const outputTypeMap = new Map<string, GraphQLOutputType>();
  const inputTypeMap = new Map<string, GraphQLInputType>();
  const rootFields: GraphQLFieldConfigMap<any, any> = {};
  const annotations: IThriftAnnotations = {};
  const methodAnnotations: IMethodAnnotations = {};
  const methodNames: string[] = [];
  const methodParameters: {
    [methodName: string]: number;
  } = {};
  const topTypeMap: TypeMap = {};
  let currentId = 0;

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
          break;
        case SyntaxType.StructDefinition: {
          const description = processComments(statement.comments);
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
                    description,
                  },
                ];
              }),
            );

          // We use fields thunk to avoid circular dependency in case of recursive types
          outputTypeMap.set(
            typeName,
            new GraphQLObjectType({
              name: typeName,
              description,
              fields: () => getFieldsMap('outputType'),
            }),
          );
          inputTypeMap.set(
            typeName,
            new GraphQLInputObjectType({
              name: typeName + 'Input',
              description,
              fields: () => getFieldsMap('inputType'),
            }),
          );
          break;
        }
        case SyntaxType.ServiceDefinition:
          for (const fnIndex in statement.functions) {
            const fn = statement.functions[fnIndex];
            const fnName = fn.name.value;
            const description = processComments(fn.comments);
            const { outputType: returnType } = getGraphQLFunctionType({
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
            rootFields[fnName] = {
              type: returnType,
              description,
              args,
              extensions: {
                directives: {
                  fieldTypeMap: {
                    subgraph: subgraphName,
                    fieldTypeMap,
                  },
                },
              },
            };
            methodNames.push(fnName);
            methodAnnotations[fnName] = { annotations: {}, fieldAnnotations: {} };
            methodParameters[fnName] = fn.fields.length + 1;
          }
          break;
        case SyntaxType.TypedefDefinition: {
          const { inputType, outputType } = getGraphQLFunctionType({
            id: currentId++,
            functionType: statement.definitionType,
            enumTypeMap,
            inputTypeMap,
            outputTypeMap,
            topTypeMap,
          });
          inputTypeMap.set(typeName, inputType);
          outputTypeMap.set(typeName, outputType);
          break;
        }
      }
    }
  }

  const queryObjectType = new GraphQLObjectType({
    name: 'Query',
    fields: rootFields,
  });

  const graphQLThriftAnnotations: GraphQLThriftAnnotations = {
    subgraph: subgraphName,
    kind: 'thrift',
    location,
    headers,
    options: {
      clientAnnotations: {
        serviceName,
        annotations,
        methodNames,
        methodAnnotations,
        methodParameters,
      },
      topTypeMap,
    },
  };

  const schema = new GraphQLSchema({
    query: queryObjectType,
    directives: [fieldTypeMapDirective],
    extensions: {
      directives: {
        transport: graphQLThriftAnnotations,
      },
    },
  });

  return schema;
}

function processComments(comments: Comment[]) {
  return comments.map(comment => comment.value).join('\n');
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
