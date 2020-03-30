import { GraphQLOutputType, GraphQLInputType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLScalarType, GraphQLEnumType, GraphQLEnumValueConfigMap, Kind, ObjectTypeDefinitionNode, GraphQLFieldConfigMap, GraphQLObjectType, GraphQLList, GraphQLInterfaceType, GraphQLNonNull, GraphQLInputObjectType, GraphQLInputFieldConfigMap, GraphQLID, GraphQLFieldConfigArgumentMap } from "graphql";
import { BigIntResolver as GraphQLBigInt, GUIDResolver as GraphQLGUID, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import fetchache, { KeyValueCache, Headers } from "fetchache";
import urljoin from 'url-join';
import { camelCase } from 'camel-case';

const SCALARS: [string, GraphQLScalarType][] = [
    ['Edm.Binary', GraphQLString],
    ['Edm.Stream', GraphQLString],
    ['Edm.String', GraphQLString],
    ['Edm.Int16', GraphQLInt],
    ['Edm.Int32', GraphQLInt],
    ['Edm.Int64', GraphQLBigInt],
    ['Edm.Double', GraphQLFloat],
    ['Edm.Boolean', GraphQLBoolean],
    ['Edm.Guid', GraphQLGUID],
    ['Edm.DateTimeOffset', GraphQLString],
    ['Edm.Date', GraphQLDateTime],
    ['Edm.TimeOfDay', GraphQLString],
    ['Edm.Single', GraphQLFloat],
    ['Edm.Duration', GraphQLString],
];

interface EndpointConfig {
    baseUrl: string;
    metadataHeaders?: HeadersInit;
    operationHeaders?: HeadersInit;
}

interface ServiceConfig extends EndpointConfig {
    servicePath: string;
    serviceBaseUrlFactory: (params: any) => string;
    args: GraphQLFieldConfigArgumentMap;
}

export class SchemaFactory {
    private inputTypeMap: Map<string, GraphQLInputType>;
    private outputTypeMap: Map<string, GraphQLOutputType>;
    constructor(private cache: KeyValueCache) {
        this.inputTypeMap = new Map<string, GraphQLInputType>(SCALARS);
        this.outputTypeMap = new Map<string, GraphQLOutputType>(SCALARS);
    }
    EnumType(enumElement: CheerioElement) {
        const values: GraphQLEnumValueConfigMap = {};
        for (const memberElement of enumElement.children) {
            const key = memberElement.attribs['Name'];
            const value = memberElement.attribs['Name'];
            values[key] = {
                value,
            };
        }
        const enumName = enumElement.attribs['Name'];
        const graphQLEnumType = new GraphQLEnumType({
            name: enumName,
            values,
        });
        const schemaNamespace = enumElement.parent.attribs.Namespace;
        this.inputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
        this.outputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
    }
    dependenciesHold = new Map<string, Set<string>>();
    holdFactory = new Map<string, () => void>();
    ObjectType(objectElement: CheerioElement, hasId: boolean, endpointConfig: EndpointConfig) {
        const factory = () => {
            const typeName = objectElement.attribs['Name'];
            const inputFields: GraphQLInputFieldConfigMap = {};
            const outputFields: GraphQLFieldConfigMap<any, any> = {};
            if (hasId) {
                outputFields['id'] = {
                    type: GraphQLID,
                    resolve: root => root[identifierFieldName],
                };
            }
            let identifierFieldName = 'id';
            let broke = false;
            for (const child of objectElement.children) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'property' ||
                    tag === 'navigationproperty') {
                    const fieldName = child.attribs['Name'];
                    let fieldTypeName = child.attribs['Type'];
                    let isList = false;
                    if (fieldTypeName.startsWith('Collection(')) {
                        isList = true;
                        fieldTypeName = fieldTypeName
                        .replace('Collection(', '')
                        .replace(')', '');
                    }
                    let inputFieldType = this.inputTypeMap.get(fieldTypeName);
                    let outputFieldType = this.outputTypeMap.get(fieldTypeName);
                    if (!outputFieldType || !inputFieldType) {
                        if (!this.dependenciesHold.has(fieldTypeName)) {
                            this.dependenciesHold.set(fieldTypeName, new Set());
                        }
                        this.dependenciesHold.get(fieldTypeName)?.add(typeName);
                        this.holdFactory.set(typeName, factory);
                        broke = true;
                        break;
                    }
                    if (isList) {
                        outputFieldType = new GraphQLList(outputFieldType);
                    }
                    if (child.attribs['Nullable'] === 'false') {
                        outputFieldType = new GraphQLNonNull(outputFieldType);
                    }
                    inputFields[fieldName] = {
                        type: inputFieldType,
                    };
                    outputFields[fieldName] = {
                        type: outputFieldType,
                    };
                    if (tag === 'navigationproperty') {
                        outputFields[fieldName].resolve = async (root, args, context, info) => {
                            const navigationUrl = root[fieldName + '@odata.navigationLink'];;
                            const navigationRequest = new Request(navigationUrl, {
                                headers: {
                                    'Accept': 'application/json; odata.metadata=full',
                                    'Content-Type': 'application/json; odata.metadata=full',
                                    ...endpointConfig.operationHeaders,
                                },
                            })
                            const response = await fetchache(navigationRequest, this.cache);
                            return response.json();
                        }
                    }
                }
                if (tag === 'key') {
                    identifierFieldName = child.children[0].attribs['Name'];
                }
            }
            if (!broke) {
                const schemaNamespace = objectElement.parent.attribs.Namespace;
                const typeRef = `${schemaNamespace}.${typeName}`;
                this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                    name: typeName,
                    fields: inputFields,
                }))
                if (objectElement.attribs['Abstract']) {
                    this.outputTypeMap.set(typeRef, new GraphQLInterfaceType({
                        name: typeName,
                        fields: outputFields,
                    }))
                } else {
                    const interfaces: GraphQLInterfaceType[] = [];
                    const interfaceName = objectElement.attribs['BaseType'];
                    if (interfaceName) {
                        const interfaceInputType = this.inputTypeMap.get(interfaceName) as GraphQLInputObjectType;
                        const interfaceOutputType = this.outputTypeMap.get(interfaceName) as GraphQLInterfaceType;
                        if (!interfaceInputType || !interfaceOutputType) {
                            if (!this.dependenciesHold.has(interfaceName)) {
                                this.dependenciesHold.set(interfaceName, new Set());
                            }
                            this.dependenciesHold.get(interfaceName)?.add(typeName);
                            this.holdFactory.set(typeName, factory);
                            return;
                        }
                        Object.assign(inputFields, interfaceInputType.toConfig().fields);
                        Object.assign(outputFields, interfaceOutputType.toConfig().fields);
                        interfaces.push(interfaceOutputType);
                    }
                    this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                        name: typeName,
                        fields: inputFields,
                    }))
                    this.outputTypeMap.set(typeRef, new GraphQLObjectType({
                        name: typeName,
                        fields: outputFields,
                        interfaces,
                    }))
                }
                this.dependenciesHold.get(typeRef)?.forEach(depTypeRef => {
                    const factory = this.holdFactory.get(depTypeRef);
                    if (factory) {
                        factory();
                    }
                });
            }
        }
    }
    async Service(serviceConfig: ServiceConfig): Promise<{ queryFields: GraphQLFieldConfigMap<any, any>, mutationFields?: GraphQLFieldConfigMap<any, any>}> {
        const metadataUrl = urljoin(serviceConfig.baseUrl, serviceConfig.servicePath, '$metadata');
        const metadataRequest = new Request(urljoin(metadataUrl, '$metadata'), {
            headers: serviceConfig.metadataHeaders,
        });
        const response = await fetchache(metadataRequest, this.cache);
        const text = await response.text();
        const $ = cheerio.load(text);
        
        $('EnumType').each((i, enumElement) => this.EnumType(enumElement));
        $('ComplexType').each((i, enumElement) => this.ObjectType(enumElement, false, serviceConfig));
        $('EntityType').each((i, enumElement) => this.ObjectType(enumElement, true, serviceConfig));
        const queryFields: GraphQLFieldConfigMap<any, any> = {};
        $('EntityContainer').each((i, entityElement) => {
            for (const entitySetElement of entityElement.children) {
                const entitySetName = entitySetElement.attribs['Name'];
                const entitySetTypeName = entitySetElement.attribs['EntityType'];
                queryFields[entitySetName + 'All'] = {
                    type: this.outputTypeMap.get(entitySetTypeName)!,
                    args: {
                        ...serviceConfig.args,
                    },
                    resolve: async (root, args, context, info) => {
                        const serviceBaseUrl = serviceConfig.serviceBaseUrlFactory({ root, args, context, info });
                        const entitySetUrl = urljoin(serviceBaseUrl, entitySetName);
                        const entitySetRequest = new Request(entitySetUrl, {
                            headers: serviceConfig.operationHeaders,
                        });
                        const response = await fetchache(entitySetRequest, this.cache);
                        return response.json();
                    },
                };
                queryFields[entitySetName] = {
                    type: this.outputTypeMap.get(entitySetTypeName)!,
                    args: {
                        ...serviceConfig.args,
                        id: {
                            type: new GraphQLNonNull(GraphQLID),
                        }
                    },
                    resolve: async (root, args, context, info) => {
                        const serviceBaseUrl = serviceConfig.serviceBaseUrlFactory({ root, args, context, info });
                        const entitySetUrl = urljoin(serviceBaseUrl, entitySetName + `(${args.id})`);
                        const entitySetRequest = new Request(entitySetUrl, {
                            headers: serviceConfig.operationHeaders,
                        });
                        const response = await fetchache(entitySetRequest, this.cache);
                        return response.json();
                    },
                };
            }
        });
        //TODO
        $('Function')
        //TODO
        $('Action')

        return {
            queryFields
        };

    }
}