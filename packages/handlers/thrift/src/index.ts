import { MeshHandlerLibrary, YamlConfig } from "@graphql-mesh/types";
import { parse, ThriftDocument, ThriftErrors, SyntaxType, Comment, FunctionType } from '@creditkarma/thrift-parser';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import AggregateError from 'aggregate-error';
import { GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLBoolean, GraphQLInt, GraphQLFloat, GraphQLString, GraphQLObjectType, GraphQLInputObjectType, GraphQLObjectTypeConfig, GraphQLInputObjectTypeConfig, GraphQLInputFieldConfigMap, GraphQLFieldConfigMap, GraphQLOutputType, GraphQLInputType, GraphQLList, GraphQLNonNull, GraphQLFieldConfigArgumentMap, GraphQLSchema } from "graphql";
import { BigIntResolver as GraphQLBigInt, JSONResolver as GraphQLJSON } from 'graphql-scalars';
import {
    createHttpClient,
    HttpConnection,
} from '@creditkarma/thrift-client';
import { ThriftClient, IThriftAnnotations, IMethodAnnotations, TTransport, TProtocol, MessageType, IThriftMessage, TApplicationException, TApplicationExceptionCodec, TApplicationExceptionType, TType, IThriftField } from '@creditkarma/thrift-server-core';
import { pascalCase } from 'pascal-case';

const handler: MeshHandlerLibrary<YamlConfig.ThriftHandler> = {
    async getMeshSource({ config, cache }) {
        const rawThrift = await readFileOrUrlWithCache<string>(config.idl, cache, { allowUnknownExtensions: true });
        const thriftAST: ThriftDocument | ThriftErrors = parse(rawThrift, { organize: false, });


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

        type TypeVal = BaseTypeVal | ListTypeVal | SetTypeVal | MapTypeVal | EnumTypeVal | StructTypeVal;
        type BaseTypeVal = { id: number, type: TType.BOOL | TType.BYTE | TType.DOUBLE | TType.I16 | TType.I32 | TType.I64 | TType.STRING };
        type ListTypeVal = { id: number, type: TType.LIST, ofType: TypeVal };
        type SetTypeVal = { id: number, type: TType.SET, ofType: TypeVal };
        type MapTypeVal = { id: number, type: TType.MAP };
        type EnumTypeVal = { id: number, type: TType.ENUM };
        type StructTypeVal = { id: number, type: TType.STRUCT, name: string, fields: TypeMap };
        type TypeMap = Record<string, TypeVal>;
        const topTypeMap: TypeMap = {};

        class MeshThriftClient<Context = any> extends ThriftClient<Context> {
            public static readonly serviceName: string = config.serviceName;
            public static readonly annotations: IThriftAnnotations = annotations;
            public static readonly methodAnnotations: IMethodAnnotations = methodAnnotations;
            public static readonly methodNames: Array<string> = methodNames;
            public readonly _serviceName: string = config.serviceName;
            public readonly _annotations: IThriftAnnotations = annotations;
            public readonly _methodAnnotations: IMethodAnnotations = methodAnnotations;
            public readonly _methodNames: Array<string> = methodNames;
            public readonly _methodParameters?: {
                [methodName: string]: number;
            } = methodParameters;

            private encode(structName: string, args: any, typeMap: TypeMap, output: TProtocol) {
                output.writeStructBegin(structName);
                const argNames = Object.keys(args).sort((a, b) => typeMap[a].id.toString().localeCompare(typeMap[b].id.toString()));
                for (const argName of argNames) {
                    const argType = typeMap[argName];
                    const argVal = args[argName];
                    if (argVal) {
                        switch (argType.type) {
                            case TType.BOOL:
                                output.writeFieldBegin(argName, TType.BOOL, argType.id);
                                output.writeBool(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.BYTE:
                                output.writeFieldBegin(argName, TType.BYTE, argType.id);
                                output.writeByte(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.DOUBLE:
                                output.writeFieldBegin(argName, TType.DOUBLE, argType.id);
                                output.writeDouble(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.I16:
                                output.writeFieldBegin(argName, TType.I16, argType.id);
                                output.writeI16(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.I32:
                                output.writeFieldBegin(argName, TType.I32, argType.id);
                                output.writeI32(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.I64:
                                output.writeFieldBegin(argName, TType.I32, argType.id);
                                output.writeI64(argVal.toString());
                                output.writeFieldEnd();
                                break;
                            case TType.STRING:
                                output.writeFieldBegin(argName, TType.STRING, argType.id);
                                output.writeString(argVal);
                                output.writeFieldEnd();
                                break;
                            case TType.STRUCT:
                                output.writeFieldBegin(argName, argType.type, argType.id);
                                this.encode(argType.name, argVal, argType.fields, output);
                                output.writeFieldEnd();
                                break;
                            case TType.ENUM:
                                // TODO: A
                                break;
                            case TType.MAP:
                                // TODO: A
                                break;
                            case TType.LIST:
                                // TODO: A
                                break;
                        }
                    }
                }

                output.writeFieldStop();
                output.writeStructEnd();
            }
            decode(input: TProtocol) {
                const result: any = {};
                input.readStructBegin();
                while (true) {
                    const field: IThriftField = input.readFieldBegin();
                    const fieldType = field.fieldType;
                    const fieldName = field.fieldName || 'success';
                    if (fieldType === TType.STOP) {
                        break;
                    }
                    switch (fieldType) {
                        case TType.BOOL:
                            result[fieldName] = input.readBool();
                            break;
                        case TType.BYTE:
                            result[fieldName] = input.readByte();
                            break;
                        case TType.DOUBLE:
                            result[fieldName] = input.readDouble();
                            break;
                        case TType.I16:
                            result[fieldName] = input.readI16();
                            break;
                        case TType.I32:
                            result[fieldName] = input.readI32();
                            break;
                        case TType.I64:
                            result[fieldName] = BigInt(input.readI64().toString());
                            break;
                        case TType.STRING:
                            result[fieldName] = input.readString();
                            break;
                        case TType.STRUCT:
                            input.readStructBegin();
                            this.decode(input);
                            input.readStructBegin();
                            break;
                        case TType.ENUM:
                            // TODO: A
                            break;
                        case TType.MAP:
                            // TODO: A
                            break;
                        case TType.LIST:
                            // TODO: A
                            break;
                    }
                    input.readFieldEnd();
                }
                input.readStructEnd();
                return result;
            }
            async doRequest(methodName: string, args: any, typeMap: TypeMap, returnTypeVal: TypeVal, context?: any) {
                const writer: TTransport = new this.transport();
                const output: TProtocol = new this.protocol(writer);
                output.writeMessageBegin(methodName, MessageType.CALL, this.incrementRequestId());
                this.encode(pascalCase(methodName) + '__Args', args, typeMap, output);
                output.writeMessageEnd();
                const data: Buffer = await this.connection.send(writer.flush(), context);
                const reader: TTransport = this.transport.receiver(data);
                const input: TProtocol = new this.protocol(reader);
                const { fieldName, messageType }: IThriftMessage = input.readMessageBegin();
                if (fieldName === methodName) {
                    if (messageType === MessageType.EXCEPTION) {
                        const err: TApplicationException = TApplicationExceptionCodec.decode(input);
                        input.readMessageEnd();
                        return Promise.reject(err);
                    }
                    else {
                        const result = this.decode(input);
                        input.readMessageEnd();
                        if (result.success != null) {
                            return result.success;
                        }
                        else {
                            throw new TApplicationException(TApplicationExceptionType.UNKNOWN, methodName + " failed: unknown result");
                        }
                    }
                }
                else {
                    throw new TApplicationException(TApplicationExceptionType.WRONG_METHOD_NAME, "Received a response to an unknown RPC function: " + fieldName);
                }
            }
        }
        const thriftHttpClient = createHttpClient(MeshThriftClient, config);

        function processComments(comments: Comment[]) {
            return comments.map(comment => comment.value).join('\n');
        }

        function getGraphQLFunctionType(functionType: FunctionType, id = Math.random()): { outputType: GraphQLOutputType; inputType: GraphQLInputType; typeVal: TypeVal } {
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
                case SyntaxType.BoolKeyword:
                    typeVal = typeVal! || { type: TType.BOOL };
                    inputType = GraphQLBoolean;
                    outputType = GraphQLBoolean;
                    break;
                case SyntaxType.I8Keyword:
                    typeVal = typeVal! || { type: TType.I08 };
                case SyntaxType.I16Keyword:
                    typeVal = typeVal! || { type: TType.I16 };
                case SyntaxType.I32Keyword:
                    typeVal = typeVal! || { type: TType.I32 };
                case SyntaxType.ByteKeyword:
                    inputType = GraphQLInt;
                    outputType = GraphQLInt;
                    typeVal = typeVal! || { type: TType.BYTE };
                    break;
                case SyntaxType.I64Keyword:
                    inputType = GraphQLBigInt;
                    outputType = GraphQLBigInt;
                    typeVal = typeVal! || { type: TType.I64 };
                    break;
                case SyntaxType.ListType:
                    const ofTypeList = getGraphQLFunctionType(functionType.valueType, id);
                    inputType = new GraphQLList(ofTypeList.inputType);
                    outputType = new GraphQLList(ofTypeList.outputType);
                    typeVal = typeVal! || { type: TType.LIST, ofType: ofTypeList.typeVal };
                case SyntaxType.SetType:
                    const ofSetType = getGraphQLFunctionType(functionType.valueType, id);
                    inputType = new GraphQLList(ofSetType.inputType);
                    outputType = new GraphQLList(ofSetType.outputType);
                    typeVal = typeVal! || { type: TType.SET, ofType: ofSetType.typeVal };
                    break;
                case SyntaxType.MapType:
                    inputType = GraphQLJSON;
                    outputType = GraphQLJSON;
                    // TODO: typeVal = ???
                    break;
                case SyntaxType.Identifier:
                    let typeName = functionType.value;
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
                default:
                    throw new Error(`Unknown function type: ${JSON.stringify(functionType, null, 2)}!`);
            }
            return {
                inputType: inputType!, outputType: outputType!, typeVal: {
                    ...typeVal!,
                    id,
                }
            };
        }

        switch (thriftAST.type) {
            case SyntaxType.ThriftDocument:
                for (const statement of thriftAST.body) {
                    switch (statement.type) {
                        case SyntaxType.EnumDefinition:
                            enumTypeMap.set(statement.name.value, new GraphQLEnumType({
                                name: statement.name.value,
                                description: processComments(statement.comments),
                                values: statement.members.reduce((prev, curr) => ({
                                    ...prev,
                                    [curr.name.value]: {
                                        description: processComments(curr.comments),
                                        value: curr.name.value,
                                    },
                                }), {} as GraphQLEnumValueConfigMap)
                            }))
                            break;
                        case SyntaxType.StructDefinition:
                            const structName = statement.name.value;
                            const description = processComments(statement.comments);
                            const objectFields: GraphQLFieldConfigMap<any, any> = {};
                            const inputObjectFields: GraphQLInputFieldConfigMap = {};
                            const structTypeVal: StructTypeVal = { id: Math.random(), name: structName, type: TType.STRUCT, fields: {} };
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

                                if (field.requiredness == 'required') {
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
                            outputTypeMap.set(structName, new GraphQLObjectType({
                                name: structName,
                                description,
                                fields: objectFields,
                            }));
                            inputTypeMap.set(structName, new GraphQLInputObjectType({
                                name: structName + 'Input',
                                description,
                                fields: inputObjectFields,
                            }));
                            break;
                        case SyntaxType.ServiceDefinition:
                            for (const fnIndex in statement.functions) {
                                const fn = statement.functions[fnIndex];
                                const fnName = fn.name.value;
                                const description = processComments(fn.comments);
                                const { outputType: returnType, typeVal: returnTypeVal } = getGraphQLFunctionType(fn.returnType, Number(fnIndex) + 1);
                                const args: GraphQLFieldConfigArgumentMap = {};
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
                                    resolve: async (_, args) => thriftHttpClient.doRequest(fnName, args, fieldTypeMap, returnTypeVal),
                                };
                                methodNames.push(fnName);
                                methodAnnotations[fnName] = { annotations: {}, fieldAnnotations: {} };
                                methodParameters[fnName] = fn.fields.length + 1;
                            }
                            break;
                        case SyntaxType.TypedefDefinition:
                            const { inputType, outputType } = getGraphQLFunctionType(statement.definitionType, Math.random());
                            const typeName = statement.name.value;
                            inputTypeMap.set(typeName, inputType);
                            outputTypeMap.set(typeName, outputType);
                            break;
                    }
                }
                return {
                    schema: new GraphQLSchema({
                        query: new GraphQLObjectType({
                            name: 'Query',
                            fields: rootFields,
                        }),
                    }),
                };
            // break;
            case SyntaxType.ThriftErrors:
                throw new AggregateError(thriftAST.errors);
        }
    }
};

export default handler;