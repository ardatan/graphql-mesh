// eslint-disable-next-line import/no-nodejs-modules
import EventEmitter from 'node:events';
import type DataLoader from 'dataloader';
import { XMLParser } from 'fast-xml-parser';
import { specifiedDirectives } from 'graphql';
import { InterfaceTypeComposer, SchemaComposer } from 'graphql-compose';
import type {
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposerFieldConfigDefinition,
} from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLGUID,
  GraphQLISO8601Duration,
  GraphQLJSON,
} from 'graphql-scalars';
import { pascalCase } from 'pascal-case';
import urljoin from 'url-join';
import { process } from '@graphql-mesh/cross-helpers';
import { parseInterpolationStrings, stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { ImportFn, Logger, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import {
  AbstractTypeDirective,
  BoundActionDirective,
  BoundFunctionDirective,
  CreateEntitySetDirective,
  DeleteEntitySetDirective,
  EntityInfoDirective,
  EntitySetByIdentifierDirective,
  EntitySetCountDirective,
  EntitySetDirective,
  NavPropDirective,
  PluralNavDirective,
  processDirectives,
  ResolveRootDirective,
  SingletonDirective,
  SingularNavDirective,
  UnboundActionDirective,
  UnboundFunctionDirective,
  UpdateEntitySetDirective,
  type TransportDirectiveArgs,
} from './directives.js';
import type { EntityTypeExtensions } from './types.js';
import { getTypeNameFromRef } from './utils/getTypeNameFromRef.js';
import { QUERY_OPTIONS_FIELDS } from './utils/QueryOptionsFields.js';

type DataLoaderMap = Record<symbol, DataLoader<Request, Response, Request>>;

export interface LoadGraphQLSchemaFromODataOpts {
  endpoint: string;
  source?: string;
  baseDir: string;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  fetchFn: MeshFetch;
  logger: Logger;
  importFn: ImportFn;
  batch?: 'none' | 'json' | 'multipart';
  expandNavProps?: boolean;
}

export async function loadNonExecutableGraphQLSchemaFromOData(
  name: string,
  {
    endpoint: nonInterpolatedBaseUrl,
    operationHeaders,
    importFn,
    logger,
    fetchFn,
    source,
    baseDir,
    schemaHeaders,
    batch,
    expandNavProps,
  }: LoadGraphQLSchemaFromODataOpts,
) {
  const eventEmitterSet = new Set<EventEmitter>();
  const endpoint = stringInterpolator.parse(nonInterpolatedBaseUrl, {
    env: process.env,
  });

  const schemaComposer = new SchemaComposer();
  schemaComposer.add(GraphQLBigInt);
  schemaComposer.add(GraphQLGUID);
  schemaComposer.add(GraphQLDateTime);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.add(GraphQLByte);
  schemaComposer.add(GraphQLDate);
  schemaComposer.add(GraphQLISO8601Duration);

  const aliasNamespaceMap = new Map<string, string>();

  const metadataUrl = urljoin(endpoint, '$metadata');
  const metadataText = await readFileOrUrl<string>(source || metadataUrl, {
    allowUnknownExtensions: true,
    cwd: baseDir,
    headers: schemaHeaders,
    fetch: fetchFn,
    logger,
    importFn,
  });
  const xmlParser = new XMLParser({
    attributeNamePrefix: '',
    attributesGroupName: 'attributes',
    textNodeName: 'innerText',
    ignoreAttributes: false,
    removeNSPrefix: true,
    isArray: (_, __, ___, isAttribute) => !isAttribute,
    allowBooleanAttributes: true,
    preserveOrder: false,
  });
  const metadataJson = await xmlParser.parse(metadataText);

  const schemas = metadataJson.Edmx[0].DataServices[0].Schema;
  const multipleSchemas = schemas.length > 1;
  const namespaces = new Set<string>();

  schemaComposer.createEnumTC({
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

  schemaComposer.createInputTC({
    name: 'QueryOptions',
    fields: QUERY_OPTIONS_FIELDS,
  });

  const { args: commonArgs } = parseInterpolationStrings([
    ...Object.values(operationHeaders || {}),
    endpoint,
  ]);

  function getTCByTypeNames(...typeNames: string[]) {
    for (const typeName of typeNames) {
      try {
        return schemaComposer.getAnyTC(typeName);
      } catch {}
    }
    return null;
  }

  function buildName({ schemaNamespace, name }: { schemaNamespace: string; name: string }) {
    const alias = aliasNamespaceMap.get(schemaNamespace) || schemaNamespace;
    const ref = alias + '.' + name;
    return multipleSchemas ? pascalCase(ref.split('.').join('_')) : name;
  }

  schemas?.forEach((schemaObj: any) => {
    const schemaNamespace = schemaObj.attributes.Namespace;
    namespaces.add(schemaNamespace);
    const schemaAlias = schemaObj.attributes.Alias;
    if (schemaAlias) {
      aliasNamespaceMap.set(schemaNamespace, schemaAlias);
    }
  });

  schemas?.forEach((schemaObj: any) => {
    const schemaNamespace = schemaObj.attributes.Namespace;

    schemaObj.EnumType?.forEach((enumObj: any) => {
      const values: Record<string, EnumTypeComposerValueConfigDefinition> = {};
      enumObj.Member?.forEach((memberObj: any) => {
        const key = memberObj.attributes.Name;
        // This doesn't work.
        // const value = memberElement.getAttribute('Value')!;
        values[key] = {
          value: key,
          extensions: { memberObj },
        };
      });
      const enumTypeName = buildName({ schemaNamespace, name: enumObj.attributes.Name });
      schemaComposer.createEnumTC({
        name: enumTypeName,
        values,
        extensions: { enumObj },
      });
    });

    const allTypes = (schemaObj.EntityType || []).concat(schemaObj.ComplexType || []);
    const typesWithBaseType = allTypes.filter((typeObj: any) => typeObj.attributes.BaseType);

    allTypes?.forEach((typeObj: any) => {
      const entityTypeName = buildName({ schemaNamespace, name: typeObj.attributes.Name });
      const isOpenType = typeObj.attributes.OpenType === 'true';
      const isAbstract = typeObj.attributes.Abstract === 'true';
      const eventEmitter = new EventEmitter();
      eventEmitter.setMaxListeners(Infinity);
      eventEmitterSet.add(eventEmitter);
      const extensions: EntityTypeExtensions = {
        directives: {
          entityInfo: {
            actualFields: [],
            navigationFields: [],
            isOpenType,
          },
        },
        eventEmitter,
      };
      schemaComposer.addDirective(EntityInfoDirective);
      const inputType = schemaComposer.createInputTC({
        name: entityTypeName + 'Input',
        fields: {},
        extensions: () => extensions,
      });
      let abstractType: InterfaceTypeComposer;
      if (
        typesWithBaseType.some((typeObj: any) =>
          typeObj.attributes.BaseType.includes(`.${entityTypeName}`),
        ) ||
        isAbstract
      ) {
        abstractType = schemaComposer.createInterfaceTC({
          name: isAbstract ? entityTypeName : `I${entityTypeName}`,
          extensions: extensions as any,
        });
        const directiveExtensions: any = ((extensions.directives as any) ||= {});
        directiveExtensions.abstractType = {
          entityTypeName,
          isAbstract,
          get aliasNamespaceMap() {
            return [...aliasNamespaceMap.entries()];
          },
          multipleSchemas,
          get namespaces() {
            return [...namespaces];
          },
        };
        schemaComposer.addDirective(AbstractTypeDirective);
      }
      const outputType = schemaComposer.createObjectTC({
        name: isAbstract ? `T${entityTypeName}` : entityTypeName,
        extensions: extensions as any,
        interfaces: abstractType ? [abstractType] : [],
      });

      abstractType?.setInputTypeComposer(inputType);
      outputType.setInputTypeComposer(inputType);

      const propertyRefObj = typeObj.Key && typeObj.Key[0].PropertyRef[0];
      if (propertyRefObj) {
        extensions.directives.entityInfo.identifierFieldName = propertyRefObj.attributes.Name;
      }

      typeObj.Property?.forEach((propertyObj: any) => {
        const propertyName = propertyObj.attributes.Name;
        extensions.directives.entityInfo.actualFields.push(propertyName);
        const propertyTypeRef = propertyObj.attributes.Type;
        if (propertyName === extensions.directives.entityInfo.identifierFieldName) {
          extensions.directives.entityInfo.identifierFieldTypeRef = propertyTypeRef;
        }
        const isRequired = propertyObj.attributes.Nullable === 'false';
        inputType.addFields({
          [propertyName]: {
            type: getTypeNameFromRef({
              typeRef: propertyTypeRef,
              isInput: true,
              isRequired,
              aliasNamespaceMap,
              namespaces,
              multipleSchemas,
              isEnumType: typeName => schemaComposer.isEnumType(typeName),
            }),
            extensions: { propertyObj },
          },
        });
        const field: ObjectTypeComposerFieldConfigDefinition<unknown, DataLoaderMap> = {
          type: getTypeNameFromRef({
            typeRef: propertyTypeRef,
            isInput: false,
            isRequired,
            aliasNamespaceMap,
            namespaces,
            multipleSchemas,
            isEnumType: typeName => schemaComposer.isEnumType(typeName),
          }),
          extensions: { propertyObj },
        };
        abstractType?.addFields({
          [propertyName]: field,
        });
        outputType.addFields({
          [propertyName]: field,
        });
      });
      typeObj.NavigationProperty?.forEach((navigationPropertyObj: any) => {
        const navigationPropertyName = navigationPropertyObj.attributes.Name;
        extensions.directives.entityInfo.navigationFields.push(navigationPropertyName);
        const navigationPropertyTypeRef = navigationPropertyObj.attributes.Type;
        const isRequired = navigationPropertyObj.attributes.Nullable === 'false';
        const isList = navigationPropertyTypeRef.startsWith('Collection(');
        if (isList) {
          const singularField: ObjectTypeComposerFieldConfigDefinition<any, unknown> = {
            type: getTypeNameFromRef({
              typeRef: navigationPropertyTypeRef,
              isInput: false,
              isRequired,
              aliasNamespaceMap,
              namespaces,
              multipleSchemas,
              isEnumType: typeName => schemaComposer.isEnumType(typeName),
            })
              .replace('[', '')
              .replace(']', ''),
            args: {
              ...commonArgs,
              id: {
                type: 'ID',
              },
            },
            extensions: {
              navigationPropertyObj,
              directives: {
                singularNav: {
                  navigationPropertyName,
                },
              } as any,
            },
          };
          schemaComposer.addDirective(SingularNavDirective);
          const pluralField: ObjectTypeComposerFieldConfigDefinition<any, DataLoaderMap> = {
            type: getTypeNameFromRef({
              typeRef: navigationPropertyTypeRef,
              isInput: false,
              isRequired,
              aliasNamespaceMap,
              namespaces,
              multipleSchemas,
              isEnumType: typeName => schemaComposer.isEnumType(typeName),
            }),
            args: {
              ...commonArgs,
              queryOptions: { type: 'QueryOptions' },
            },
            extensions: {
              navigationPropertyObj,
              directives: {
                pluralNav: {
                  navigationPropertyName,
                },
              } as any,
            },
          };
          schemaComposer.addDirective(PluralNavDirective);
          abstractType?.addFields({
            [navigationPropertyName]: pluralField,
            [`${navigationPropertyName}ById`]: singularField,
          });
          outputType.addFields({
            [navigationPropertyName]: pluralField,
            [`${navigationPropertyName}ById`]: singularField,
          });
        } else {
          const field: ObjectTypeComposerFieldConfigDefinition<any, DataLoaderMap> = {
            type: getTypeNameFromRef({
              typeRef: navigationPropertyTypeRef,
              isInput: false,
              isRequired,
              aliasNamespaceMap,
              namespaces,
              multipleSchemas,
              isEnumType: typeName => schemaComposer.isEnumType(typeName),
            }),
            args: {
              ...commonArgs,
            },
            extensions: {
              navigationPropertyObj,
              directives: {
                navProp: {
                  navigationPropertyName,
                },
              } as any,
            },
          };
          schemaComposer.addDirective(NavPropDirective);
          abstractType?.addFields({
            [navigationPropertyName]: field,
          });
          outputType.addFields({
            [navigationPropertyName]: field,
          });
        }
      });
      if (isOpenType || outputType.getFieldNames().length === 0) {
        extensions.directives.entityInfo.isOpenType = true;
        inputType.addFields({
          rest: {
            type: 'JSON',
          },
        });
        abstractType?.addFields({
          rest: {
            type: 'JSON',
            extensions: {
              directives: {
                resolveRoot: {},
              } as any,
            },
          },
        });
        schemaComposer.addDirective(ResolveRootDirective);
        outputType.addFields({
          rest: {
            type: 'JSON',
          },
        });
      }
      const updateInputType = inputType.clone(`${entityTypeName}UpdateInput`);
      updateInputType
        .getFieldNames()
        ?.forEach(fieldName => updateInputType.makeOptional(fieldName));
      // Types might be considered as unused implementations of interfaces so we must prevent that
      schemaComposer.addSchemaMustHaveType(outputType);
    });

    const handleUnboundFunctionObj = (unboundFunctionObj: any) => {
      const functionName = unboundFunctionObj.attributes.Name;
      const returnTypeRef = unboundFunctionObj.ReturnType[0].attributes.Type;
      const returnType = getTypeNameFromRef({
        typeRef: returnTypeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      });
      schemaComposer.Query.addFields({
        [functionName]: {
          type: returnType,
          args: {
            ...commonArgs,
          },
          extensions: {
            directives: {
              unboundFunction: {
                functionName,
              },
            } as any,
          },
        },
      });
      schemaComposer.addDirective(UnboundFunctionDirective);
      unboundFunctionObj.Parameter?.forEach((parameterObj: any) => {
        const parameterName = parameterObj.attributes.Name;
        const parameterTypeRef = parameterObj.attributes.Type;
        const isRequired = parameterObj.attributes.Nullable === 'false';
        const parameterType = getTypeNameFromRef({
          typeRef: parameterTypeRef,
          isInput: true,
          isRequired,
          aliasNamespaceMap,
          namespaces,
          multipleSchemas,
          isEnumType: typeName => schemaComposer.isEnumType(typeName),
        });
        schemaComposer.Query.addFieldArgs(functionName, {
          [parameterName]: {
            type: parameterType,
          },
        });
      });
    };

    const handleBoundFunctionObj = (boundFunctionObj: any) => {
      const functionName = boundFunctionObj.attributes.Name;
      const functionRef = schemaNamespace + '.' + functionName;
      const returnTypeRef = boundFunctionObj.ReturnType[0].attributes.Type;
      const returnType = getTypeNameFromRef({
        typeRef: returnTypeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      });
      const args: ObjectTypeComposerArgumentConfigMapDefinition<any> = {
        ...commonArgs,
      };
      // eslint-disable-next-line prefer-const
      let entitySetPath = boundFunctionObj.attributes.EntitySetPath?.split('/')[0];
      let field: ObjectTypeComposerFieldConfigDefinition<any, any, any>;
      let boundEntityTypeName: string;
      boundFunctionObj.Parameter?.forEach((parameterObj: any) => {
        const parameterName = parameterObj.attributes.Name;
        const parameterTypeRef = parameterObj.attributes.Type;
        const isRequired = parameterObj.attributes.Nullable === 'false';
        const parameterTypeName = getTypeNameFromRef({
          typeRef: parameterTypeRef,
          isInput: true,
          isRequired,
          aliasNamespaceMap,
          namespaces,
          multipleSchemas,
          isEnumType: typeName => schemaComposer.isEnumType(typeName),
        });
        // If entitySetPath is not available, take first parameter as entity
        // The first segment of the entity set path must match the binding parameter name
        // (see: http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#_Toc38530388)
        entitySetPath = (entitySetPath && entitySetPath.split('/')[0]) || parameterName;
        if (entitySetPath === parameterName) {
          boundEntityTypeName = getTypeNameFromRef({
            typeRef: parameterTypeRef,
            isInput: false,
            isRequired: false,
            aliasNamespaceMap,
            namespaces,
            multipleSchemas,
            isEnumType: typeName => schemaComposer.isEnumType(typeName),
          })
            .replace('[', '')
            .replace(']', '');
          field = {
            type: returnType,
            args,
            extensions: {
              directives: {
                boundFunction: {
                  functionRef,
                },
              } as any,
            },
          };
          schemaComposer.addDirective(BoundFunctionDirective);
        }
        args[parameterName] = {
          type: parameterTypeName,
        };
      });
      const boundEntityType = schemaComposer.getAnyTC(boundEntityTypeName) as InterfaceTypeComposer;
      const boundEntityOtherType = getTCByTypeNames(
        'I' + boundEntityTypeName,
        'T' + boundEntityTypeName,
      ) as InterfaceTypeComposer;
      boundEntityType.addFields({
        [functionName]: field,
      });
      boundEntityOtherType?.addFields({
        [functionName]: field,
      });
    };

    schemaObj.Function?.forEach((functionObj: any) => {
      if (functionObj.attributes?.IsBound === 'true') {
        handleBoundFunctionObj(functionObj);
      } else {
        handleUnboundFunctionObj(functionObj);
      }
    });

    const handleUnboundActionObj = (unboundActionObj: any) => {
      const actionName = unboundActionObj.attributes.Name;
      schemaComposer.Mutation.addFields({
        [actionName]: {
          type: 'JSON',
          args: {
            ...commonArgs,
          },
          extensions: {
            directives: {
              unboundAction: {
                actionName,
              },
            } as any,
          },
        },
      });
      schemaComposer.addDirective(UnboundActionDirective);

      unboundActionObj.Parameter?.forEach((parameterObj: any) => {
        const parameterName = parameterObj.attributes.Name;
        const parameterTypeRef = parameterObj.attributes.Type;
        const isRequired = parameterObj.attributes.Nullable === 'false';
        const parameterType = getTypeNameFromRef({
          typeRef: parameterTypeRef,
          isInput: true,
          isRequired,
          aliasNamespaceMap,
          namespaces,
          multipleSchemas,
          isEnumType: typeName => schemaComposer.isEnumType(typeName),
        });
        schemaComposer.Mutation.addFieldArgs(actionName, {
          [parameterName]: {
            type: parameterType,
          },
        });
      });
    };

    const boundActionEntityParameterDetails = (parameterObj: any) => {
      const parameterName = parameterObj.attributes.Name;
      const parameterTypeRef = parameterObj.attributes.Type;
      const isRequired = parameterObj.attributes.Nullable === 'false';
      const parameterTypeName = getTypeNameFromRef({
        typeRef: parameterTypeRef,
        isInput: true,
        isRequired,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      });
      const boundEntityTypeName = getTypeNameFromRef({
        typeRef: parameterTypeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      })
        .replace('[', '')
        .replace(']', ''); // Todo temp workaround
      return { boundEntityTypeName, argName: parameterName, argType: parameterTypeName };
    };
    const boundActionEntitySetDetails = (entitySetObj: any) => {
      const entitySetTypeRef = entitySetObj.attributes.EntityType;
      const boundEntityTypeName = getTypeNameFromRef({
        typeRef: entitySetTypeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      });

      const entityOutputTC = getTCByTypeNames('I' + boundEntityTypeName, boundEntityTypeName) as
        | InterfaceTypeComposer
        | ObjectTypeComposer;
      const entityTypeExtensions = entityOutputTC.getExtensions() as any as EntityTypeExtensions;
      const argName = entityTypeExtensions.directives.entityInfo.identifierFieldName;
      const argType = entityOutputTC.getFieldTypeName(argName);
      return { boundEntityTypeName, argName, argType };
    };
    const handleBoundActionObj = (boundActionObj: any) => {
      const actionName = boundActionObj.attributes.Name;
      const actionRef = schemaNamespace + '.' + actionName;
      const entitySetPath = boundActionObj.attributes.EntitySetPath;
      // If entitySetPath is not specified, take first parameter as entity
      const entityParameterObj = boundActionObj.Parameter?.find(
        (parameterObj: any) => !entitySetPath || parameterObj.attributes.Name === entitySetPath,
      );
      // Try to find EntitySet matching entitySetPath:
      const entitySetObj = schemas.flatMap(
        schemaObj =>
          schemaObj.EntityContainer?.flatMap(
            entityContainerObj =>
              entityContainerObj.EntitySet?.flatMap(entitySetObj =>
                entitySetObj.attributes.Name === entitySetPath ? [entitySetObj] : [],
              ) ?? [],
          ) ?? [],
      )?.[0];
      const { boundEntityTypeName, argName, argType } = entitySetObj
        ? boundActionEntitySetDetails(entitySetObj)
        : entityParameterObj
          ? boundActionEntityParameterDetails(entityParameterObj)
          : (() => {
              throw new Error(`EntitySet ${entitySetPath} not found in schema ${schemaNamespace}`);
            })();

      const args: ObjectTypeComposerArgumentConfigMapDefinition<any> = {
        ...commonArgs,
        [argName]: {
          type: argType,
        },
      };
      // add remaining parameters to args:
      boundActionObj.Parameter?.forEach((parameterObj: any) => {
        const { argName, argType } = boundActionEntityParameterDetails(parameterObj);
        args[argName] = {
          type: argType,
        };
      });

      const boundField: ObjectTypeComposerFieldConfigDefinition<any, any, any> = {
        type: 'JSON',
        args,
        extensions: {
          directives: {
            boundAction: {
              actionRef,
            },
          } as any,
        },
      };
      schemaComposer.addDirective(BoundActionDirective);
      const boundEntityType = schemaComposer.getAnyTC(boundEntityTypeName) as InterfaceTypeComposer;
      boundEntityType.addFields({
        [actionName]: boundField,
      });
      const otherType = getTCByTypeNames(
        `I${boundEntityTypeName}`,
        `T${boundEntityTypeName}`,
      ) as InterfaceTypeComposer;
      otherType?.addFields({
        [actionName]: boundField,
      });
    };

    schemaObj.Action?.forEach((actionObj: any) => {
      if (actionObj.attributes?.IsBound === 'true') {
        handleBoundActionObj(actionObj);
      } else {
        handleUnboundActionObj(actionObj);
      }
    });

    // Rearrange fields for base types and implementations
    typesWithBaseType?.forEach((typeObj: any) => {
      const typeName = buildName({
        schemaNamespace,
        name: typeObj.attributes.Name,
      });
      const inputType = schemaComposer.getITC(typeName + 'Input') as InputTypeComposer;
      const abstractType = getTCByTypeNames('I' + typeName, typeName) as InterfaceTypeComposer;
      const outputType = getTCByTypeNames('T' + typeName, typeName) as ObjectTypeComposer;
      const baseTypeRef = typeObj.attributes.BaseType;
      const {
        directives: { entityInfo },
        eventEmitter,
      } = outputType.getExtensions() as any as EntityTypeExtensions;
      const baseTypeName = getTypeNameFromRef({
        typeRef: baseTypeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        namespaces,
        multipleSchemas,
        isEnumType: typeName => schemaComposer.isEnumType(typeName),
      });
      const baseInputType = schemaComposer.getAnyTC(baseTypeName + 'Input') as InputTypeComposer;
      const baseAbstractType = getTCByTypeNames(
        'I' + baseTypeName,
        baseTypeName,
      ) as InterfaceTypeComposer;
      const baseOutputType = getTCByTypeNames(
        'T' + baseTypeName,
        baseTypeName,
      ) as ObjectTypeComposer;
      const {
        directives: { entityInfo: baseEntityInfo },
        eventEmitter: baseEventEmitter,
      } = baseOutputType.getExtensions() as any as EntityTypeExtensions;
      const baseEventEmitterListener = () => {
        inputType.addFields(baseInputType.getFields());
        entityInfo.identifierFieldName =
          baseEntityInfo.identifierFieldName || entityInfo.identifierFieldName;
        entityInfo.identifierFieldTypeRef =
          baseEntityInfo.identifierFieldTypeRef || entityInfo.identifierFieldTypeRef;
        entityInfo.actualFields.unshift(...baseEntityInfo.actualFields);
        abstractType?.addFields(baseAbstractType?.getFields());
        outputType.addFields(baseOutputType.getFields());
        if (baseAbstractType instanceof InterfaceTypeComposer) {
          // abstractType.addInterface(baseAbstractType.getTypeName());
          outputType.addInterface(baseAbstractType.getTypeName());
        }
        eventEmitter.emit('onFieldChange');
      };
      baseEventEmitter.on('onFieldChange', baseEventEmitterListener);
      baseEventEmitterListener();
    });
  });

  schemas?.forEach((schemaObj: any) => {
    schemaObj.EntityContainer?.forEach((entityContainerObj: any) => {
      entityContainerObj.Singleton?.forEach((singletonObj: any) => {
        const singletonName = singletonObj.attributes.Name;
        const singletonTypeRef = singletonObj.attributes.Type;
        const singletonTypeName = getTypeNameFromRef({
          typeRef: singletonTypeRef,
          isInput: false,
          isRequired: false,
          aliasNamespaceMap,
          namespaces,
          multipleSchemas,
          isEnumType: typeName => schemaComposer.isEnumType(typeName),
        });
        schemaComposer.Query.addFields({
          [singletonName]: {
            type: singletonTypeName,
            args: {
              ...commonArgs,
            },
            extensions: {
              directives: {
                singleton: {
                  singletonName,
                },
              } as any,
            },
          },
        });
        schemaComposer.addDirective(SingletonDirective);
      });

      entityContainerObj?.EntitySet?.forEach((entitySetObj: any) => {
        const entitySetName = entitySetObj.attributes.Name;
        const entitySetTypeRef = entitySetObj.attributes.EntityType;
        const entityTypeName = getTypeNameFromRef({
          typeRef: entitySetTypeRef,
          isInput: false,
          isRequired: false,
          aliasNamespaceMap,
          namespaces,
          multipleSchemas,
          isEnumType: typeName => schemaComposer.isEnumType(typeName),
        });
        const entityOutputTC = getTCByTypeNames('I' + entityTypeName, entityTypeName) as
          | InterfaceTypeComposer
          | ObjectTypeComposer;
        const {
          directives: { entityInfo },
        } = entityOutputTC.getExtensions() as any as EntityTypeExtensions;
        const identifierFieldName = entityInfo.identifierFieldName;
        const identifierFieldTypeRef = entityInfo.identifierFieldTypeRef;
        const identifierFieldTypeName = entityOutputTC.getFieldTypeName(identifierFieldName);
        const typeName = entityOutputTC.getTypeName();
        schemaComposer.addDirective(EntitySetDirective);
        schemaComposer.addDirective(EntitySetByIdentifierDirective);
        schemaComposer.addDirective(EntitySetCountDirective);
        schemaComposer.addDirective(CreateEntitySetDirective);
        schemaComposer.addDirective(DeleteEntitySetDirective);
        schemaComposer.addDirective(UpdateEntitySetDirective);
        const commonFields: Record<string, ObjectTypeComposerFieldConfigDefinition<any, any>> = {
          [entitySetName]: {
            type: `[${typeName}]`,
            args: {
              ...commonArgs,
              queryOptions: { type: 'QueryOptions' },
            },
            extensions: {
              directives: {
                entitySet: {
                  entitySetName,
                },
              } as any,
            },
          },
          [`${entitySetName}By${identifierFieldName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
            },
            extensions: {
              directives: {
                entitySetByIdentifier: {
                  entitySetName,
                  identifierFieldName,
                  identifierFieldTypeRef,
                },
              } as any,
            },
          },
        };
        schemaComposer.Query.addFields({
          ...commonFields,
          [`${entitySetName}Count`]: {
            type: 'Int',
            args: {
              ...commonArgs,
              queryOptions: { type: 'QueryOptions' },
            },
            extensions: {
              directives: {
                entitySetCount: {
                  entitySetName,
                },
              } as any,
            },
          },
        });
        schemaComposer.Mutation.addFields({
          ...commonFields,
          [`create${entitySetName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              input: {
                type: entityTypeName + 'Input',
              },
            },
            extensions: {
              directives: {
                createEntitySet: {
                  entitySetName,
                },
              } as any,
            },
          },
          [`delete${entitySetName}By${identifierFieldName}`]: {
            type: 'JSON',
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
            },
            extensions: {
              directives: {
                deleteEntitySet: {
                  entitySetName,
                  identifierFieldName,
                  identifierFieldTypeRef,
                },
              } as any,
            },
          },
          [`update${entitySetName}By${identifierFieldName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
              input: {
                type: entityTypeName + 'UpdateInput',
              },
            },
            extensions: {
              directives: {
                updateEntitySet: {
                  entitySetName,
                  identifierFieldName,
                  identifierFieldTypeRef,
                },
              } as any,
            },
          },
        });
      });
    });
  });

  // graphql-compose doesn't add @defer and @stream to the schema
  specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

  const schema = schemaComposer.buildSchema();
  const schemaExtensions: any = (schema.extensions ||= {});
  const directiveExtensions = (schemaExtensions.directives ||= {});
  directiveExtensions.transport = {
    kind: 'odata',
    subgraph: name,
    location: endpoint,
    headers: Object.entries(schemaHeaders || []),
    options: {
      batch,
      expandNavProps,
    },
  };
  eventEmitterSet.forEach(ee => ee.removeAllListeners());
  eventEmitterSet.clear();

  return schema;
}

export async function loadGraphQLSchemaFromOData(
  name: string,
  opts: LoadGraphQLSchemaFromODataOpts,
) {
  const schema = await loadNonExecutableGraphQLSchemaFromOData(name, opts);
  return processDirectives({
    schema,
    fetchFn: opts.fetchFn,
  });
}

export { processDirectives };

export function loadODataSubgraph(
  name: string,
  options: Omit<LoadGraphQLSchemaFromODataOpts, 'logger' | 'fetchFn' | 'baseDir' | 'importFn'>,
) {
  return (ctx: { fetch: MeshFetch; cwd: string; logger: Logger }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromOData(name, {
      ...options,
      importFn: defaultImportFn,
      logger: ctx.logger,
      fetchFn: ctx.fetch,
      baseDir: ctx.cwd,
    }),
  });
}
