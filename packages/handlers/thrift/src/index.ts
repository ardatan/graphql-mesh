import { MeshHandlerLibrary, YamlConfig } from "@graphql-mesh/types";
import { parse, ThriftDocument, ThriftErrors, SyntaxType, Comment, FunctionType } from '@creditkarma/thrift-parser';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import AggregateError from 'aggregate-error';
import { GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLBoolean, GraphQLInt, GraphQLFloat, GraphQLString, GraphQLObjectType, GraphQLInputObjectType, GraphQLObjectTypeConfig, GraphQLInputObjectTypeConfig, GraphQLInputFieldConfigMap, GraphQLFieldConfigMap, GraphQLOutputType, GraphQLInputType, GraphQLList, GraphQLNonNull, GraphQLFieldConfigArgumentMap, GraphQLSchema } from "graphql";
import { BigIntResolver as GraphQLBigInt, JSONResolver as GraphQLJSON } from 'graphql-scalars';

const handler: MeshHandlerLibrary<YamlConfig.ThriftHandler> = {
    async getMeshSource({ config, cache }) {
        const rawThrift = await readFileOrUrlWithCache<string>(config.idl, cache, { allowUnknownExtensions: true });
        const thriftAST: ThriftDocument | ThriftErrors = parse(rawThrift);

        const enumTypeMap = new Map<string, GraphQLEnumType>();
        const outputTypeMap = new Map<string, GraphQLOutputType>();
        const inputTypeMap = new Map<string, GraphQLInputType>();
        const rootFields: GraphQLFieldConfigMap<any, any> = {};

        function processComments(comments: Comment[]) {
            return comments.map(comment => comment.value).join('\n');
        }

        function getGraphQLFunctionType(functionType: FunctionType): { outputType: GraphQLOutputType; inputType: GraphQLInputType; } {
            let inputType: GraphQLInputType;
            let outputType: GraphQLOutputType;
            switch(functionType.type) {
            case SyntaxType.BinaryKeyword:
                case SyntaxType.StringKeyword:
                    inputType = GraphQLString;
                    outputType = GraphQLString;
                    break;
                case SyntaxType.DoubleKeyword:
                    inputType = GraphQLFloat;
                    outputType = GraphQLFloat;
                    break;
                case SyntaxType.VoidKeyword:
                case SyntaxType.BoolKeyword:
                    inputType = GraphQLBoolean;
                    outputType = GraphQLBoolean;
                    break;
                case SyntaxType.I8Keyword:
                case SyntaxType.I16Keyword:
                case SyntaxType.I32Keyword:
                case SyntaxType.ByteKeyword:
                    inputType = GraphQLInt;
                    outputType = GraphQLInt;
                    break;
                case SyntaxType.I64Keyword:
                    inputType = GraphQLBigInt;
                    outputType = GraphQLBigInt;
                    break;
                case SyntaxType.I64Keyword:
                    inputType = GraphQLBigInt;
                    outputType = GraphQLBigInt;
                    break;
                case SyntaxType.ListType:
                case SyntaxType.SetType:
                    const ofType = getGraphQLFunctionType(functionType.valueType);
                    inputType = new GraphQLList(ofType.inputType);
                    outputType = new GraphQLList(ofType.outputType);
                break;
                case SyntaxType.MapType:
                    inputType = GraphQLJSON;
                    outputType = GraphQLJSON;
                    break;
                case SyntaxType.Identifier:
                    let typeName = functionType.value;
                    if (enumTypeMap.has(typeName)){
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
                    break;
                default:
                    throw new Error(`Unknown function type: ${JSON.stringify(functionType, null, 2)}!`);
             }
             return { inputType: inputType!, outputType: outputType! };
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
                            for (const field of statement.fields) {
                                const fieldName = field.name.value;
                                let fieldOutputType: GraphQLOutputType;
                                let fieldInputType: GraphQLInputType;
                                const description = processComments(field.comments);
                                const processedFieldTypes = getGraphQLFunctionType(field.fieldType);
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
                            }
                            outputTypeMap.set(structName, new GraphQLObjectType({
                                name: structName,
                                description,
                                fields: objectFields,
                            }));
                            inputTypeMap.set(structName, new GraphQLInputObjectType({
                                name: structName,
                                description,
                                fields: inputObjectFields,
                            }));
                            break;
                        case SyntaxType.ServiceDefinition:
                            for (const fn of statement.functions) {
                                const fnName = fn.name.value;
                                const description = processComments(fn.comments);
                                const { outputType: returnType } = getGraphQLFunctionType(fn.returnType);
                                const args: GraphQLFieldConfigArgumentMap = {};
                                for (const field of fn.fields) {
                                    const fieldName = field.name.value;
                                    const fieldDescription = processComments(field.comments);
                                    let { inputType: fieldType } = getGraphQLFunctionType(field.fieldType);
                                    if (field.requiredness === 'required') {
                                        fieldType = new GraphQLNonNull(fieldType);
                                    }
                                    args[fieldName] = {
                                        type: fieldType,
                                        description: fieldDescription,
                                    };
                                }
                                rootFields[fnName] = {
                                    type: returnType,
                                    description,
                                    args,
                                };
                            }
                            break;
                        case SyntaxType.TypedefDefinition:
                            const { inputType, outputType } = getGraphQLFunctionType(statement.definitionType);
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