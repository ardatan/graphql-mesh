import { GraphQLOutputType, GraphQLInputType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLScalarType, GraphQLEnumType, GraphQLEnumValueConfigMap, Kind, ObjectTypeDefinitionNode, GraphQLFieldConfigMap, GraphQLObjectType, GraphQLList, GraphQLInterfaceType, GraphQLNonNull, GraphQLInputObjectType, GraphQLInputFieldConfigMap, GraphQLID, GraphQLFieldConfigArgumentMap, GraphQLNamedType, GraphQLUnionType, GraphQLResolveInfo, GraphQLType } from "graphql";
import { BigIntResolver as GraphQLBigInt, GUIDResolver as GraphQLGUID, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import { KeyValueCache, Headers, Request, fetchache } from "fetchache";
import urljoin from 'url-join';
import { camelCase } from 'camel-case';
import Interpolator from 'string-interpolation/src';
import { JSDOM } from 'jsdom';
import graphqlFields from 'graphql-fields';

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

const InlineCountEnum = new GraphQLEnumType({
    name: 'InlineCount',
    values: {
        allpages: {
            value: 'allpages',
            description: 'The OData MUST include a count of the number of entities in the collection identified by the URI (after applying any $filter System Query Options present on the URI)'
        },
        none: {
            value: 'none',
            description: 'The OData service MUST NOT include a count in the response. This is equivalence to a URI that does not include a $inlinecount query string parameter.'
        }
    }
})

const ODataQueryOptions = new GraphQLInputObjectType({
    name: 'QueryOptions',
    fields: {
        'orderby': {
            type: GraphQLString,
            description: 'A data service URI with a $orderby System Query Option specifies an expression for determining what values are used to order the collection of Entries identified by the Resource Path section of the URI. This query option is only supported when the resource path identifies a Collection of Entries.'
        },
        'top': {
            type: GraphQLInt,
            description: 'A data service URI with a $top System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. This subset is formed by selecting only the first N items of the set, where N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.'
        },
        'skip': {
            type: GraphQLInt,
            description: 'A data service URI with a $skip System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. That subset is defined by seeking N Entries into the Collection and selecting only the remaining Entries (starting with Entry N+1). N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.'
        },
        'filter': {
            type: GraphQLString,
            description: 'A URI with a $filter System Query Option identifies a subset of the Entries from the Collection of Entries identified by the Resource Path section of the URI. The subset is determined by selecting only the Entries that satisfy the predicate expression specified by the query option.'
        },
        'inlinecount': {
            type: InlineCountEnum,
            description: 'A URI with a $inlinecount System Query Option specifies that the response to the request includes a count of the number of Entries in the Collection of Entries identified by the Resource Path section of the URI. The count must be calculated after applying any $filter System Query Options present in the URI. The set of valid values for the $inlinecount query option are shown in the table below. If a value other than one shown in Table 4 is specified the URI is considered malformed.'
        }
    }
});

interface EndpointConfig {
    baseUrl: string;
    metadataHeaders?: Record<string, string>;
    operationHeaders?: Record<string, string>;
}

interface ServiceConfig extends EndpointConfig {
    servicePath: string;
}

interface ResolverData {
    root: any, args: any, context: any, info: GraphQLResolveInfo,
}

type ResolverDataFactory<T> = (data: ResolverData) => T; 

export class SchemaFactory {
    private inputTypeMap: Map<string, GraphQLInputType>;
    private outputTypeMap: Map<string, GraphQLOutputType>;
    private identifierFieldMap: Map<string, string>;
    constructor(private cache: KeyValueCache) {
        this.inputTypeMap = new Map(SCALARS);
        this.outputTypeMap = new Map(SCALARS);
        this.identifierFieldMap = new Map();
    }
    private prepareRequest({
        resolverData,
        serviceBaseUrlFactory,
        headersFactory,
        entityName,
        actionName,
        method = 'GET',
    }: {
        resolverData: ResolverData;
        serviceBaseUrlFactory: ResolverDataFactory<string>;
        headersFactory: ResolverDataFactory<Headers>;
        entityName: string;
        actionName?: string;
        method?: string;
    }) {
        resolverData.context._serviceBaseUrl = resolverData.context._serviceBaseUrl || serviceBaseUrlFactory(resolverData);
        resolverData.context._headers = resolverData.context._headers || headersFactory(resolverData)
        if (!resolverData.context._headers.has('Accept')) {
            resolverData.context._headers.set('Accept', 'application/json; odata.metadata=full');
        }
        if (!resolverData.context._headers.has('Content-Type')) {
            resolverData.context._headers.set('Content-Type', 'application/json; odata.metadata=full');
        }
        const identifierFieldName = this.identifierFieldMap.get(entityName) || 'id';
        const urlParts = [
            resolverData.context._serviceBaseUrl, 
            (identifierFieldName in resolverData.args ? `${entityName}(${resolverData.args[identifierFieldName!]})` : entityName), 
            actionName
        ]
        const entitySetUrl = urljoin(urlParts.filter(Boolean));
        const urlObj = new URL(entitySetUrl);
        if ('queryOptions' in resolverData.args) {
            const { queryOptions } = resolverData.args;
            for (const param in ODataQueryOptions.getFields()) {
                if (param in queryOptions) {
                    urlObj.searchParams.set('$' + param, queryOptions[param]);
                }
            }
        }
        const selectionFields = Object.keys(graphqlFields(resolverData.info)).filter(fieldName => !fieldName.startsWith('__'));
        urlObj.searchParams.set('$select', selectionFields.join(','));
        
        return new Request(decodeURIComponent(urlObj.toString()), {
            headers: resolverData.context._headers,
            method,
            body: method !== 'GET' ? JSON.stringify(resolverData.args): null,
        });
    }
    EnumType(enumElement: Element) {
        const values: GraphQLEnumValueConfigMap = {};
        enumElement.querySelectorAll('Member').forEach(memberElement => {
            const key = memberElement.getAttribute('Name')!;
            // This doesn't work.
            // const value = memberElement.getAttribute('Value')!;
            values[key] = {
                value: key,
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
    ObjectType(objectElement: Element, headersFactory: (data: any) => Headers) {
        const factory = () => {
            const typeName = objectElement.getAttribute('Name')!;
            const inputFields: GraphQLInputFieldConfigMap = {};
            const outputFields: GraphQLFieldConfigMap<any, any> = {};
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
                    outputFields[fieldName].args = {
                        queryOptions: {
                            type: ODataQueryOptions,
                        },
                    };
                    outputFields[fieldName].resolve = async (root, args, context, info) => {
                        const navigationUrl = root[fieldName + '@odata.navigationLink'];
                        const interpolationData = { root, args, context, info };
                        context._headers = root.headers || headersFactory(interpolationData)
                        if (!context._headers.has('Accept')) {
                            context._headers.set('Accept', 'application/json; odata.metadata=full');
                        }
                        if (!context._headers.has('Content-Type')) {
                            context._headers.set('Content-Type', 'application/json; odata.metadata=full');
                        }        
                        const urlObj = new URL(navigationUrl);
                        if ('queryOptions' in args) {
                            const { queryOptions } = args;
                            for (const param in ODataQueryOptions.getFields()) {
                                if (param in queryOptions) {
                                    urlObj.searchParams.set('$' + param, queryOptions[param]);
                                }
                            }
                        }
                        const selectionFields = Object.keys(graphqlFields(info)).filter(fieldName => !fieldName.startsWith('__'));
                        urlObj.searchParams.set('$select', selectionFields.join(','));
                        
                        const navigationRequest = new Request(decodeURIComponent(urlObj.toString()), {
                            headers: context._headers,
                        })
                        const response = await fetchache(navigationRequest, this.cache);
                        const responseJson = await response.json();
                        return responseJson.value;
                    }
                }
            }
            const schemaNamespace = objectElement.parentElement?.getAttribute('Namespace');
            const typeRef = `${schemaNamespace}.${typeName}`;
            objectElement.querySelectorAll('Property').forEach(field => fieldFactory(field));
            objectElement.querySelectorAll('NavigationProperty').forEach(field => fieldFactory(field));
            const identifierFieldName = objectElement.querySelector('PropertyRef')?.getAttribute('Name');
            if (identifierFieldName) {
                this.identifierFieldMap.set(typeName, identifierFieldName);
            }
            if (!broke) {
                if (objectElement.getAttribute('Abstract')) {
                    if (!this.inputTypeMap.has(typeRef)) {
                        this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                            name: typeName,
                            fields: inputFields,
                        }))
                    }
                    if (!this.outputTypeMap.has(typeRef)) {
                        this.outputTypeMap.set(typeRef, new GraphQLInterfaceType({
                            name: typeName,
                            fields: outputFields,
                            resolveType: root => this.outputTypeMap.get(root['@odata.type'].replace('#', '')) as GraphQLObjectType,
                        }))
                    }
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
                        const interfaceTypeName = interfaceOutputType.name;
                        if (this.identifierFieldMap.has(interfaceTypeName) && !this.identifierFieldMap.has(typeName)) {
                            const identifierFieldName = this.identifierFieldMap.get(interfaceTypeName!)!;
                            this.identifierFieldMap.set(typeName, identifierFieldName);
                        }
                        interfaces.push(interfaceOutputType);
                    }
                    if (!this.inputTypeMap.has(typeRef)) {
                        this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                            name: typeName,
                            fields: inputFields,
                        }))
                    }
                    if (!this.outputTypeMap.has(typeRef)) {
                        this.outputTypeMap.set(typeRef, new GraphQLObjectType({
                            name: typeName,
                            fields: outputFields,
                            interfaces,
                        }))
                    }
                }
                const holdDeps = this.dependenciesHold.get(typeRef);
                if (holdDeps) {
                    this.dependenciesHold.delete(typeRef);
                    holdDeps.forEach(depTypeRef => {
                        holdDeps.delete(depTypeRef);
                        const factory = this.holdFactory.get(depTypeRef);
                        this.holdFactory.delete(depTypeRef);
                        if (factory) {
                            factory();
                        }
                    });
                }
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
        document.querySelectorAll('ComplexType').forEach(objectElement => this.ObjectType(objectElement, headersFactory))
        document.querySelectorAll('EntityType').forEach(objectElement => this.ObjectType(objectElement, headersFactory));
        const queryFields: GraphQLFieldConfigMap<any, any> = {};
        document.querySelectorAll('EntityContainer').forEach(entityContainerElement => {
            entityContainerElement.querySelectorAll('EntitySet').forEach(entitySetElement => {
                const entitySetName = entitySetElement.getAttribute('Name')!;
                const entitySetTypeName = entitySetElement.getAttribute('EntityType')!;
                queryFields[camelCase(entitySetName)] = {
                    type: new GraphQLList(this.outputTypeMap.get(entitySetTypeName!)!),
                    args: {
                        ...serviceArgs,
                        queryOptions: {
                            type: ODataQueryOptions,
                        },
                    },
                    resolve: async (root, args, context, info) => {
                        const entitySetRequest = this.prepareRequest({
                            resolverData: { root, args, context, info },
                            serviceBaseUrlFactory,
                            headersFactory,
                            entityName: entitySetName,
                        })
                        const response = await fetchache(entitySetRequest, this.cache);
                        const responseJson = await response.json();
                        return responseJson.value;
                    },
                };
                const identifierFieldName = this.identifierFieldMap.get(entitySetName!);
                queryFields[camelCase(entitySetName + '_ByID')] = {
                    type: this.outputTypeMap.get(entitySetTypeName!)!,
                    args: {
                        ...serviceArgs,
                        ...(identifierFieldName ? {
                            [identifierFieldName]: {
                                type: new GraphQLNonNull(GraphQLID),
                            }
                        } : {})
                    },
                    resolve: async (root, args, context, info) => {
                        const entitySetRequest = this.prepareRequest({
                            resolverData: { root, args, context, info },
                            serviceBaseUrlFactory,
                            headersFactory,
                            entityName: entitySetName,
                        })
                        const response = await fetchache(entitySetRequest, this.cache);
                        const responseJson = await response.json();
                        return responseJson;
                    },
                };
            })

        });

        const mutationFields: GraphQLFieldConfigMap<any, any> = {};
        const mutationFactory = (actionElement: Element) => {
            const actionName = actionElement.getAttribute('Name')!;
            let actionFieldName = actionName;
            let returnType: GraphQLOutputType = GraphQLBoolean;
            let entityName: string;
            const args: GraphQLFieldConfigArgumentMap = {};
            const bound = actionElement.getAttribute('IsBound') === 'true';
            const bindingParamName = actionElement.getAttribute('EntitySetPath') || 'bindingParameter';
            actionElement.querySelectorAll('Parameter').forEach(paramElement => {
                const paramName = paramElement.getAttribute('Name')!;
                let paramTypeName = paramElement.getAttribute('Type')!;
                if (bound && paramName === bindingParamName) {
                    entityName = paramElement.getAttribute('Type')!;
                    let isList = false;
                    if (entityName.startsWith('Collection(')) {
                        isList = true;
                        entityName = entityName
                            .replace('Collection(', '')
                            .replace(')', '');
                    }
                    returnType = this.outputTypeMap.get(entityName) as any;
                    if ('name' in returnType) {
                        entityName = returnType.name;
                        actionFieldName += entityName;
                    }
                    if (isList) {
                        returnType = new GraphQLList(returnType);
                    }
                } else {
                    let isList = false;
                    if (paramTypeName.startsWith('Collection(')) {
                        isList = true;
                        paramTypeName = paramTypeName
                            .replace('Collection(', '')
                            .replace(')', '');
                    }
                    let paramType = this.inputTypeMap.get(paramTypeName)!;
                    if (isList) {
                        paramType = new GraphQLList(paramType);
                    }
                    if (paramElement.getAttribute('Nullable') === 'false') {
                        paramType = new GraphQLNonNull(paramType);
                    }
                    args[paramName] = {
                        type: paramType,
                    };
                }
            });
            const returnTypeElement = actionElement.querySelector('ReturnType');
            if (returnTypeElement) {
                const returnTypeAttr = returnTypeElement.getAttribute('Type');
                if (returnTypeAttr) {
                    entityName = returnTypeAttr!;
                    let isList = false;
                    if (entityName.startsWith('Collection(')) {
                        isList = true;
                        entityName = entityName
                            .replace('Collection(', '')
                            .replace(')', '');
                    }
                    returnType = this.outputTypeMap.get(entityName) as any;
                    if ('name' in returnType) {
                        entityName = returnType.name;
                        actionFieldName += entityName;
                    }
                    if (isList) {
                        returnType = new GraphQLList(returnType);
                    }
                }
            }
            if (bound) {
                const identifierFieldName = this.identifierFieldMap.get(entityName!) || 'id';
                args[identifierFieldName] = {
                    type: GraphQLID,
                };
            }
            mutationFields[actionFieldName] = {
                type: returnType,
                args: {
                    ...serviceArgs,
                    ...args,
                    queryOptions: {
                        type: ODataQueryOptions,
                    },
                },
                resolve: async (root, args, context, info) => {
                    const entitySetRequest = this.prepareRequest({
                        resolverData: { root, args, context, info },
                        serviceBaseUrlFactory,
                        headersFactory,
                        entityName,
                        actionName,
                        method: 'POST',
                    });
                    const response = await fetchache(entitySetRequest, this.cache);
                    const responseJson = await response.json();
                    return responseJson.value;
                }
            }
        };

        document.querySelectorAll('Action').forEach(actionElement => mutationFactory(actionElement));
        document.querySelectorAll('Function').forEach(functionElement => mutationFactory(functionElement));

        return {
            queryFields,
            mutationFields,
            contextVariables,
        };

    }
}