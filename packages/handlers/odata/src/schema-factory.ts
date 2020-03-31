import { GraphQLOutputType, GraphQLInputType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLScalarType, GraphQLEnumType, GraphQLEnumValueConfigMap, Kind, ObjectTypeDefinitionNode, GraphQLFieldConfigMap, GraphQLObjectType, GraphQLList, GraphQLInterfaceType, GraphQLNonNull, GraphQLInputObjectType, GraphQLInputFieldConfigMap, GraphQLID, GraphQLFieldConfigArgumentMap, GraphQLNamedType, GraphQLUnionType, GraphQLResolveInfo, GraphQLType, GraphQLInputField, GraphQLField, GraphQLFieldResolver, GraphQLSchemaConfig, GraphQLSchema } from "graphql";
import { BigIntResolver as GraphQLBigInt, GUIDResolver as GraphQLGUID, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import { KeyValueCache, Headers, Request, fetchache } from "fetchache";
import urljoin from 'url-join';
import Interpolator from 'string-interpolation/src';
import { JSDOM } from 'jsdom';
import graphqlFields from 'graphql-fields';
import { writeFileSync } from "fs";

// TODO: Add more scalars to graphql-scalars, then here.
const SCALARS: [string, GraphQLScalarType][] = [
    ['Edm.Binary', GraphQLString],
    ['Edm.Stream', GraphQLString],
    ['Edm.String', GraphQLString],
    ['Edm.Int16', GraphQLInt],
    ['Edm.Byte', GraphQLInt],
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
    ['Edm.Decimal', GraphQLFloat],
    ['Edm.SByte', GraphQLInt],
    ['Edm.GeographyPoint', GraphQLString],
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

function returnExtendedError(anyError: any) {
    const actualError = new Error(anyError.message || anyError);
    (actualError as any).extensions = anyError;
    return actualError;
}

interface UnresolvedDependency {
    typeRef: string;
    fieldName: string;
    fieldTypeRef: string;
    nonNullable: boolean;
    isList: boolean;
    navigationProperty: boolean;
}

export class ODataGraphQLSchemaFactory {
    private inputTypeMap: Map<string, GraphQLInputType>;
    private outputTypeMap: Map<string, GraphQLOutputType>;
    private identifierFieldMap: Map<string, string>;
    private schemaAliasMap: Map<string, string>;
    private unresolvedDependencies: UnresolvedDependency[] = [];
    private queryFields: GraphQLFieldConfigMap<any, any> = {};
    private mutationFields: GraphQLFieldConfigMap<any, any> = {};
    private contextVariables: string[] = [];
    constructor(private cache: KeyValueCache) {
        this.inputTypeMap = new Map(SCALARS);
        this.outputTypeMap = new Map(SCALARS);
        this.identifierFieldMap = new Map();
        this.schemaAliasMap = new Map();
    }
    private getNavigationPropertyResolver(): GraphQLFieldResolver<any, any> {
        return async (root, args, context, info) => {
            const navigationUrl = root[info.fieldName + '@odata.navigationLink'];
            context._headers = context._headers;
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
            if (responseJson.error) {
                throw returnExtendedError(responseJson.error);
            }
            return responseJson.value;
        }
    }
    private resolveSchemaAlias(typeRef: string) {
        typeRef = typeRef.replace('#', '');
        for (const [alias, namespace] of this.schemaAliasMap) {
            if (typeRef.startsWith(alias)) {
                return typeRef.replace(alias, namespace);
            }
        }
        return typeRef;
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
            body: method !== 'GET' ? JSON.stringify(resolverData.args) : null,
        });
    }
    private processEnumElement(enumElement: Element) {
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
        const schemaElement = enumElement.closest('Schema')!;
        const schemaNamespace = schemaElement.getAttribute('Namespace')!;
        this.inputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
        this.outputTypeMap.set(`${schemaNamespace}.${enumName}`, graphQLEnumType);
    }
    private processTypeElement(objectElement: Element) {
        const typeName = objectElement.getAttribute('Name')!;
        const inputFields: GraphQLInputFieldConfigMap = {};
        const outputFields: GraphQLFieldConfigMap<any, any> = {};
        const schemaElement = objectElement.closest('Schema')!;
        const schemaNamespace = schemaElement.getAttribute('Namespace');
        const typeRef = `${schemaNamespace}.${typeName}`;
        const fieldFactory = (child: Element) => {
            const tag = child.tagName.toLowerCase();
            const fieldName = child.getAttribute('Name')!;
            let fieldTypeName = child.getAttribute('Type')!;
            let isList = false;
            let nonNullable = child.getAttribute('Nullable') === 'false';
            if (fieldTypeName.startsWith('Collection(')) {
                isList = true;
                fieldTypeName = fieldTypeName
                    .replace('Collection(', '')
                    .replace(')', '');
            }
            fieldTypeName = this.resolveSchemaAlias(fieldTypeName);
            let inputFieldType = this.inputTypeMap.get(fieldTypeName);
            let outputFieldType = this.outputTypeMap.get(fieldTypeName);
            if (!outputFieldType || !inputFieldType) {
                this.unresolvedDependencies.push({
                    typeRef,
                    fieldName,
                    fieldTypeRef: fieldTypeName,
                    isList,
                    nonNullable,
                    navigationProperty: tag === 'navigationproperty',
                });
                return;
            }
            if (isList) {
                outputFieldType = new GraphQLList(outputFieldType);
            }
            if (nonNullable) {
                outputFieldType = new GraphQLNonNull(outputFieldType);
            }
            inputFields[fieldName] = {
                type: inputFieldType,
            };
            outputFields[fieldName] = {
                type: outputFieldType,
            };
        }
        objectElement.querySelectorAll('Property').forEach(field => fieldFactory(field));
        objectElement.querySelectorAll('NavigationProperty').forEach(field => fieldFactory(field));
        const identifierFieldName = objectElement.querySelector('PropertyRef')?.getAttribute('Name');
        if (identifierFieldName) {
            this.identifierFieldMap.set(typeName, identifierFieldName);
        }
        if (objectElement.getAttribute('Abstract')) {
            if (!this.inputTypeMap.has(typeRef)) {
                this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                    name: typeName + 'Input',
                    fields: inputFields,
                }))
            }
            if (!this.outputTypeMap.has(typeRef)) {
                this.outputTypeMap.set(typeRef, new GraphQLInterfaceType({
                    name: typeName,
                    fields: outputFields,
                    resolveType: root => this.outputTypeMap.get(this.resolveSchemaAlias(root['@odata.type'])) as GraphQLObjectType,
                }))
            }
        } else {
            const interfaces: GraphQLInterfaceType[] = [];
            let interfaceName = objectElement.getAttribute('BaseType');
            if (interfaceName) {
                interfaceName = this.resolveSchemaAlias(interfaceName);
                const interfaceInputType = this.inputTypeMap.get(interfaceName) as GraphQLInputObjectType;
                const interfaceOutputType = this.outputTypeMap.get(interfaceName) as GraphQLInterfaceType;
                if (!interfaceInputType || !interfaceOutputType) {
                    this.unresolvedDependencies.push({
                        typeRef,
                        fieldName: '__typename',
                        fieldTypeRef: objectElement.getAttribute('BaseType')!,
                        isList: false,
                        nonNullable: false,
                        navigationProperty: false,
                    });
                } else {
                    Object.assign(inputFields, interfaceInputType.toConfig().fields);
                    Object.assign(outputFields, interfaceOutputType.toConfig().fields);
                    const interfaceTypeName = interfaceOutputType.name;
                    if (this.identifierFieldMap.has(interfaceTypeName) && !this.identifierFieldMap.has(typeName)) {
                        const identifierFieldName = this.identifierFieldMap.get(interfaceTypeName!)!;
                        this.identifierFieldMap.set(typeName, identifierFieldName);
                    }
                    if (interfaceOutputType instanceof GraphQLInterfaceType) {
                        interfaces.push(interfaceOutputType);
                    }
                }
            }
            if (!this.inputTypeMap.has(typeRef)) {
                this.inputTypeMap.set(typeRef, new GraphQLInputObjectType({
                    name: typeName + 'Input',
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
    }
    async processServiceConfig(serviceConfig: ServiceConfig) {
        const metadataUrl = urljoin(serviceConfig.baseUrl, serviceConfig.servicePath, '$metadata');
        const metadataRequest = new Request(metadataUrl, {
            headers: serviceConfig.metadataHeaders,
        });

        const interpolator = new Interpolator();

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
                this.contextVariables.push(varName);
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
        writeFileSync(process.cwd() + '/dump.xml', text);
        const { window: { document } } = new JSDOM(text);

        document.querySelectorAll('Schema').forEach(schemaElement => {
            const namespace = schemaElement.getAttribute('Namespace')!;
            const alias = schemaElement.getAttribute('Alias');
            if (alias) {
                this.schemaAliasMap.set(alias, namespace);
            }
        });

        document.querySelectorAll('EnumType').forEach(enumElement => this.processEnumElement(enumElement));
        document.querySelectorAll('ComplexType').forEach(typeElement => this.processTypeElement(typeElement));
        document.querySelectorAll('EntityType').forEach(typeElement => this.processTypeElement(typeElement));

        while(this.unresolvedDependencies.length > 0) {
            const { typeRef, fieldName, fieldTypeRef, isList, nonNullable, navigationProperty } = this.unresolvedDependencies.pop()!;
            const inputType = this.inputTypeMap.get(typeRef) as GraphQLInputObjectType;
            const inputTypeFieldMap = inputType.getFields();
            const outputType = this.outputTypeMap.get(typeRef) as GraphQLObjectType;
            const outputTypeFieldMap = outputType.getFields();
            let inputFieldType = this.inputTypeMap.get(fieldTypeRef)!;
            let outputFieldType = this.outputTypeMap.get(fieldTypeRef)! as any;
            if (fieldName === '__typename') {
                Object.assign(inputTypeFieldMap, (inputFieldType as GraphQLInputObjectType).getFields());
                Object.assign(outputTypeFieldMap, (outputFieldType as GraphQLObjectType).getFields());
                const interfaces = outputType.getInterfaces();
                if (!interfaces.includes(outputFieldType)) {
                    interfaces.push(outputFieldType);
                }
                const interfaceTypeName = outputFieldType.name;
                if (this.identifierFieldMap.has(interfaceTypeName) && !this.identifierFieldMap.has(outputType.name)) {
                    const identifierFieldName = this.identifierFieldMap.get(interfaceTypeName!)!;
                    this.identifierFieldMap.set(outputType.name, identifierFieldName);
                }
            } else {
                if (isList) {
                    inputFieldType = new GraphQLList(inputFieldType);
                    outputFieldType = new GraphQLList(outputFieldType);
                }
                if (nonNullable) {
                    inputFieldType = new GraphQLNonNull(inputFieldType);
                    outputFieldType = new GraphQLNonNull(outputFieldType);
                }
                const inputField: GraphQLInputField = {
                    name: fieldName,
                    type: inputFieldType,
                    extensions: [],
                };
                Object.assign(inputTypeFieldMap, {
                    [fieldName]: inputField,
                });
                const outputField: GraphQLField<any, any> = {
                    name: fieldName,
                    type: outputFieldType,
                    description: '',
                    args: [],
                    extensions: [],
                };
                if (navigationProperty) {
                    outputField.args.push({
                        name: 'queryOptions',
                        type: ODataQueryOptions,
                        description: '',
                        extensions: [],
                        defaultValue: undefined,
                        astNode: undefined,
                    })
                    outputField.resolve = this.getNavigationPropertyResolver();
                }
                Object.assign(outputTypeFieldMap, {
                    [fieldName]: outputField,
                });
            }
            if (outputType instanceof GraphQLInterfaceType) {
                for (const otherType of this.outputTypeMap.values()) {
                    if (otherType instanceof GraphQLObjectType
                        && otherType.getInterfaces().includes(outputType)) {
                            Object.assign(otherType.getFields(), outputType.getFields());
                    }
                }
            }
        }

        document.querySelectorAll('EntityContainer').forEach(entityContainerElement => {
            entityContainerElement.querySelectorAll('EntitySet').forEach(entitySetElement => {
                const entitySetName = entitySetElement.getAttribute('Name')!;
                let entitySetTypeName = entitySetElement.getAttribute('EntityType')!;
                entitySetTypeName = this.resolveSchemaAlias(entitySetTypeName);
                const entitySetType = this.outputTypeMap.get(entitySetTypeName!)!;
                this.queryFields[entitySetName] = {
                    type: new GraphQLList(entitySetType),
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
                        if (responseJson.error) {
                            throw returnExtendedError(responseJson.error);
                        }
                        return responseJson.value;
                    },
                };
                const identifierFieldName = this.identifierFieldMap.get('name' in entitySetType! ? (entitySetType as any).name : entitySetName);
                this.queryFields[entitySetName + 'By' + identifierFieldName] = {
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
                        if (responseJson.error) {
                            throw returnExtendedError(responseJson.error);
                        }
                        return responseJson;
                    },
                };
            })
        });

        const actionFactory = (actionElement: Element, fieldName?: string, entityName?: string) => {
            const actionName = actionElement.getAttribute('Name')!;
            let actionFieldName = fieldName || actionName;
            let returnType: GraphQLOutputType = GraphQLBoolean;
            const args: GraphQLFieldConfigArgumentMap = {};
            const bound = actionElement.getAttribute('IsBound') === 'true';
            const bindingParamName = actionElement.getAttribute('EntitySetPath')! || 'bindingParameter';
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
                    entityName = this.resolveSchemaAlias(entityName);
                    const entityType = this.outputTypeMap.get(entityName) as any;
                    if ('name' in entityType) {
                        entityName = entityType.name;
                        actionFieldName += entityName;
                    }
                } else {
                    let isList = false;
                    if (paramTypeName.startsWith('Collection(')) {
                        isList = true;
                        paramTypeName = paramTypeName
                            .replace('Collection(', '')
                            .replace(')', '');
                    }
                    paramTypeName = this.resolveSchemaAlias(paramTypeName);
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
                let returnTypeAttr = returnTypeElement.getAttribute('Type');
                if (returnTypeAttr) {
                    let isList = false;
                    if (returnTypeAttr!.startsWith('Collection(')) {
                        isList = true;
                        returnTypeAttr = returnTypeAttr
                            .replace('Collection(', '')
                            .replace(')', '');
                    }
                    returnTypeAttr = this.resolveSchemaAlias(returnTypeAttr);
                    returnType = this.outputTypeMap.get(returnTypeAttr) as any;
                    if (isList) {
                        returnType = new GraphQLList(returnType);
                    }
                }
            }
            if (bound) {
                const identifierFieldName = this.identifierFieldMap.get(entityName!);
                if (identifierFieldName) {
                    args[identifierFieldName] = {
                        type: GraphQLID,
                    };
                }
            }
            this.mutationFields[actionFieldName] = {
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
                        entityName: entityName!,
                        actionName,
                        method: 'POST',
                    });
                    const response = await fetchache(entitySetRequest, this.cache);
                    const responseJson = await response.json();
                    if (responseJson.error) {
                        throw returnExtendedError(responseJson.error);
                    }
                    if (returnType instanceof GraphQLList) {
                        return responseJson.value;
                    }
                    return responseJson;
                }
            }
        };

        const actionImportFactory = (actionImportElement: Element) => {
            const fieldName = actionImportElement.getAttribute('Name')!;
            const actionType = actionImportElement.tagName.toLowerCase() === 'functionimport' ? 'Function' : 'Action';
            const actionRef = actionImportElement.getAttribute(actionType)!;
            const actionRefArr = actionRef.split('.');
            const actionName = actionRefArr[actionRefArr.length - 1];
            const schemaPathArr = actionRefArr.slice(0, actionRefArr.length - 1);
            const schemaRef = schemaPathArr.join('.');
            const actionElement = document.querySelector(`Schema[Namespace='${schemaRef}'] ${actionType}[Name='${actionName}']`)!;
            const entitySetName = actionImportElement.getAttribute('EntitySet')!;
            if (entitySetName) {
                const entitySetElement = document.querySelector(`EntitySet[Name='${entitySetName}']`)!;
                let entityName = entitySetElement.getAttribute('EntityType')!;
                if (entityName.startsWith('Collection(')) {
                    entityName = entityName
                        .replace('Collection(', '')
                        .replace(')', '');
                }
                entityName = this.resolveSchemaAlias(entityName);
                const entityType = this.outputTypeMap.get(entityName) as any;
                if ('name' in entityType) {
                    entityName = entityType.name;
                }
                actionFactory(actionElement, fieldName, entityName);
            }
            actionFactory(actionElement, fieldName);
        }

        document.querySelectorAll('Action[EntitySetPath]').forEach(actionElement => actionFactory(actionElement));
        document.querySelectorAll('Function[EntitySetPath]').forEach(functionElement => actionFactory(functionElement));

        document.querySelectorAll(`Action:not([EntitySetPath]) Parameter[Name='bindingParameter']`).forEach(paramElement => actionFactory(paramElement.parentElement!));
        document.querySelectorAll(`Function:not([EntitySetPath]) Parameter[Name='bindingParameter']`).forEach(paramElement => actionFactory(paramElement.parentElement!));

        document.querySelectorAll('ActionImport').forEach(actionImportElement => actionImportFactory(actionImportElement));
        document.querySelectorAll('FunctionImport').forEach(functionImportElement => actionImportFactory(functionImportElement));
        document.querySelectorAll('Singleton').forEach(singletonElement => {
            const fieldName = singletonElement.getAttribute('Name')!;
            let typeName = singletonElement.getAttribute('Type')!;
            let isList = false;
            if (typeName.startsWith('Collection(')) {
                isList = true;
                typeName = typeName
                    .replace('Collection(', '')
                    .replace(')', '');
            }
            typeName = this.resolveSchemaAlias(typeName);
            let returnType = this.outputTypeMap.get(typeName)! as any;
            if ('name' in returnType) {
                typeName = returnType.name;
            }
            if (isList) {
                returnType = new GraphQLList(returnType);
            }
            this.queryFields[fieldName] = {
                type: returnType,
                args: {
                    ...serviceArgs,
                },
                resolve: async (root, args, context, info) => {
                    const entitySetRequest = this.prepareRequest({
                        resolverData: { root, args, context, info },
                        serviceBaseUrlFactory,
                        headersFactory,
                        entityName: fieldName,
                    });
                    const response = await fetchache(entitySetRequest, this.cache);
                    const responseJson = await response.json();
                    if (responseJson.error) {
                        throw returnExtendedError(responseJson.error);
                    }
                    if (isList) {
                        return responseJson.value;
                    }
                    return responseJson;
                }
            }
        });

    }

    getContextVariables() {
        return this.contextVariables;
    }
    buildSchema() {
        const schemaConfig: GraphQLSchemaConfig = {
            query: new GraphQLObjectType({
                name: 'Query',
                fields: this.queryFields,
            }),
        };
        if (Object.keys(this.mutationFields).length > 0) {
            schemaConfig.mutation = new GraphQLObjectType({
                name: 'Mutation',
                fields: this.mutationFields,
            });
        }
        return new GraphQLSchema(schemaConfig);
    }
}