import { GetMeshSourceOptions, MeshHandler, YamlConfig } from '@graphql-mesh/types';
import { parse, ThriftDocument, SyntaxType, Comment, FunctionType } from '@creditkarma/thrift-parser';
import {
  readFileOrUrl,
  parseInterpolationStrings,
  getInterpolatedHeadersFactory,
  AggregateError,
} from '@graphql-mesh/utils';
import {
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInputFieldConfigMap,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfigArgumentMap,
  GraphQLSchema,
  GraphQLID,
} from 'graphql';
import { GraphQLBigInt, GraphQLJSON, GraphQLByte, GraphQLVoid } from 'graphql-scalars';
import { createHttpClient } from '@creditkarma/thrift-client';
import {
  ThriftClient,
  IThriftAnnotations,
  IMethodAnnotations,
  TTransport,
  TProtocol,
  MessageType,
  IThriftMessage,
  TApplicationException,
  TApplicationExceptionCodec,
  TApplicationExceptionType,
  TType,
  IThriftField,
} from '@creditkarma/thrift-server-core';
import { pascalCase } from 'pascal-case';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { inspect } from '@graphql-tools/utils';
import { env } from 'process';

export default class ThriftHandler implements MeshHandler {
  private config: YamlConfig.ThriftHandler;
  private baseDir: string;
  private idl: StoreProxy<ThriftDocument>;

  constructor({ config, baseDir, store }: GetMeshSourceOptions<YamlConfig.ThriftHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.idl = store.proxy('idl.json', PredefinedProxyOptions.JsonWithoutValidation);
  }

  async getMeshSource() {
    const { schemaHeaders, serviceName, operationHeaders } = this.config;

    const thriftAST = await this.idl.getWithSet(async () => {
      const rawThrift = await readFileOrUrl<string>(this.config.idl, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        headers: schemaHeaders,
      });
      const parseResult = parse(rawThrift, { organize: false });
      if (parseResult.type === SyntaxType.ThriftErrors) {
        throw new AggregateError(parseResult.errors);
      }
      return parseResult;
    });

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

    type TypeVal = BaseTypeVal | ListTypeVal | SetTypeVal | MapTypeVal | EnumTypeVal | StructTypeVal | VoidTypeVal;
    type BaseTypeVal = {
      id?: number;
      type: TType.BOOL | TType.BYTE | TType.DOUBLE | TType.I16 | TType.I32 | TType.I64 | TType.STRING;
    };
    type ListTypeVal = { id?: number; type: TType.LIST; elementType: TypeVal };
    type SetTypeVal = { id?: number; type: TType.SET; elementType: TypeVal };
    type MapTypeVal = { id?: number; type: TType.MAP; keyType: TypeVal; valType: TypeVal };
    type EnumTypeVal = { id?: number; type: TType.ENUM };
    type StructTypeVal = { id?: number; type: TType.STRUCT; name: string; fields: TypeMap };
    type VoidTypeVal = { id?: number; type: TType.VOID };
    type TypeMap = Record<string, TypeVal>;
    const topTypeMap: TypeMap = {};

    class MeshThriftClient<Context = any> extends ThriftClient<Context> {
      public static readonly serviceName: string = serviceName;
      public static readonly annotations: IThriftAnnotations = annotations;
      public static readonly methodAnnotations: IMethodAnnotations = methodAnnotations;
      public static readonly methodNames: Array<string> = methodNames;
      public readonly _serviceName: string = serviceName;
      public readonly _annotations: IThriftAnnotations = annotations;
      public readonly _methodAnnotations: IMethodAnnotations = methodAnnotations;
      public readonly _methodNames: Array<string> = methodNames;
      public readonly _methodParameters?: {
        [methodName: string]: number;
      } = methodParameters;

      writeType(typeVal: TypeVal, value: any, output: TProtocol) {
        switch (typeVal.type) {
          case TType.BOOL:
            output.writeBool(value);
            break;
          case TType.BYTE:
            output.writeByte(value);
            break;
          case TType.DOUBLE:
            output.writeDouble(value);
            break;
          case TType.I16:
            output.writeI16(value);
            break;
          case TType.I32:
            output.writeI32(value);
            break;
          case TType.I64:
            output.writeI64(value.toString());
            break;
          case TType.STRING:
            output.writeString(value);
            break;
          case TType.STRUCT: {
            output.writeStructBegin(typeVal.name);
            const typeMap = typeVal.fields;
            for (const argName in value) {
              const argType = typeMap[argName];
              const argVal = value[argName];
              if (argType) {
                output.writeFieldBegin(argName, argType.type, argType.id);
                this.writeType(argType, argVal, output);
                output.writeFieldEnd();
              }
            }
            output.writeFieldStop();
            output.writeStructEnd();
            break;
          }
          case TType.ENUM:
            // TODO: A
            break;
          case TType.MAP: {
            const keys = Object.keys(value);
            output.writeMapBegin(typeVal.keyType.type, typeVal.valType.type, keys.length);
            for (const key of keys) {
              this.writeType(typeVal.keyType, key, output);
              const val = value[key];
              this.writeType(typeVal.valType, val, output);
            }
            output.writeMapEnd();
            break;
          }
          case TType.LIST:
            output.writeListBegin(typeVal.elementType.type, value.length);
            for (const element of value) {
              this.writeType(typeVal.elementType, element, output);
            }
            output.writeListEnd();
            break;
          case TType.SET:
            output.writeSetBegin(typeVal.elementType.type, value.length);
            for (const element of value) {
              this.writeType(typeVal.elementType, element, output);
            }
            output.writeSetEnd();
            break;
        }
      }

      readType(type: TType, input: TProtocol): any {
        switch (type) {
          case TType.BOOL:
            return input.readBool();
          case TType.BYTE:
            return input.readByte();
          case TType.DOUBLE:
            return input.readDouble();
          case TType.I16:
            return input.readI16();
          case TType.I32:
            return input.readI32();
          case TType.I64:
            return BigInt(input.readI64().toString());
          case TType.STRING:
            return input.readString();
          case TType.STRUCT: {
            const result: any = {};
            input.readStructBegin();
            while (true) {
              const field: IThriftField = input.readFieldBegin();
              const fieldType = field.fieldType;
              const fieldName = field.fieldName || 'success';
              if (fieldType === TType.STOP) {
                break;
              }
              result[fieldName] = this.readType(fieldType, input);
              input.readFieldEnd();
            }
            input.readStructEnd();
            return result;
          }
          case TType.ENUM:
            // TODO: A
            break;
          case TType.MAP: {
            const result: any = {};
            const map = input.readMapBegin();
            for (let i = 0; i < map.size; i++) {
              const key = this.readType(map.keyType, input);
              const value = this.readType(map.valueType, input);
              result[key] = value;
            }
            input.readMapEnd();
            return result;
          }
          case TType.LIST: {
            const result: any[] = [];
            const list = input.readListBegin();
            for (let i = 0; i < list.size; i++) {
              const element = this.readType(list.elementType, input);
              result.push(element);
            }
            input.readListEnd();
            return result;
          }
          case TType.SET: {
            const result: any[] = [];
            const list = input.readSetBegin();
            for (let i = 0; i < list.size; i++) {
              const element = this.readType(list.elementType, input);
              result.push(element);
            }
            input.readSetEnd();
            return result;
          }
        }
      }

      async doRequest(methodName: string, args: any, fields: TypeMap, context?: any) {
        const Transport = this.transport;
        const Protocol = this.protocol;
        const writer: TTransport = new Transport();
        const output: TProtocol = new Protocol(writer);
        const id = this.incrementRequestId();
        output.writeMessageBegin(methodName, MessageType.CALL, id);
        this.writeType(
          {
            name: pascalCase(methodName) + '__Args',
            type: TType.STRUCT,
            fields,
            id,
          },
          args,
          output
        );
        output.writeMessageEnd();
        const data: Buffer = await this.connection.send(writer.flush(), context);
        const reader: TTransport = this.transport.receiver(data);
        const input: TProtocol = new Protocol(reader);
        const { fieldName, messageType }: IThriftMessage = input.readMessageBegin();
        if (fieldName === methodName) {
          if (messageType === MessageType.EXCEPTION) {
            const err: TApplicationException = TApplicationExceptionCodec.decode(input);
            input.readMessageEnd();
            return Promise.reject(err);
          } else {
            const result = this.readType(TType.STRUCT, input);
            input.readMessageEnd();
            if (result.success != null) {
              return result.success;
            } else {
              throw new TApplicationException(
                TApplicationExceptionType.UNKNOWN,
                methodName + ' failed: unknown result'
              );
            }
          }
        } else {
          throw new TApplicationException(
            TApplicationExceptionType.WRONG_METHOD_NAME,
            'Received a response to an unknown RPC function: ' + fieldName
          );
        }
      }
    }
    const thriftHttpClient = createHttpClient(MeshThriftClient, {
      ...this.config,
      requestOptions: {
        headers: operationHeaders,
      },
    });

    function processComments(comments: Comment[]) {
      return comments.map(comment => comment.value).join('\n');
    }

    function getGraphQLFunctionType(
      functionType: FunctionType,
      id = Math.random()
    ): { outputType: GraphQLOutputType; inputType: GraphQLInputType; typeVal: TypeVal } {
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
          const ofTypeList = getGraphQLFunctionType(functionType.valueType, id);
          inputType = new GraphQLList(ofTypeList.inputType);
          outputType = new GraphQLList(ofTypeList.outputType);
          typeVal = typeVal! || { type: TType.LIST, elementType: ofTypeList.typeVal };
          break;
        }
        case SyntaxType.SetType: {
          const ofSetType = getGraphQLFunctionType(functionType.valueType, id);
          inputType = new GraphQLList(ofSetType.inputType);
          outputType = new GraphQLList(ofSetType.outputType);
          typeVal = typeVal! || { type: TType.SET, elementType: ofSetType.typeVal };
          break;
        }
        case SyntaxType.MapType: {
          inputType = GraphQLJSON;
          outputType = GraphQLJSON;
          const ofTypeKey = getGraphQLFunctionType(functionType.keyType, id);
          const ofTypeValue = getGraphQLFunctionType(functionType.valueType, id);
          typeVal = typeVal! || { type: TType.MAP, keyType: ofTypeKey.typeVal, valType: ofTypeValue.typeVal };
          break;
        }
        case SyntaxType.Identifier: {
          const typeName = functionType.value;
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
          typeVal = topTypeMap[typeName];
          break;
        }
        default:
          throw new Error(`Unknown function type: ${inspect(functionType)}!`);
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

    const { args: commonArgs, contextVariables } = parseInterpolationStrings(Object.values(operationHeaders || {}));

    const headersFactory = getInterpolatedHeadersFactory(operationHeaders);

    for (const statement of thriftAST.body) {
      switch (statement.type) {
        case SyntaxType.EnumDefinition:
          enumTypeMap.set(
            statement.name.value,
            new GraphQLEnumType({
              name: statement.name.value,
              description: processComments(statement.comments),
              values: statement.members.reduce(
                (prev, curr) => ({
                  ...prev,
                  [curr.name.value]: {
                    description: processComments(curr.comments),
                    value: curr.name.value,
                  },
                }),
                {} as GraphQLEnumValueConfigMap
              ),
            })
          );
          break;
        case SyntaxType.StructDefinition: {
          const structName = statement.name.value;
          const description = processComments(statement.comments);
          const objectFields: GraphQLFieldConfigMap<any, any> = {};
          const inputObjectFields: GraphQLInputFieldConfigMap = {};
          const structTypeVal: StructTypeVal = {
            id: Math.random(),
            name: structName,
            type: TType.STRUCT,
            fields: {},
          };
          topTypeMap[structName] = structTypeVal;
          const structFieldTypeMap = structTypeVal.fields;
          for (const field of statement.fields) {
            const fieldName = field.name.value;
            let fieldOutputType: GraphQLOutputType;
            let fieldInputType: GraphQLInputType;
            const description = processComments(field.comments);
            const processedFieldTypes = getGraphQLFunctionType(field.fieldType, field.fieldID?.value);
            fieldOutputType = processedFieldTypes.outputType;
            fieldInputType = processedFieldTypes.inputType;

            if (field.requiredness === 'required') {
              fieldOutputType = new GraphQLNonNull(fieldOutputType);
              fieldInputType = new GraphQLNonNull(fieldInputType);
            }

            objectFields[fieldName] = {
              type: fieldOutputType,
              description,
            };
            inputObjectFields[fieldName] = {
              type: fieldInputType,
              description,
            };
            structFieldTypeMap[fieldName] = processedFieldTypes.typeVal;
          }
          outputTypeMap.set(
            structName,
            new GraphQLObjectType({
              name: structName,
              description,
              fields: objectFields,
            })
          );
          inputTypeMap.set(
            structName,
            new GraphQLInputObjectType({
              name: structName + 'Input',
              description,
              fields: inputObjectFields,
            })
          );
          break;
        }
        case SyntaxType.ServiceDefinition:
          for (const fnIndex in statement.functions) {
            const fn = statement.functions[fnIndex];
            const fnName = fn.name.value;
            const description = processComments(fn.comments);
            const { outputType: returnType } = getGraphQLFunctionType(fn.returnType, Number(fnIndex) + 1);
            const args: GraphQLFieldConfigArgumentMap = {};
            for (const argName in commonArgs) {
              args[argName] = {
                type: inputTypeMap.get(commonArgs[argName].type) || GraphQLID,
              };
            }
            const fieldTypeMap: TypeMap = {};
            for (const field of fn.fields) {
              const fieldName = field.name.value;
              const fieldDescription = processComments(field.comments);
              let { inputType: fieldType, typeVal } = getGraphQLFunctionType(field.fieldType, field.fieldID?.value);
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
              resolve: async (root, args, context, info) =>
                thriftHttpClient.doRequest(fnName, args, fieldTypeMap, {
                  headers: headersFactory({ root, args, context, info, env }),
                }),
            };
            methodNames.push(fnName);
            methodAnnotations[fnName] = { annotations: {}, fieldAnnotations: {} };
            methodParameters[fnName] = fn.fields.length + 1;
          }
          break;
        case SyntaxType.TypedefDefinition: {
          const { inputType, outputType } = getGraphQLFunctionType(statement.definitionType, Math.random());
          const typeName = statement.name.value;
          inputTypeMap.set(typeName, inputType);
          outputTypeMap.set(typeName, outputType);
          break;
        }
      }
    }

    const queryObjectType = new GraphQLObjectType({
      name: 'Query',
      fields: rootFields,
    });

    const schema = new GraphQLSchema({
      query: queryObjectType,
    });

    return {
      schema,
      contextVariables,
    };
  }
}
