import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLOutputType,
  GraphQLField,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
  GraphQLFieldConfigArgumentMap,
  GraphQLResolveInfo,
  GraphQLEnumType,
  GraphQLString,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLInterfaceTypeConfig,
  GraphQLInputObjectTypeConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputField,
  GraphQLBoolean,
  GraphQLArgument,
  GraphQLSchemaConfig,
  GraphQLSchema,
  GraphQLFloat,
  GraphQLEnumValueConfigMap,
  isInterfaceType,
  isNonNullType,
  isListType,
  isObjectType,
  isInputObjectType,
  isScalarType,
  isEnumType,
  GraphQLTypeResolver,
} from 'graphql';
import urljoin from 'url-join';
import graphqlFields from 'graphql-fields';
import { KeyValueCache, Request, fetchache } from 'fetchache';
import { JSDOM } from 'jsdom';
import {
  BigIntResolver as GraphQLBigInt,
  GUIDResolver as GraphQLGUID,
  DateTimeResolver as GraphQLDateTime,
  JSONResolver as GraphQLJSON,
} from 'graphql-scalars';
import {
  getInterpolatedStringFactory,
  getInterpolatedHeadersFactory,
  parseInterpolationStrings,
} from '@graphql-mesh/utils';

const InlineCountEnum = new GraphQLEnumType({
  name: 'InlineCount',
  values: {
    allpages: {
      value: 'allpages',
      description:
        'The OData MUST include a count of the number of entities in the collection identified by the URI (after applying any $filter System Query Options present on the URI)',
    },
    none: {
      value: 'none',
      description:
        'The OData service MUST NOT include a count in the response. This is equivalence to a URI that does not include a $inlinecount query string parameter.',
    },
  },
});

const ODataQueryOptions = new GraphQLInputObjectType({
  name: 'QueryOptions',
  fields: {
    orderby: {
      type: GraphQLString,
      description:
        'A data service URI with a $orderby System Query Option specifies an expression for determining what values are used to order the collection of Entries identified by the Resource Path section of the URI. This query option is only supported when the resource path identifies a Collection of Entries.',
    },
    top: {
      type: GraphQLInt,
      description:
        'A data service URI with a $top System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. This subset is formed by selecting only the first N items of the set, where N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.',
    },
    skip: {
      type: GraphQLInt,
      description:
        'A data service URI with a $skip System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. That subset is defined by seeking N Entries into the Collection and selecting only the remaining Entries (starting with Entry N+1). N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.',
    },
    filter: {
      type: GraphQLString,
      description:
        'A URI with a $filter System Query Option identifies a subset of the Entries from the Collection of Entries identified by the Resource Path section of the URI. The subset is determined by selecting only the Entries that satisfy the predicate expression specified by the query option.',
    },
    inlinecount: {
      type: InlineCountEnum,
      description:
        'A URI with a $inlinecount System Query Option specifies that the response to the request includes a count of the number of Entries in the Collection of Entries identified by the Resource Path section of the URI. The count must be calculated after applying any $filter System Query Options present in the URI. The set of valid values for the $inlinecount query option are shown in the table below. If a value other than one shown in Table 4 is specified the URI is considered malformed.',
    },
  },
});

interface ResolverData {
  root: any;
  args: any;
  context: any;
  info: GraphQLResolveInfo;
}

type ResolverDataBasedFactory<T> = (data: ResolverData) => T;

interface UnresolvedDependency {
  typeName: string;
  fieldName: string;
  fieldTypeName: string;
  nonNullable: boolean;
  queryable: boolean;
}

interface ODataConfig {
  baseUrl: string;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
}

interface ServiceContext {
  serviceUrlFactory: ResolverDataBasedFactory<string>;
  headersFactory: ResolverDataBasedFactory<Headers>;
  serviceCommonArgs: GraphQLFieldConfigArgumentMap;
  schemaElement: Document | Element;
}

const EDM_SCALARS: [string, GraphQLScalarType][] = [
  ['Binary', GraphQLString],
  ['Stream', GraphQLString],
  ['String', GraphQLString],
  ['Int16', GraphQLInt],
  ['Byte', GraphQLInt],
  ['Int32', GraphQLInt],
  ['Int64', GraphQLBigInt],
  ['Double', GraphQLFloat],
  ['Boolean', GraphQLBoolean],
  ['Guid', GraphQLGUID],
  ['DateTimeOffset', GraphQLString],
  ['Date', GraphQLDateTime],
  ['TimeOfDay', GraphQLString],
  ['Single', GraphQLFloat],
  ['Duration', GraphQLString],
  ['Decimal', GraphQLFloat],
  ['SByte', GraphQLInt],
  ['GeographyPoint', GraphQLString],
];

export class ODataGraphQLSchemaFactory {
  private entityTypeNameGraphQLObjectTypeMap = new Map<string, GraphQLObjectType | GraphQLInterfaceType>();
  private entityTypeNameGraphQLInputObjectTypeMap = new Map<string, GraphQLInputObjectType>();
  private complexTypeNameGraphQLObjectTypeMap = new Map<string, GraphQLObjectType | GraphQLInterfaceType>();
  private complexTypeNameGraphQLInputObjectTypeMap = new Map<string, GraphQLInputObjectType>();
  private edmTypeNameGraphQLScalarTypeMap = new Map<string, GraphQLScalarType>(EDM_SCALARS);
  private enumTypeNameGraphQLEnumTypeMap = new Map<string, GraphQLEnumType>();
  private entityTypeNameIdentifierFieldNameMap = new Map<string, string>();
  private entitySetEntityTypeNameMap = new Map<string, string>();

  private boundOperationsFullNameMap = new Map<string, string>();

  private unresolvedDependencies: UnresolvedDependency[] = [];

  private queryFields: GraphQLFieldConfigMap<any, any> = {};
  private mutationFields: GraphQLFieldConfigMap<any, any> = {};
  private contextVariables: string[] = [];

  private nonAbstractBaseTypes = new Map<string, GraphQLObjectType>();

  constructor(private config: ODataConfig, private cache: KeyValueCache) {}

  private isEntityType(type: GraphQLType | string): boolean {
    if (typeof type === 'string') {
      const { typeName } = this.parseTypeRef(type);
      return this.entityTypeNameGraphQLObjectTypeMap.has(typeName);
    } else if (isObjectType(type)) {
      return [...this.entityTypeNameGraphQLObjectTypeMap.values()].includes(type);
    } else if (isInputObjectType(type)) {
      return [...this.entityTypeNameGraphQLInputObjectTypeMap.values()].includes(type);
    }
    return false;
  }

  private isComplexType(type: GraphQLType | string): boolean {
    if (typeof type === 'string') {
      const { typeName } = this.parseTypeRef(type);
      return this.complexTypeNameGraphQLObjectTypeMap.has(typeName);
    } else if (isObjectType(type)) {
      return [...this.complexTypeNameGraphQLObjectTypeMap.values()].includes(type);
    } else if (isInputObjectType(type)) {
      return [...this.complexTypeNameGraphQLInputObjectTypeMap.values()].includes(type);
    }
    return false;
  }

  private isEdmType(type: GraphQLType | string): boolean {
    if (typeof type === 'string') {
      const { typeName } = this.parseTypeRef(type);
      return this.edmTypeNameGraphQLScalarTypeMap.has(typeName);
    } else if (isScalarType(type)) {
      return [...this.edmTypeNameGraphQLScalarTypeMap.values()].includes(type);
    }
    return false;
  }

  private isEnumType(type: GraphQLType | string): boolean {
    if (typeof type === 'string') {
      const { typeName } = this.parseTypeRef(type);
      return this.enumTypeNameGraphQLEnumTypeMap.has(typeName);
    } else if (isEnumType(type)) {
      return [...this.enumTypeNameGraphQLEnumTypeMap.values()].includes(type);
    }
    return false;
  }

  private parseTypeRef(typeRef: string): { isList: boolean; typeName: string } {
    let isList = false;
    typeRef = typeRef.replace('#', '');
    if (typeRef.startsWith('Collection(') && typeRef.endsWith(')')) {
      typeRef = typeRef.replace('Collection(', '').replace(')', '');
      isList = true;
    }
    const typePath = typeRef.split('.');
    const typeName = typePath[typePath.length - 1];
    return { isList, typeName };
  }

  private getOutputTypeByRef(typeRefOrName: string, actualType?: boolean) {
    const { isList, typeName } = this.parseTypeRef(typeRefOrName);
    let outputType: GraphQLOutputType | undefined;
    if (this.isEdmType(typeName)) {
      outputType = this.edmTypeNameGraphQLScalarTypeMap.get(typeName)!;
    } else if (this.isEnumType(typeName)) {
      outputType = this.enumTypeNameGraphQLEnumTypeMap.get(typeName)!;
    } else if (this.isComplexType(typeName)) {
      outputType = this.complexTypeNameGraphQLObjectTypeMap.get(typeName)!;
    } else if (this.isEntityType(typeName)) {
      outputType = this.entityTypeNameGraphQLObjectTypeMap.get(typeName)!;
    }
    if (actualType) {
      return outputType;
    }
    if (outputType) {
      if (isList) {
        outputType = new GraphQLList(outputType);
      }
      return outputType;
    }
    return null;
  }

  private getInputTypeByRef(typeRef: string) {
    const { isList, typeName } = this.parseTypeRef(typeRef);
    let inputType: GraphQLInputType | undefined;
    if (this.isEdmType(typeName)) {
      inputType = this.edmTypeNameGraphQLScalarTypeMap.get(typeName);
    } else if (this.isEnumType(typeName)) {
      inputType = this.enumTypeNameGraphQLEnumTypeMap.get(typeName)!;
    } else if (this.isComplexType(typeName)) {
      inputType = this.complexTypeNameGraphQLInputObjectTypeMap.get(typeName);
    } else if (this.isEntityType(typeName)) {
      inputType = this.entityTypeNameGraphQLInputObjectTypeMap.get(typeName)!;
    }
    if (inputType) {
      if (isList) {
        inputType = new GraphQLList(inputType);
      }
      return inputType;
    }
    return null;
  }

  private getEntityTypeIdentifier(entityTypeOrName: GraphQLObjectType | string): GraphQLField<any, any> | undefined {
    let entityType: GraphQLObjectType | GraphQLInterfaceType | undefined;
    if (typeof entityTypeOrName === 'string') {
      entityType = this.entityTypeNameGraphQLObjectTypeMap.get(entityTypeOrName);
      if (!entityType) {
        throw new Error(`Entity type ${entityTypeOrName} not found!`);
      }
    } else {
      entityType = entityTypeOrName;
    }
    const identifierFieldName = this.entityTypeNameIdentifierFieldNameMap.get(entityType.name);
    if (!identifierFieldName) {
      return undefined;
    }
    const fieldMap = entityType.getFields();
    const identifierField = fieldMap[identifierFieldName];
    if (!identifierField) {
      return undefined;
    }
    return identifierField;
  }

  private isAbstractType(type: Element): boolean {
    return type.getAttribute('Abstract') === 'true';
  }

  private isNonNullableType(type: Element): boolean {
    return type.getAttribute('Nullable') === 'false';
  }

  private getActualGraphQLType(type: GraphQLType) {
    if ('ofType' in type) {
      return type.ofType;
    }
    return type;
  }

  private getResolver({
    serviceUrlFactory,
    headersFactory,
    entitySetName,
    method,
    ignoreIdentifierArg,
    count,
  }: {
    serviceUrlFactory: ResolverDataBasedFactory<string>;
    headersFactory: ResolverDataBasedFactory<Headers>;
    entitySetName?: string;
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
    ignoreIdentifierArg?: boolean;
    count?: boolean;
  }) {
    const resolver: GraphQLFieldResolver<any, any> = async (root, args, context = {}, info) => {
      if (info.operation.operation === 'query' && method !== 'GET') {
        throw new Error(`Non-GET operations are not allowed in query operations`);
      }
      const resolverData: ResolverData = { root, args, context, info };
      if (root && info.fieldName in root) {
        const returnVal = root[info.fieldName];
        return returnVal;
      }
      const _serviceUrl =
        (root && root['@odata.id']) || (context._serviceUrl = context?._serviceUrl || serviceUrlFactory(resolverData));
      const _headers: Headers = (context._headers = context?._headers || headersFactory(resolverData));
      let baseOperationUrl: string | undefined;
      const requestInit: RequestInit = {};
      // If it is navigation property
      const navigationLinkField = info.fieldName + '@odata.navigationLink';
      if (root && navigationLinkField in root) {
        baseOperationUrl = root[navigationLinkField];
      } else {
        // If it is bound function
        for (const rootFieldName in root) {
          const { typeName } = this.parseTypeRef(rootFieldName);
          if (typeName === info.fieldName) {
            const rootField = root[rootFieldName];
            if ('target' in rootField) {
              baseOperationUrl = rootField.target;
              if (method === 'GET' && Object.keys(args).length > 0) {
                baseOperationUrl += `(${Object.entries(args)
                  .filter(argEntry => argEntry[0] !== 'queryOptions')
                  .map(argEntry => argEntry.join(' = '))
                  .join(', ')})`;
              } else {
                requestInit.body = JSON.stringify(args);
              }
            }
          }
        }
        // Neither
        if (!baseOperationUrl) {
          let entitySetPart = '';
          let identifierArgName: string | undefined;
          if (entitySetName) {
            entitySetPart = entitySetName;
            if (count) {
              entitySetPart = entitySetName + '/$count';
            } else if (!ignoreIdentifierArg && !(info.returnType instanceof GraphQLList)) {
              const entityTypeName = this.entitySetEntityTypeNameMap.get(entitySetName);
              if (!entityTypeName) {
                throw new Error(`Entity Type of ${entitySetName} not found!`);
              }
              const identifierField = this.getEntityTypeIdentifier(entityTypeName);
              if (!identifierField) {
                throw new Error(`Identifier for ${entityTypeName} not found!`);
              }
              identifierArgName = identifierField.name;
              if (identifierField.type.toString().includes('String')) {
                entitySetPart = `${entitySetName}('${args[identifierArgName]}')`;
              } else {
                entitySetPart = `${entitySetName}(${args[identifierArgName]})`;
              }
            }
            if (method !== 'GET') {
              requestInit.body = JSON.stringify(args.input);
            }
          } else {
            const operationName = info.fieldName;
            entitySetPart = operationName;
            if (this.boundOperationsFullNameMap.has(operationName)) {
              entitySetPart = this.boundOperationsFullNameMap.get(operationName)!;
            }
            const argEntries = Object.entries(args).filter(argEntry => argEntry[0] !== 'queryOptions');
            if (method === 'GET' && argEntries.length > 0) {
              entitySetPart = `${entitySetPart}(${argEntries.map(argEntry => argEntry.join(' = ')).join(', ')})`;
            } else if (method !== 'GET') {
              requestInit.body = JSON.stringify(args);
            }
          }
          baseOperationUrl = urljoin(_serviceUrl, entitySetPart);
        }
      }
      if (!baseOperationUrl || !_headers) {
        throw new Error(`Invalid root object is passed to field resolver!`);
      }
      if (!_headers.has('Accept')) {
        _headers.set('Accept', 'application/json; odata.metadata=full');
      }
      if (!_headers.has('Content-Type')) {
        _headers.set('Content-Type', 'application/json; odata.metadata=full');
      }

      if (context._disableMetadata) {
        _headers.set('Accept', 'application/json');
        _headers.set('Content-Type', 'application/json');
      }

      requestInit.method = method;
      requestInit.headers = _headers;

      const urlObj = new URL(baseOperationUrl);
      if (method === 'GET') {
        if ('queryOptions' in args) {
          const { queryOptions } = args;
          for (const param in ODataQueryOptions.getFields()) {
            if (param in queryOptions) {
              urlObj.searchParams.set('$' + param, queryOptions[param]);
            }
          }
        }
        const selectionFields = Object.keys(graphqlFields(resolverData.info)).filter(fieldName => {
          if (fieldName.startsWith('__')) {
            return false;
          }
          if (this.boundOperationsFullNameMap.has(fieldName)) {
            return false;
          }
          return true;
        });
        const actualReturnType = this.getActualGraphQLType(info.returnType);
        const identifierField = this.getEntityTypeIdentifier(actualReturnType);
        const identifierFieldName = identifierField?.name;
        if (identifierFieldName && !selectionFields.includes(identifierFieldName)) {
          selectionFields.push(identifierFieldName);
        }
        if (!count) {
          // $select doesn't work with inherited types' fields. So if there is an inline fragment for
          // implemented types, we cannot use $select
          const actualReturnTypeFieldMap = actualReturnType.getFields();
          const ignoreSelect =
            isInterfaceType(actualReturnType) &&
            selectionFields.find(fieldName => !(fieldName in actualReturnTypeFieldMap));
          if (!ignoreSelect && selectionFields.length) {
            urlObj.searchParams.set('$select', selectionFields.join(','));
          }
        }
      }
      const finalUrl = decodeURIComponent(urlObj.toString()).split('+').join(' ');
      const entitySetRequest = new Request(finalUrl, requestInit);
      const response = await fetchache(entitySetRequest, this.cache);
      if (count) {
        return response.text();
      }
      const responseJson = await response.json();
      let returnVal: any;
      if (responseJson.error) {
        const actualError = new Error(responseJson.error.message || responseJson.error) as any;
        actualError.extensions = responseJson.error;
        // Workaround for metadata bug in navigation fields
        if (
          navigationLinkField in root &&
          !context._disableMetadata &&
          actualError.message.includes('An error has occurred.')
        ) {
          context._disableMetadata = true;
          return resolver(root, args, context, info);
        }
        throw actualError;
      }
      const actualReturnType = this.getActualGraphQLType(info.returnType);
      const identifierField = this.getEntityTypeIdentifier(actualReturnType);
      const identifierFieldName = identifierField?.name;
      if (info.returnType instanceof GraphQLList) {
        returnVal = responseJson.value;
        if (identifierFieldName) {
          returnVal = returnVal.map((element: any) => {
            if (typeof element === 'object' && !('@odata.id' in element)) {
              const identifier = element[identifierFieldName];
              element['@odata.id'] = baseOperationUrl + '(' + identifier + ')';
            }
            return element;
          });
        }
      } else {
        returnVal = responseJson;
      }
      if (identifierFieldName && typeof returnVal === 'object' && !('@odata.id' in returnVal)) {
        const identifier = returnVal[identifierFieldName];
        returnVal['@odata.id'] = baseOperationUrl + '(' + identifier + ')';
      }
      return returnVal;
    };
    return resolver;
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
    });
    const enumName = enumElement.getAttribute('Name')!;
    const graphQLEnumType = new GraphQLEnumType({
      name: enumName,
      values,
    });
    this.enumTypeNameGraphQLEnumTypeMap.set(enumName, graphQLEnumType);
  }

  private processTypeElement(typeElement: Element, serviceContext: ServiceContext) {
    const typeName = typeElement.getAttribute('Name');
    if (!typeName) {
      throw new Error(`There is a ${typeElement.tagName} element without a valid Name attribute`);
    }
    const propertyRefElement = typeElement.querySelector('PropertyRef');
    if (propertyRefElement) {
      const identifierFieldName = propertyRefElement.getAttribute('Name');
      if (identifierFieldName) {
        this.entityTypeNameIdentifierFieldNameMap.set(typeName, identifierFieldName);
      }
    }
    const inputFieldConfigMap: GraphQLInputFieldConfigMap = {};
    const outputFieldConfigMap: GraphQLFieldConfigMap<any, any> = {};
    const inputObjectTypeConfig: GraphQLInputObjectTypeConfig = {
      name: typeName + 'Input',
      fields: inputFieldConfigMap,
    };
    const objectTypeConfig: GraphQLObjectTypeConfig<any, any> & GraphQLInterfaceTypeConfig<any, any> = {
      name: typeName,
      fields: outputFieldConfigMap,
    };
    typeElement.querySelectorAll('Property,NavigationProperty').forEach(propertyElement => {
      const propertyName = propertyElement.getAttribute('Name');
      const propertyTypeRef = propertyElement.getAttribute('Type');
      if (!propertyName || !propertyTypeRef) {
        throw new Error('There is a Property element without a valid Name and Type attribute');
      }
      let inputType = this.getInputTypeByRef(propertyTypeRef);
      let outputType = this.getOutputTypeByRef(propertyTypeRef);
      const nonNullable = this.isNonNullableType(propertyElement);
      const queryable = propertyElement.tagName.toLowerCase() === 'NavigationProperty'.toLowerCase();
      if (!outputType) {
        this.unresolvedDependencies.push({
          typeName,
          fieldName: propertyName,
          fieldTypeName: propertyTypeRef,
          nonNullable,
          queryable,
        });
        return;
      }
      if (nonNullable) {
        inputType = inputType && new GraphQLNonNull(inputType);
        outputType = new GraphQLNonNull(outputType);
      }
      if (inputType) {
        inputFieldConfigMap[propertyName] = {
          type: inputType,
        };
      }
      outputFieldConfigMap[propertyName] = {
        type: outputType,
        args:
          queryable && outputType instanceof GraphQLList
            ? {
                queryOptions: {
                  type: ODataQueryOptions,
                },
              }
            : {},
        resolve: this.getResolver({ method: 'GET', ...serviceContext }),
      };
    });
    const baseTypeRef = typeElement.getAttribute('BaseType');
    const isAbstract = this.isAbstractType(typeElement);
    const isBaseType = serviceContext.schemaElement.querySelectorAll(`[BaseType$='.${typeName}'`).length > 0;
    if (baseTypeRef) {
      const { typeName: baseTypeName } = this.parseTypeRef(baseTypeRef);
      const baseInputType = this.getInputTypeByRef(baseTypeName) as GraphQLInputObjectType;
      const baseOutputType = this.getOutputTypeByRef(baseTypeName) as GraphQLObjectType | GraphQLInterfaceType;
      if (!baseOutputType) {
        this.unresolvedDependencies.push({
          typeName,
          fieldName: '__typename',
          fieldTypeName: baseTypeName,
          nonNullable: false,
          queryable: false,
        });
      } else {
        if (baseInputType) {
          const baseInputFieldsConfig = baseInputType.toConfig().fields;
          Object.assign(inputFieldConfigMap, baseInputFieldsConfig);
        }
        const baseOutputFieldsConfig = baseOutputType.toConfig().fields;
        Object.assign(outputFieldConfigMap, baseOutputFieldsConfig);
        if (
          this.entityTypeNameIdentifierFieldNameMap.has(baseOutputType.name) &&
          !this.entityTypeNameIdentifierFieldNameMap.has(typeName)
        ) {
          const identifierFieldName = this.entityTypeNameIdentifierFieldNameMap.get(baseOutputType.name!)!;
          this.entityTypeNameIdentifierFieldNameMap.set(typeName, identifierFieldName);
        }
        if (!isAbstract) {
          if (!isInterfaceType(baseOutputType)) {
            throw new Error(`${typeName} cannot implement non-interface type ${baseOutputType.name}`);
          }
          objectTypeConfig.interfaces = [baseOutputType];
          if ('getInterfaces' in baseOutputType) {
            objectTypeConfig.interfaces.push(...baseOutputType.getInterfaces());
          }
        }
      }
    }
    let objectType: GraphQLInterfaceType | GraphQLObjectType;
    if (isBaseType) {
      const resolveType: GraphQLTypeResolver<any, any> = root => {
        const typeRef = root['@odata.type'];
        if (typeRef) {
          const parsedTypeRef = this.parseTypeRef(typeRef);
          return parsedTypeRef.typeName;
        }
        return typeName;
      };
      if (!isAbstract) {
        const nonAbstractBaseTypeConfig = {
          ...objectTypeConfig,
        };
        const interfaceTypeName = `I${objectTypeConfig.name}`;
        if (this.entityTypeNameIdentifierFieldNameMap.has(objectTypeConfig.name)) {
          const identifierFieldName = this.entityTypeNameIdentifierFieldNameMap.get(objectTypeConfig.name)!;
          this.entityTypeNameIdentifierFieldNameMap.set(interfaceTypeName, identifierFieldName);
        }
        objectTypeConfig.name = interfaceTypeName;
        objectType = new GraphQLInterfaceType({
          ...objectTypeConfig,
          resolveType,
        });
        nonAbstractBaseTypeConfig.interfaces = [objectType];
        if ('getInterfaces' in objectType) {
          nonAbstractBaseTypeConfig.interfaces.push(...objectType.getInterfaces());
        }
        const nonAbstractBaseType = new GraphQLObjectType(nonAbstractBaseTypeConfig);
        this.nonAbstractBaseTypes.set(nonAbstractBaseTypeConfig.name, nonAbstractBaseType);
      } else {
        objectType = new GraphQLInterfaceType({
          ...objectTypeConfig,
          resolveType,
        });
      }
    } else {
      objectType = new GraphQLObjectType(objectTypeConfig);
    }
    const inputObjectType = new GraphQLInputObjectType(inputObjectTypeConfig);
    if (typeElement.tagName.toLowerCase() === 'EntityType'.toLowerCase()) {
      if (!this.entityTypeNameGraphQLObjectTypeMap.has(typeName)) {
        this.entityTypeNameGraphQLObjectTypeMap.set(typeName, objectType);
      }
      if (!this.entityTypeNameGraphQLInputObjectTypeMap.has(typeName)) {
        this.entityTypeNameGraphQLInputObjectTypeMap.set(typeName, inputObjectType);
      }
    } else {
      if (!this.complexTypeNameGraphQLObjectTypeMap.has(typeName)) {
        this.complexTypeNameGraphQLObjectTypeMap.set(typeName, objectType);
      }
      if (!this.complexTypeNameGraphQLInputObjectTypeMap.has(typeName)) {
        this.complexTypeNameGraphQLInputObjectTypeMap.set(typeName, inputObjectType);
      }
    }
  }

  private processEntitySet(entitySetElement: Element, serviceContext: ServiceContext) {
    const entitySetName = entitySetElement.getAttribute('Name');
    const entityTypeRef = entitySetElement.getAttribute('EntityType');
    if (!entitySetName || !entityTypeRef) {
      throw new Error('Invalid EntitySet!');
    }
    const { typeName: entityTypeName } = this.parseTypeRef(entityTypeRef);
    const entityType = this.getOutputTypeByRef(entityTypeName) as GraphQLObjectType;
    if (!entityType) {
      throw new Error(`Type for ${entitySetName} not found!`);
    }
    this.entitySetEntityTypeNameMap.set(entitySetName, entityTypeName);

    const entityInput = this.getInputTypeByRef(entityTypeName) as GraphQLInputObjectType;
    const entityInputFields = entityInput.getFields();

    this.queryFields[`get${entitySetName}`] = {
      type: new GraphQLList(entityType),
      args: {
        ...serviceContext.serviceCommonArgs,
        queryOptions: {
          type: ODataQueryOptions,
        },
      },
      resolve: this.getResolver({ entitySetName, method: 'GET', ...serviceContext }),
    };

    const identifierField = this.getEntityTypeIdentifier(entityTypeName);
    if (!identifierField) {
      throw new Error(`Identifier field name for entity type ${entityTypeName} not found!`);
    }

    const identifierFieldName = identifierField.name;
    const identifierFieldType = identifierField.type;

    const getByIdFieldConfig: GraphQLFieldConfig<any, any> = {
      type: entityType,
      args: {
        ...serviceContext.serviceCommonArgs,
        [identifierFieldName]: {
          type: identifierFieldType as GraphQLInputType,
        },
      },
      resolve: this.getResolver({ entitySetName, method: 'GET', ...serviceContext }),
    };

    this.queryFields[`get${entitySetName}By${identifierFieldName}`] = getByIdFieldConfig;
    this.mutationFields[`get${entitySetName}By${identifierFieldName}`] = getByIdFieldConfig;

    this.mutationFields[`delete${entitySetName}By${identifierFieldName}`] = {
      type: GraphQLJSON,
      args: {
        ...serviceContext.serviceCommonArgs,
        [identifierFieldName]: {
          type: identifierFieldType as GraphQLInputType,
        },
      },
      resolve: this.getResolver({ entitySetName, method: 'DELETE', ...serviceContext }),
    };

    const entityUpdateInputFields: GraphQLInputFieldConfigMap = {};

    for (const fieldName in entityInputFields) {
      const inputField = entityInputFields[fieldName];
      entityUpdateInputFields[fieldName] = {
        type: isNonNullType(inputField.type) ? (inputField.type.ofType as GraphQLInputType) : inputField.type,
      };
    }

    const entityUpdateInput = new GraphQLInputObjectType({
      name: `${entitySetName}UpdateInput`,
      fields: entityUpdateInputFields,
    });

    this.mutationFields[`update${entitySetName}By${identifierField.name}`] = {
      type: entityType,
      args: {
        ...serviceContext.serviceCommonArgs,
        [identifierField.name]: {
          type: identifierField.type as GraphQLInputType,
        },
        input: {
          type: entityUpdateInput,
        },
      },
      resolve: this.getResolver({ entitySetName, method: 'PATCH', ...serviceContext }),
    };

    this.mutationFields[`create${entitySetName}`] = {
      type: entityType,
      args: {
        ...serviceContext.serviceCommonArgs,
        input: {
          type: entityInput,
        },
      },
      resolve: this.getResolver({ entitySetName, method: 'POST', ignoreIdentifierArg: true, ...serviceContext }),
    };

    this.queryFields[`get${entitySetName}Count`] = {
      type: GraphQLInt,
      args: {
        ...serviceContext.serviceCommonArgs,
      },
      resolve: this.getResolver({ entitySetName, method: 'GET', count: true, ...serviceContext }),
    };
  }

  private processOperations(operationTypeElement: Element, serviceContext: ServiceContext) {
    const operationName = operationTypeElement.getAttribute('Name');
    if (!operationName) {
      throw new Error(`Invalid ${operationTypeElement.tagName}! Name not found!`);
    }
    let returnType: GraphQLOutputType = GraphQLJSON;
    const operationTypeName = operationTypeElement.getAttribute('Type');
    if (operationTypeName) {
      returnType = this.getOutputTypeByRef(operationTypeName) || GraphQLJSON;
    }
    const returnTypeRef = operationTypeElement.querySelector('ReturnType')?.getAttribute('Type');
    if (returnTypeRef) {
      returnType = this.getOutputTypeByRef(returnTypeRef) || GraphQLJSON;
    }
    const method = operationTypeElement.tagName.toLowerCase() === 'Action'.toLowerCase() ? 'POST' : 'GET';
    const isBound = operationTypeElement.getAttribute('IsBound') === 'true';
    if (isBound) {
      let bindingParameterName = operationTypeElement.getAttribute('EntitySetPath');
      let bindingType: GraphQLObjectType | undefined;
      let bindingTypeRef: string | undefined;
      const operationArgs: GraphQLArgument[] = [];
      operationTypeElement.querySelectorAll('Parameter').forEach(parameterElement => {
        const paramName = parameterElement.getAttribute('Name');
        const paramTypeRef = parameterElement.getAttribute('Type');
        if (!paramName || !paramTypeRef) {
          throw new Error(`Invalid ${parameterElement.tagName}! Name or Type not found!`);
        }
        if (bindingParameterName ? bindingParameterName === paramName : this.isEntityType(paramTypeRef)) {
          bindingParameterName = paramName;
          bindingTypeRef = paramTypeRef;
          bindingType = this.getOutputTypeByRef(paramTypeRef, true) as GraphQLObjectType;
        } else {
          const paramType = this.getInputTypeByRef(paramTypeRef);
          if (!paramType) {
            throw new Error(`${paramTypeRef} is an invalid type name for ${operationName}.${paramName}!`);
          }
          operationArgs.push({
            name: paramName,
            type: paramType,
            description: '',
            defaultValue: undefined,
            extensions: [],
            astNode: undefined,
          });
        }
      });
      if (!bindingType) {
        throw new Error(`Binding parameter cannot be found for ${operationName}!`);
      }
      if (isListType(returnType)) {
        operationArgs.push({
          name: 'queryOptions',
          type: ODataQueryOptions,
          description: '',
          extensions: [],
          defaultValue: undefined,
          astNode: undefined,
        });
      }
      const bindingTypeFieldsMap = bindingType.getFields();
      bindingTypeFieldsMap[operationName] = {
        name: operationName,
        description: '',
        args: operationArgs,
        extensions: [],
        type: returnType,
        isDeprecated: false,
        deprecationReason: undefined,
        resolve: this.getResolver({ method, ...serviceContext }),
      };
      this.boundOperationsFullNameMap.set(
        operationName,
        operationTypeElement.closest('[Namespace]')?.getAttribute('Namespace') + '.' + operationName
      );
      serviceContext.schemaElement.querySelectorAll(`[BaseType='${bindingTypeRef}']`).forEach(implementationElement => {
        const implementationTypeName = implementationElement.getAttribute('Name');
        if (!implementationTypeName) {
          throw new Error(`Invalid binding element ${implementationTypeName}`);
        }
        const implementationOutputType = this.getOutputTypeByRef(implementationTypeName) as GraphQLObjectType;
        Object.assign(implementationOutputType.getFields(), bindingType!.getFields());
      });
      if (bindingTypeRef) {
        const { typeName: nonAbstractBaseTypeName } = this.parseTypeRef(bindingTypeRef);
        const nonAbstractBaseType = this.nonAbstractBaseTypes.get(nonAbstractBaseTypeName);
        if (nonAbstractBaseType) {
          Object.assign(nonAbstractBaseType.getFields(), bindingType!.getFields());
        }
      }
    } else {
      const operationArgs: GraphQLFieldConfigArgumentMap = {};
      operationTypeElement.querySelectorAll('Parameter').forEach(parameterElement => {
        const paramName = parameterElement.getAttribute('Name');
        const paramTypeRef = parameterElement.getAttribute('Type');
        if (!paramName || !paramTypeRef) {
          throw new Error(`Invalid ${parameterElement.tagName}! Name or Type not found!`);
        }
        const paramType = this.getInputTypeByRef(paramTypeRef);
        if (!paramType) {
          throw new Error(`${paramTypeRef} is an invalid type name for ${operationName}.${paramName}!`);
        }
        operationArgs[paramName] = {
          type: paramType,
        };
      });
      const rootFields = method === 'GET' ? this.queryFields : this.mutationFields;
      rootFields[operationName] = {
        type: returnType,
        args: operationArgs,
        resolve: this.getResolver({ method, ...serviceContext }),
      };
    }
  }

  private reprocessUnresolvedDependencies(serviceContext: ServiceContext) {
    return Promise.all(
      this.unresolvedDependencies.map(async unresolvedDependency => {
        const outputType = this.getOutputTypeByRef(unresolvedDependency.typeName) as
          | GraphQLObjectType
          | GraphQLInterfaceType;
        const outputFieldType = this.getOutputTypeByRef(unresolvedDependency.fieldTypeName) as
          | GraphQLObjectType
          | GraphQLInterfaceType;
        if (!outputType || !outputFieldType) {
          throw new Error(
            `${unresolvedDependency.typeName}.${unresolvedDependency.fieldName} => ${unresolvedDependency.fieldTypeName} cannot be resolved!`
          );
        }
        if (unresolvedDependency.fieldName === '__typename') {
          if (!isInterfaceType(outputFieldType)) {
            throw new Error(
              `${unresolvedDependency.fieldTypeName} must be an interface/base type because ${unresolvedDependency.typeName} implements it.`
            );
          }
          Object.assign(outputType.getFields(), outputFieldType.getFields());
          if (isObjectType(outputType)) {
            outputType.getInterfaces().push(outputFieldType);
          }
          const baseTypeRef = serviceContext.schemaElement
            .querySelector(`[Name='${unresolvedDependency.typeName}']`)
            ?.getAttribute('BaseType');
          if (!baseTypeRef) {
            throw new Error(`There is no BaseType defined for ${unresolvedDependency.typeName} but it was before!`);
          }
          const { typeName: baseTypeName } = this.parseTypeRef(baseTypeRef);
          if (
            this.entityTypeNameIdentifierFieldNameMap.has(baseTypeName) &&
            !this.entityTypeNameIdentifierFieldNameMap.has(outputType.name)
          ) {
            const identifierFieldName = this.entityTypeNameIdentifierFieldNameMap.get(baseTypeName!)!;
            this.entityTypeNameIdentifierFieldNameMap.set(unresolvedDependency.typeName, identifierFieldName);
          }
        } else {
          const fieldMap = outputType.getFields();
          const outputField: GraphQLField<any, any> = {
            name: unresolvedDependency.fieldName,
            type: unresolvedDependency.nonNullable ? new GraphQLNonNull(outputFieldType) : outputFieldType,
            description: '',
            args: [],
            extensions: [],
            isDeprecated: false,
            deprecationReason: undefined,
            resolve: this.getResolver({ method: 'GET', ...serviceContext }),
          };
          if (unresolvedDependency.queryable && isListType(outputFieldType)) {
            outputField.args.push({
              name: 'queryOptions',
              type: ODataQueryOptions,
              description: '',
              extensions: [],
              defaultValue: undefined,
              astNode: undefined,
            });
          }
          fieldMap[unresolvedDependency.fieldName] = outputField;
        }
        const inputType = this.getInputTypeByRef(unresolvedDependency.typeName) as GraphQLInputObjectType;
        if (inputType) {
          const fieldMap = inputType.getFields();
          const inputFieldType = this.getInputTypeByRef(unresolvedDependency.fieldTypeName);
          if (!inputFieldType) {
            throw new Error(
              `${unresolvedDependency.typeName}.${unresolvedDependency.fieldName} => ${unresolvedDependency.fieldTypeName} cannot be resolved!`
            );
          }
          const inputField: GraphQLInputField = {
            name: unresolvedDependency.fieldName,
            type: inputFieldType,
            extensions: [],
          };
          fieldMap[unresolvedDependency.fieldName] = inputField;
        }
        serviceContext.schemaElement
          .querySelectorAll(`[BaseType$='.${unresolvedDependency.typeName}']`)
          .forEach(implementationElement => {
            const implementationTypeName = implementationElement.getAttribute('Name');
            if (!implementationTypeName) {
              throw new Error(`Invalid binding element ${implementationTypeName}`);
            }
            const implementationInputType = this.getInputTypeByRef(implementationTypeName) as GraphQLInputObjectType;
            Object.assign(implementationInputType.getFields(), inputType.getFields());
            const implementationOutputType = this.getOutputTypeByRef(implementationTypeName) as GraphQLObjectType;
            Object.assign(implementationOutputType.getFields(), outputType.getFields());
          });
        const nonAbstractBaseType = this.nonAbstractBaseTypes.get(unresolvedDependency.typeName);
        if (nonAbstractBaseType) {
          Object.assign(nonAbstractBaseType.getFields(), outputType.getFields());
        }
      })
    );
  }

  private async processSchema(serviceContext: ServiceContext) {
    serviceContext.schemaElement
      .querySelectorAll('EnumType')
      .forEach(enumElement => this.processEnumElement(enumElement));
    serviceContext.schemaElement
      .querySelectorAll('EntityType,ComplexType')
      .forEach(typeElement => this.processTypeElement(typeElement, serviceContext));

    await this.reprocessUnresolvedDependencies(serviceContext);

    serviceContext.schemaElement
      .querySelectorAll('EntitySet')
      .forEach(entitySetElement => this.processEntitySet(entitySetElement, serviceContext));
    serviceContext.schemaElement
      .querySelectorAll('Function,Action,Singleton')
      .forEach(operationElement => this.processOperations(operationElement, serviceContext));
  }

  public async processServiceConfig() {
    const metadataUrl = urljoin(this.config.baseUrl, '$metadata');
    const metadataRequest = new Request(metadataUrl, {
      headers: this.config.schemaHeaders,
    });

    const { args: serviceCommonArgs, contextVariables } = parseInterpolationStrings([
      ...Object.values(this.config.operationHeaders || {}),
      this.config.baseUrl,
    ]);

    this.contextVariables = contextVariables;

    const serviceUrlFactory: ResolverDataBasedFactory<string> = getInterpolatedStringFactory(this.config.baseUrl);

    const headersFactory: ResolverDataBasedFactory<Headers> = getInterpolatedHeadersFactory(
      this.config.operationHeaders
    );

    const response = await fetchache(metadataRequest, this.cache);
    const text = await response.text();
    const {
      window: { document: schemaElement },
    } = new JSDOM(text);

    await this.processSchema({
      serviceUrlFactory,
      headersFactory,
      serviceCommonArgs,
      schemaElement,
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
    schemaConfig.types = [
      ...this.entityTypeNameGraphQLObjectTypeMap.values(),
      ...this.complexTypeNameGraphQLObjectTypeMap.values(),
      ...this.nonAbstractBaseTypes.values(),
    ];
    return new GraphQLSchema(schemaConfig);
  }
}
