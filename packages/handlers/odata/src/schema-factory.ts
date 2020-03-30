import { GraphQLOutputType, GraphQLInputType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLScalarType, GraphQLEnumType, GraphQLEnumValueConfigMap, Kind, ObjectTypeDefinitionNode, GraphQLFieldConfigMap, GraphQLObjectType, GraphQLList, GraphQLInterfaceType, GraphQLNonNull, GraphQLInputObjectType, GraphQLInputFieldConfigMap, GraphQLID, GraphQLFieldConfigArgumentMap } from "graphql";
import { BigIntResolver as GraphQLBigInt, GUIDResolver as GraphQLGUID, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import { KeyValueCache, Headers, Request, fetchache } from "fetchache";
import urljoin from 'url-join';
import { camelCase } from 'camel-case';
import Interpolator from 'string-interpolation/src';
import { JSDOM } from 'jsdom';

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
    metadataHeaders?: Record<string, string>;
    operationHeaders?: Record<string, string>;
}

interface ServiceConfig extends EndpointConfig {
    servicePath: string;
}

export class SchemaFactory {
    private inputTypeMap: Map<string, GraphQLInputType>;
    private outputTypeMap: Map<string, GraphQLOutputType>;
    constructor(private cache: KeyValueCache) {
        this.inputTypeMap = new Map<string, GraphQLInputType>(SCALARS);
        this.outputTypeMap = new Map<string, GraphQLOutputType>(SCALARS);
    }
    EnumType(enumElement: Element) {
        const values: GraphQLEnumValueConfigMap = {};
        enumElement.querySelectorAll('Member').forEach(memberElement => {
            const key = memberElement.getAttribute('Name')!;
            const value = memberElement.getAttribute('Value')!;
            values[key] = {
                value,
            };
        })
        const enumName = enumElement.getAttribute('Name')!;
        const graphQLEnumType = new GraphQLEnumType({
            name: enumName,
            values,
        });
        const schemaNamespace = enumElement.parentElement?.getAttribute('Namespace')!;
        this.inputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
        this.outputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
    }
    dependenciesHold = new Map<string, Set<string>>();
    holdFactory = new Map<string, () => void>();
    ObjectType(objectElement: Element, hasId: boolean, headersFactory: (data: any) => Headers) {
        const factory = () => {
            const typeName = objectElement.getAttribute('Name')!;
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
            const fieldFactory = (child: Element) => {
                const tag = child.tagName.toLowerCase();
                const fieldName = child.getAttribute('Name')!;
                let fieldTypeName = child.getAttribute('Type')!;
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
                    return;
                }
                if (isList) {
                    outputFieldType = new GraphQLList(outputFieldType);
                }
                if (child.getAttribute('Nullable') === 'false') {
                    outputFieldType = new GraphQLNonNull(outputFieldType);
                }
                inputFields[fieldName] = {
                    type: inputFieldType,
                };
                outputFields[fieldName] = {
                    type: outputFieldType,
                };
                if (tag === 'navigationproperty') {
                    outputFields[fieldName].resolve = async (root, args, context, info: any) => {
                        const navigationUrl = root[fieldName + '@odata.navigationLink'];
                        const interpolationData = { root, args, context, info };
                        context._headers = root.headers || headersFactory(interpolationData)
                        if (!context._headers.has('Accept')) {
                            context._headers.set('Accept', 'application/json; odata.metadata=full');
                        }
                        if (!context._headers.has('Content-Type')) {
                            context._headers.set('Content-Type', 'application/json; odata.metadata=full');
                        }
                        const navigationRequest = new Request(navigationUrl, {
                            headers: context._headers,
                        })
                        const response = await fetchache(navigationRequest, this.cache);
                        const responseJson =  await response.json();
                        return responseJson.value;
                    }
                }
        }
            objectElement.querySelectorAll('Property').forEach(field => fieldFactory(field));
            objectElement.querySelectorAll('NavigationProperty').forEach(field => fieldFactory(field));
            identifierFieldName = objectElement.querySelector('PropertyRef')?.getAttribute('Name')!;
            if (!broke) {
                const schemaNamespace = objectElement.parentElement?.getAttribute('Namespace');
                const typeRef = `${schemaNamespace}.${typeName}`;
                if (objectElement.getAttribute('Abstract')) {
                    this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                        name: typeName,
                        fields: inputFields,
                    }))
                    this.outputTypeMap.set(typeRef, new GraphQLInterfaceType({
                        name: typeName,
                        fields: outputFields,
                        resolveType: root => this.outputTypeMap.get(root['@odata.type'].replace('#', '')) as GraphQLObjectType,
                    }))
                } else {
                    const interfaces: GraphQLInterfaceType[] = [];
                    const interfaceName = objectElement.getAttribute('BaseType');
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
        factory();
    }
    async Service(serviceConfig: ServiceConfig): Promise<{ queryFields: GraphQLFieldConfigMap<any, any>, mutationFields: GraphQLFieldConfigMap<any, any>, contextVariables: string[] }> {
        const metadataUrl = urljoin(serviceConfig.baseUrl, serviceConfig.servicePath, '$metadata');
        const metadataRequest = new Request(metadataUrl, {
            headers: serviceConfig.metadataHeaders,
        });

        const interpolator = new Interpolator();

        const contextVariables: string[] = [];
        const serviceArgs: GraphQLFieldConfigArgumentMap = {};

        const interpolationStrings = [
            ...(serviceConfig.operationHeaders
                ? Object.keys(serviceConfig.operationHeaders).map(
                    headerName => serviceConfig.operationHeaders![headerName]
                )
                : []),
            serviceConfig.baseUrl,
        ];

        const interpolationKeys: string[] = interpolationStrings.reduce(
            (keys, str) => [
                ...keys,
                ...interpolator.parseRules(str).map((match: any) => match.key)
            ],
            [] as string[]
        );

        for (const interpolationKey of interpolationKeys) {
            const interpolationKeyParts = interpolationKey.split('.');
            const varName =
                interpolationKeyParts[interpolationKeyParts.length - 1];
            if (interpolationKeyParts[0] === 'args') {
                if (varName === 'id') {
                    throw new Error(
                        `Argument name cannot be 'id'. Invalid statement; '${interpolationKey}'`
                    );
                }
                serviceArgs[varName] = {
                    type: new GraphQLNonNull(GraphQLID)
                };
            } else if (interpolationKeyParts[0] === 'context') {
                contextVariables.push(varName);
            }
        }

        const serviceBaseUrlFactory = (interpolationData: any) => interpolator.parse(urljoin(serviceConfig.baseUrl, serviceConfig.servicePath), interpolationData);

        const headersFactory = (interpolationData: any) => {
            const headers = new Headers();
            const headersNoninterpolated = serviceConfig.operationHeaders || {};
            for (const headerName in headersNoninterpolated) {
                headers.set(headerName, interpolator.parse(headersNoninterpolated[headerName], interpolationData))
            }
            return headers;
        }

        const response = await fetchache(metadataRequest, this.cache);
        const text = await response.text();
        const { window: { document } } = new JSDOM(text);


        document.querySelectorAll('EnumType').forEach(enumElement => this.EnumType(enumElement))
        document.querySelectorAll('ComplexType').forEach(objectElement => this.ObjectType(objectElement, false, headersFactory))
        document.querySelectorAll('EntityType').forEach(objectElement => this.ObjectType(objectElement, true, headersFactory));
        const queryFields: GraphQLFieldConfigMap<any, any> = {};
        document.querySelectorAll('EntityContainer').forEach(entityContainerElement => {
            entityContainerElement.querySelectorAll('EntitySet').forEach(entitySetElement => {
                const entitySetName = entitySetElement.getAttribute('Name');
                const entitySetTypeName = entitySetElement.getAttribute('EntityType');
                queryFields[camelCase(entitySetName + '_All')] = {
                    type: new GraphQLList(this.outputTypeMap.get(entitySetTypeName!)!),
                    args: {
                        ...serviceArgs,
                    },
                    resolve: async (root, args, context, info: any) => {
                        const interpolationData = { root, args, context, info };
                        context._serviceBaseUrl = context._serviceBaseUrl || serviceBaseUrlFactory(interpolationData);
                        context._headers = context._headers || headersFactory(interpolationData)
                        if (!context._headers.has('Accept')) {
                            context._headers.set('Accept', 'application/json; odata.metadata=full');
                        }
                        if (!context._headers.has('Content-Type')) {
                            context._headers.set('Content-Type', 'application/json; odata.metadata=full');
                        }
                        const entitySetUrl = urljoin(context._serviceBaseUrl, entitySetName!);
                        const entitySetRequest = new Request(entitySetUrl, {
                            headers: context._headers,
                        });
                        const response = await fetchache(entitySetRequest, this.cache);
                        const responseJson =  await response.json();
                        return responseJson.value;
                    },
                };
                queryFields[camelCase(entitySetName!)] = {
                    type: this.outputTypeMap.get(entitySetTypeName!)!,
                    args: {
                        ...serviceArgs,
                        id: {
                            type: new GraphQLNonNull(GraphQLID),
                        }
                    },
                    resolve: async (root, args, context, info: any) => {
                        const interpolationData = { root, args, context, info };
                        context._serviceBaseUrl = context._serviceBaseUrl || serviceBaseUrlFactory(interpolationData);
                        context._headers = context._headers || headersFactory(interpolationData)
                        if (!context._headers.has('Accept')) {
                            context._headers.set('Accept', 'application/json; odata.metadata=full');
                        }
                        if (!context._headers.has('Content-Type')) {
                            context._headers.set('Content-Type', 'application/json; odata.metadata=full');
                        }
                        const entitySetUrl = urljoin(context._serviceBaseUrl, entitySetName + `(${args.id})`);
                        const entitySetRequest = new Request(entitySetUrl, {
                            headers: context._headers,
                        });
                        const response = await fetchache(entitySetRequest, this.cache);
                        const responseJson =  await response.json();
                        return responseJson.value;
                    },
                };
            })

        });
        //TODO
        // $('Function')
        //TODO
        // $('Action')

        return {
            queryFields,
            mutationFields: {},
            contextVariables,
        };

    }
}