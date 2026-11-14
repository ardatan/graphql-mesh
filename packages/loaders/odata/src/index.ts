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
import { type Logger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import { parseInterpolationStrings, stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import transportRest, { type RESTTransportOptions } from '@graphql-mesh/transport-rest';
import type { ImportFn, MeshFetch } from '@graphql-mesh/types';
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
  processDirectives as processODataResidualDirectives,
  ResolveRootDirective,
  SingletonDirective,
  SingularNavDirective,
  UnboundActionDirective,
  UnboundFunctionDirective,
  UpdateEntitySetDirective,
} from './directives.js';
import { applyODataConnectSchemaExtensions, emitODataConnectors } from './emitODataConnectors.js';
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
  log: Logger;
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
    log,
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
    log,
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
        const rawKey = String(memberObj.attributes.Name ?? '');
        // GraphQL enum values cannot be named `null` / `true` / `false` (MS Graph has these).
        const key = ['null', 'true', 'false'].includes(rawKey) ? `_${rawKey}` : rawKey;
        if (!key || !/^[_A-Za-z][_0-9A-Za-z]*$/.test(key)) {
          return;
        }
        values[key] = {
          value: rawKey,
          extensions: { memberObj },
        };
      });
      if (!Object.keys(values).length) {
        return;
      }
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
      // Share `entityInfo` + `eventEmitter` across interface/object/input, but give each
      // TC its own `directives` bag — otherwise `@connect` / `@key` / `@shareable` stamped
      // on the object also appear on the interface (Federation rejects those locations).
      const entityInfo = {
        actualFields: [] as string[],
        navigationFields: [] as string[],
        isOpenType,
        identifierFieldName: undefined as string | undefined,
        identifierFieldTypeRef: undefined as string | undefined,
      };
      const outputExtensions: EntityTypeExtensions = {
        directives: {
          entityInfo,
        },
        eventEmitter,
      };
      schemaComposer.addDirective(EntityInfoDirective);
      const inputType = schemaComposer.createInputTC({
        name: entityTypeName + 'Input',
        fields: {},
        extensions: {
          directives: { entityInfo },
          eventEmitter,
        } as any,
      });
      let abstractType: InterfaceTypeComposer;
      if (
        typesWithBaseType.some((typeObj: any) =>
          typeObj.attributes.BaseType.includes(`.${entityTypeName}`),
        ) ||
        isAbstract
      ) {
        const abstractExtensions: EntityTypeExtensions = {
          directives: {
            entityInfo,
            abstractType: {
              entityTypeName,
              isAbstract,
              get aliasNamespaceMap() {
                return [...aliasNamespaceMap.entries()];
              },
              multipleSchemas,
              get namespaces() {
                return [...namespaces];
              },
            } as any,
          },
          eventEmitter,
        };
        abstractType = schemaComposer.createInterfaceTC({
          name: isAbstract ? entityTypeName : `I${entityTypeName}`,
          extensions: abstractExtensions as any,
        });
        schemaComposer.addDirective(AbstractTypeDirective);
      }
      const outputType = schemaComposer.createObjectTC({
        name: isAbstract ? `T${entityTypeName}` : entityTypeName,
        extensions: outputExtensions as any,
        interfaces: abstractType ? [abstractType] : [],
      });

      abstractType?.setInputTypeComposer(inputType);
      outputType.setInputTypeComposer(inputType);

      const propertyRefObj = typeObj.Key && typeObj.Key[0].PropertyRef[0];
      if (propertyRefObj) {
        entityInfo.identifierFieldName = propertyRefObj.attributes.Name;
      }

      typeObj.Property?.forEach((propertyObj: any) => {
        const propertyName = propertyObj.attributes.Name;
        entityInfo.actualFields.push(propertyName);
        const propertyTypeRef = propertyObj.attributes.Type;
        if (propertyName === entityInfo.identifierFieldName) {
          entityInfo.identifierFieldTypeRef = propertyTypeRef;
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
        entityInfo.navigationFields.push(navigationPropertyName);
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
        entityInfo.isOpenType = true;
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
      // graphql-compose clone() uses getDescription() which coerces missing descriptions to "".
      // Clear that so printed SDL does not emit empty `""""""` blocks.
      const clonedDescription = updateInputType.getDescription();
      if (!clonedDescription.trim()) {
        updateInputType.setDescription(undefined);
      }
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
        InterfaceTypeComposer | ObjectTypeComposer;
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
      const bindingDetails = entitySetObj
        ? boundActionEntitySetDetails(entitySetObj)
        : entityParameterObj
          ? boundActionEntityParameterDetails(entityParameterObj)
          : null;
      if (!bindingDetails) {
        log.warn(
          `OData: skip bound action ${actionName}; EntitySet ${entitySetPath} not found in schema ${schemaNamespace}`,
        );
        return;
      }
      const { boundEntityTypeName, argName, argType } = bindingDetails;

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
      const boundEntityType = getTCByTypeNames(
        boundEntityTypeName,
        `I${boundEntityTypeName}`,
        `T${boundEntityTypeName}`,
      ) as InterfaceTypeComposer | ObjectTypeComposer | null;
      if (!boundEntityType) {
        log.warn(
          `OData: skip bound action ${actionName}; entity type ${boundEntityTypeName} not found`,
        );
        return;
      }
      boundEntityType.addFields({
        [actionName]: boundField,
      });
      const otherType = getTCByTypeNames(
        `I${boundEntityTypeName}`,
        `T${boundEntityTypeName}`,
      ) as InterfaceTypeComposer | null;
      if (otherType && otherType !== boundEntityType) {
        otherType.addFields({
          [actionName]: boundField,
        });
      }
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
      const inputType = getTCByTypeNames(typeName + 'Input') as InputTypeComposer | null;
      const abstractType = getTCByTypeNames('I' + typeName, typeName) as InterfaceTypeComposer;
      const outputType = getTCByTypeNames('T' + typeName, typeName) as ObjectTypeComposer;
      if (!outputType) {
        log.warn(`OData: skip base-type merge for missing output type ${typeName}`);
        return;
      }
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
      // MS Graph (and similar) use Alias in BaseType (`graph.entity`) while Inputs are
      // registered under buildName(); also some abstract bases may be declared later.
      const baseInputType = getTCByTypeNames(
        baseTypeName + 'Input',
        pascalCase(baseTypeRef.replace(/\./g, '_')) + 'Input',
      ) as InputTypeComposer | null;
      const baseAbstractType = getTCByTypeNames(
        'I' + baseTypeName,
        baseTypeName,
      ) as InterfaceTypeComposer;
      const baseOutputType = getTCByTypeNames(
        'T' + baseTypeName,
        baseTypeName,
      ) as ObjectTypeComposer;
      if (!baseOutputType?.getExtensions) {
        log.warn(
          `OData: skip base-type merge for ${typeName}; missing base ${baseTypeRef} (${baseTypeName})`,
        );
        return;
      }
      const {
        directives: { entityInfo: baseEntityInfo },
        eventEmitter: baseEventEmitter,
      } = baseOutputType.getExtensions() as any as EntityTypeExtensions;
      if (!baseEntityInfo || !baseEventEmitter) {
        log.warn(
          `OData: skip base-type merge for ${typeName}; base ${baseTypeName} has no entityInfo`,
        );
        return;
      }
      const baseEventEmitterListener = () => {
        if (inputType && baseInputType?.getFields) {
          inputType.addFields(baseInputType.getFields());
        }
        entityInfo.identifierFieldName =
          baseEntityInfo.identifierFieldName || entityInfo.identifierFieldName;
        entityInfo.identifierFieldTypeRef =
          baseEntityInfo.identifierFieldTypeRef || entityInfo.identifierFieldTypeRef;
        entityInfo.actualFields.unshift(...(baseEntityInfo.actualFields || []));
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
          InterfaceTypeComposer | ObjectTypeComposer;
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

  // GraphQL rejects empty input objects (MS Graph has entity/complex types with no
  // creatable properties). Keep a placeholder so composition can succeed.
  for (const tc of schemaComposer.types.values()) {
    // graphql-compose InputTypeComposer (avoid relying on SchemaComposer.isInputType).
    if ((tc as any)?.constructor?.name !== 'InputTypeComposer') {
      continue;
    }
    const inputTC = tc as InputTypeComposer;
    if (inputTC.getFieldNames().length === 0) {
      inputTC.addFields({
        _empty: {
          type: 'Boolean',
          description: 'Placeholder — upstream OData type has no input fields',
        },
      });
    }
  }

  // Federation Connectors surface — Hive runs via transport-rest (+ odata.metadata $select).
  const connectMeta = emitODataConnectors(schemaComposer, {
    name,
    endpoint,
    operationHeaders:
      typeof operationHeaders === 'object' && operationHeaders ? operationHeaders : undefined,
  });

  const schema = schemaComposer.buildSchema();
  applyODataConnectSchemaExtensions(
    schema,
    connectMeta,
    name,
    endpoint,
    typeof operationHeaders === 'object' && operationHeaders ? operationHeaders : undefined,
  );
  // Preserve batch / expand hints (legacy transport options; Connectors ignore these).
  const schemaExtensions: any = (schema.extensions ||= {});
  const directiveExtensions = (schemaExtensions.directives ||= {});
  if (directiveExtensions.transport && typeof directiveExtensions.transport === 'object') {
    directiveExtensions.transport.options = {
      batch,
      expandNavProps,
    };
  }
  eventEmitterSet.forEach(ee => ee.removeAllListeners());
  eventEmitterSet.clear();

  return schema;
}

export async function loadGraphQLSchemaFromOData(
  name: string,
  opts: LoadGraphQLSchemaFromODataOpts,
) {
  let schema = await loadNonExecutableGraphQLSchemaFromOData(name, opts);
  const { processDirectives: processConnectDirectives } =
    await import('@graphql-mesh/transport-rest');
  schema = processConnectDirectives(schema, {
    globalFetch: opts.fetchFn,
    log: opts.log,
  });
  // Bound ops / nav lazy-fetch / `@odata.type` resolveType
  return processODataResidualDirectives({
    schema,
    fetchFn: opts.fetchFn,
  });
}

export { processODataResidualDirectives };
export { processDirectives } from '@graphql-mesh/transport-rest';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<RESTTransportOptions> = opts => {
  return transportRest.getSubgraphExecutor(opts);
};

export function loadODataSubgraph(
  name: string,
  options: Omit<LoadGraphQLSchemaFromODataOpts, 'log' | 'fetchFn' | 'baseDir' | 'importFn'>,
) {
  return (ctx: { fetch: MeshFetch; cwd: string; log: Logger }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromOData(name, {
      ...options,
      importFn: defaultImportFn,
      log: ctx.log,
      fetchFn: ctx.fetch,
      baseDir: ctx.cwd,
    }),
  });
}
