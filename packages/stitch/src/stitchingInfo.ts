import {
  getNamedType,
  isAbstractType,
  isInputObjectType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  print,
  visit,
  type FieldNode,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type SelectionSetNode,
} from 'graphql';
import {
  getVariableValues,
  type MergedTypeInfo,
  type MergedTypeResolver,
  type StitchingInfo,
  type Subschema,
  type SubschemaConfig,
} from '@graphql-tools/delegate';
import {
  collectFields,
  isSome,
  parseSelectionSet,
  type IFieldResolverOptions,
  type IResolvers,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { createDelegationPlanBuilder } from './createDelegationPlanBuilder.js';
import {
  createMergedTypeResolver,
  createMultiEntryMergedTypeResolver,
} from './createMergedTypeResolver.js';
import { type MergeTypeCandidate, type MergeTypeFilter } from './types.js';

export function createStitchingInfo<TContext extends Record<string, any> = Record<string, any>>(
  subschemaMap: Map<
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
    Subschema<any, any, any, TContext>
  >,
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>,
): StitchingInfo<TContext> {
  const mergedTypes = createMergedTypes(typeCandidates, mergeTypes);

  return {
    subschemaMap,
    fieldNodesByType: Object.create(null),
    fieldNodesByField: Object.create(null),
    dynamicSelectionSetsByField: Object.create(null),
    mergedTypes,
    localFields: new Map(),
  };
}

function createMergedTypes<TContext extends Record<string, any> = Record<string, any>>(
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>,
): Record<string, MergedTypeInfo<TContext>> {
  const mergedTypes: Record<string, MergedTypeInfo<TContext>> = Object.create(null);

  const typeInterfacesMap: Record<string, Set<string>> = Object.create(null);

  for (const typeName in typeCandidates) {
    if (typeCandidates[typeName]) {
      for (const { type } of typeCandidates[typeName]) {
        if ('getInterfaces' in type) {
          const interfaces = type.getInterfaces();
          for (const iface of interfaces) {
            const interfaceName = iface.name;
            let implementingTypes = typeInterfacesMap[typeName];
            if (implementingTypes == null) {
              implementingTypes = new Set();
              typeInterfacesMap[typeName] = implementingTypes;
            }
            implementingTypes.add(interfaceName);
          }
        }
      }
    }
  }

  for (const typeName in typeCandidates) {
    let hasOverrides = false;
    const typeCandidatesOfTypeName = typeCandidates[typeName];
    if (!typeCandidatesOfTypeName) {
      throw new Error(`Invalid type candidates for type name ${typeName}`);
    }
    const typeCandidate = typeCandidatesOfTypeName[0];
    if (
      isObjectType(typeCandidate?.type) ||
      isInterfaceType(typeCandidate?.type) ||
      isUnionType(typeCandidate?.type)
    ) {
      const typeCandidatesWithMergedTypeConfig = typeCandidatesOfTypeName.filter(
        typeCandidate =>
          typeCandidate.transformedSubschema != null &&
          typeCandidate.transformedSubschema.merge != null &&
          typeName in typeCandidate.transformedSubschema.merge,
      );

      if (
        mergeTypes === true ||
        (typeof mergeTypes === 'function' && mergeTypes(typeCandidatesOfTypeName, typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        typeCandidatesWithMergedTypeConfig.length
      ) {
        const targetSubschemas: Array<Subschema<any, any, any, TContext>> = [];

        const typeMaps: Map<
          GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
          Record<string, GraphQLNamedType>
        > = new Map();
        const supportedBySubschemas: Record<
          string,
          Array<Subschema<any, any, any, TContext>>
        > = Object.create(null);
        const selectionSets: Map<Subschema<any, any, any, TContext>, SelectionSetNode> = new Map();
        const entryPointSelectionSets: Map<
          Subschema<any, any, any, TContext>,
          SelectionSetNode[]
        > = new Map();
        const fieldSelectionSets: Map<
          Subschema<any, any, any, TContext>,
          Record<string, SelectionSetNode>
        > = new Map();
        const resolvers: Map<
          Subschema<any, any, any, TContext>,
          MergedTypeResolver<TContext>
        > = new Map();
        const providedSelectionsByField = new Map<
          Subschema<any, any, any, TContext>,
          Record<string, SelectionSetNode>
        >();

        for (const typeCandidate of typeCandidatesOfTypeName) {
          const subschema = typeCandidate.transformedSubschema;

          if (subschema == null) {
            continue;
          }

          typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());

          let mergedTypeConfig = subschema?.merge?.[typeName];

          if (!mergedTypeConfig) {
            for (const interfaceName of typeInterfacesMap[typeName] ?? []) {
              mergedTypeConfig = subschema?.merge?.[interfaceName];
              if (mergedTypeConfig) {
                break;
              }
            }
          }

          if (mergedTypeConfig == null) {
            continue;
          }

          const multiEntryPoints =
            mergedTypeConfig.entryPoints != null && mergedTypeConfig.entryPoints.length >= 2
              ? mergedTypeConfig.entryPoints
              : null;

          if (multiEntryPoints) {
            const epSels: SelectionSetNode[] = [];
            for (const ep of multiEntryPoints) {
              if (ep.selectionSet) {
                epSels.push(parseSelectionSet(ep.selectionSet, { noLocation: true }));
              }
            }
            if (epSels.length) {
              entryPointSelectionSets.set(subschema, epSels);
            }
          } else if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, {
              noLocation: true,
            });
            selectionSets.set(subschema, selectionSet);
          }

          if (mergedTypeConfig.fields) {
            const parsedFieldSelectionSets = Object.create(null);
            for (const fieldName in mergedTypeConfig.fields) {
              if (mergedTypeConfig.fields[fieldName]?.override) {
                hasOverrides = true;
              }
              if (mergedTypeConfig.fields[fieldName]?.selectionSet) {
                const rawFieldSelectionSet = mergedTypeConfig.fields[fieldName].selectionSet;
                parsedFieldSelectionSets[fieldName] = rawFieldSelectionSet
                  ? parseSelectionSet(rawFieldSelectionSet, {
                      noLocation: true,
                    })
                  : undefined;
              }
              let providedSelectionSet = mergedTypeConfig.fields[fieldName]?.provides;
              if (providedSelectionSet) {
                providedSelectionSet = visit(providedSelectionSet, {
                  [Kind.SELECTION_SET](node) {
                    const typeNameField = node.selections.find(
                      selection =>
                        selection.kind === Kind.FIELD && selection.name.value === '__typename',
                    );
                    if (typeNameField) {
                      return node;
                    }
                    return {
                      ...node,
                      selections: [
                        ...node.selections,
                        {
                          kind: Kind.FIELD,
                          name: {
                            kind: Kind.NAME,
                            value: '__typename',
                          },
                        },
                      ],
                    };
                  },
                });
                let providedSelectionsForSubschema = providedSelectionsByField.get(subschema);
                if (providedSelectionsForSubschema == null) {
                  providedSelectionsForSubschema = Object.create({}) as Record<
                    string,
                    SelectionSetNode
                  >;
                  providedSelectionsByField.set(subschema, providedSelectionsForSubschema);
                }
                providedSelectionsForSubschema[fieldName] = providedSelectionSet;
              }
            }
            fieldSelectionSets.set(subschema, parsedFieldSelectionSets);
          }

          // Object, interface, or union (unions have no fields of their own)
          const type = subschema.transformedSchema.getType(typeName) as
            GraphQLObjectType | GraphQLInterfaceType;

          const resolver =
            mergedTypeConfig.resolve ??
            (multiEntryPoints
              ? createMultiEntryMergedTypeResolver(mergedTypeConfig, type)
              : createMergedTypeResolver(mergedTypeConfig, type));

          if (resolver == null) {
            continue;
          }

          // Multi-entry resolvers pick the key themselves; only wrap single-key.
          const keyFn = multiEntryPoints ? undefined : mergedTypeConfig.key;
          resolvers.set(
            subschema,
            keyFn
              ? function batchMergedTypeResolverWrapper(
                  originalResult,
                  context,
                  info,
                  subschema,
                  selectionSet,
                  keyOrType,
                  type,
                  skipTypeMerging,
                ) {
                  return handleMaybePromise(
                    () => keyFn(originalResult),
                    key =>
                      resolver(
                        originalResult,
                        context,
                        info,
                        subschema,
                        selectionSet,
                        key,
                        keyOrType ?? type,
                        skipTypeMerging,
                      ),
                  );
                }
              : resolver,
          );

          targetSubschemas.push(subschema);

          // Unions have no fields; field ownership is resolved later via
          // inline fragments on concrete members during delegation planning.
          if (isObjectType(type) || isInterfaceType(type)) {
            const fieldMap = type.getFields();
            // Single-key: skip key leaves (they arrive with the representation).
            // Multi-entry: a field may be a key on one entry and a value on
            // another (e.g. Product.id via upc-key), so only skip leaves that
            // appear in *every* entry's selectionSet.
            const keySelectionSets =
              entryPointSelectionSets.get(subschema) ??
              (selectionSets.has(subschema) ? [selectionSets.get(subschema)!] : []);
            for (const fieldName in fieldMap) {
              const field = fieldMap[fieldName];
              const fieldType = getNamedType(field?.type);
              if (
                isLeafType(fieldType) &&
                keySelectionSets.length > 0 &&
                keySelectionSets.every(selectionSet =>
                  selectionSetContainsTopLevelField(selectionSet, fieldName),
                )
              ) {
                continue;
              }
              if (!supportedBySubschemas[fieldName]) {
                supportedBySubschemas[fieldName] = [];
              }
              supportedBySubschemas[fieldName]?.push(subschema);
            }
          }
        }

        const sourceSubschemas = typeCandidates[typeName]
          ?.map(typeCandidate => typeCandidate?.transformedSubschema)
          .filter(isSome);
        const targetSubschemasBySubschema: Map<
          Subschema<any, any, any, TContext>,
          Array<Subschema<any, any, any, TContext>>
        > = new Map();
        if (sourceSubschemas) {
          for (const subschema of sourceSubschemas) {
            // Subschemas that own computed / field-@requires / @fromContext
            // fields must be allowed as their own merge target so those
            // fields can re-enter after ancestor deps land (same subgraph).
            const mergeFields = subschema.merge?.[typeName]?.fields;
            let ownsComputedOrRequires = false;
            if (mergeFields) {
              for (const fieldName in mergeFields) {
                const fieldMerge = mergeFields[fieldName];
                if (
                  fieldMerge?.computed ||
                  fieldMerge?.selectionSet ||
                  (fieldMerge?.contextArguments?.length ?? 0) > 0
                ) {
                  ownsComputedOrRequires = true;
                  break;
                }
              }
            }
            if (!ownsComputedOrRequires) {
              const selectionSetFieldMap = fieldSelectionSets.get(subschema);
              ownsComputedOrRequires =
                selectionSetFieldMap != null && Object.keys(selectionSetFieldMap).length > 0;
            }
            const filteredSubschemas = ownsComputedOrRequires
              ? targetSubschemas
              : targetSubschemas.filter(s => s !== subschema);
            if (filteredSubschemas.length) {
              targetSubschemasBySubschema.set(subschema, filteredSubschemas);
            }
          }
        }

        const mergedTypeConfig = {
          typeName,
          targetSubschemas: targetSubschemasBySubschema,
          typeMaps,
          selectionSets,
          entryPointSelectionSets,
          fieldSelectionSets,
          uniqueFields: Object.create({}),
          nonUniqueFields: Object.create({}),
          resolvers,
          providedSelectionsByField,
        } as MergedTypeInfo<TContext>;

        mergedTypes[typeName] = mergedTypeConfig;

        mergedTypeConfig.delegationPlanBuilder = createDelegationPlanBuilder(
          mergedTypeConfig as MergedTypeInfo,
        );

        if (hasOverrides) {
          mergedTypeConfig.delegationPlanBuilder =
            mergedTypeConfig.nonMemoizedDelegationPlanBuilder;
        }

        // TODO: Workaround - Find a better way later

        for (const fieldName in supportedBySubschemas) {
          if (
            supportedBySubschemas[fieldName]?.length === 1 &&
            supportedBySubschemas[fieldName][0]
          ) {
            mergedTypeConfig.uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
          } else if (supportedBySubschemas[fieldName]) {
            mergedTypeConfig.nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
          }
        }
      }
    }
  }

  return mergedTypes;
}

export function completeStitchingInfo<TContext = Record<string, any>>(
  stitchingInfo: StitchingInfo<TContext>,
  resolvers: IResolvers,
  schema: GraphQLSchema,
): StitchingInfo<TContext> {
  const { fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField, mergedTypes } =
    stitchingInfo;

  // must add __typename to query and mutation root types to handle type merging with nested root types
  // cannot add __typename to subscription root types, but they cannot be nested
  const rootTypes = [schema.getQueryType(), schema.getMutationType()];
  for (const rootType of rootTypes) {
    if (rootType) {
      // Only if it has nested root types
      const rootTypeFields = rootType.getFields();
      fieldloop: for (const fieldName in rootTypeFields) {
        const field = rootTypeFields[fieldName];
        if (field != null) {
          const fieldType = getNamedType(field.type);
          if (rootType.name === fieldType.name) {
            fieldNodesByType[rootType.name] ||= [
              parseSelectionSet('{ __typename }', { noLocation: true }).selections[0] as FieldNode,
            ];
            break fieldloop;
          }
        }
      }
    }
  }

  // Keyless (zero-arg) merges have no selectionSet that would keep a delegated
  // selection non-empty when all requested fields live on other subschemas.
  // Inject __typename so finalizeGatewayRequest keeps a stub object that type
  // merging can fill — same idea as nested root types (#2347 / graphql-tools#4337).
  const typenameFieldNode = parseSelectionSet('{ __typename }', {
    noLocation: true,
  }).selections[0] as FieldNode;
  for (const typeName in mergedTypes) {
    const mergedTypeInfo = mergedTypes[typeName];
    if (
      mergedTypeInfo == null ||
      mergedTypeInfo.resolvers.size === 0 ||
      mergedTypeInfo.selectionSets.size > 0 ||
      (mergedTypeInfo.entryPointSelectionSets?.size ?? 0) > 0
    ) {
      continue;
    }
    const existing = fieldNodesByType[typeName];
    if (existing == null) {
      fieldNodesByType[typeName] = [typenameFieldNode];
    } else if (!existing.some(fieldNode => fieldNode.name.value === '__typename')) {
      existing.push(typenameFieldNode);
    }
  }

  const selectionSetsByField: Record<
    string,
    Record<string, Array<SelectionSetNode>>
  > = Object.create(null);
  for (const typeName in mergedTypes) {
    const mergedTypeInfo = mergedTypes[typeName];
    if (
      mergedTypeInfo?.selectionSets == null &&
      mergedTypeInfo?.entryPointSelectionSets == null &&
      mergedTypeInfo?.fieldSelectionSets == null
    ) {
      continue;
    }

    const applyKeySelectionSet = (
      subschemaConfig: Subschema<any, any, any, TContext>,
      selectionSet: SelectionSetNode,
    ) => {
      const schema = subschemaConfig.transformedSchema;
      const type = schema.getType(typeName);
      if (type == null) {
        return;
      }
      if (isObjectType(type) || isInterfaceType(type)) {
        const fields = type.getFields();
        for (const fieldName in fields) {
          const field = fields[fieldName];
          const fieldType = getNamedType(field?.type);
          if (
            selectionSet &&
            isLeafType(fieldType) &&
            selectionSetContainsTopLevelField(selectionSet, fieldName)
          ) {
            continue;
          }
          updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
        }
      }
      if (isAbstractType(type)) {
        updateSelectionSetMap(selectionSetsByField, typeName, '__typename', selectionSet);
      }
    };

    for (const [subschemaConfig, selectionSet] of mergedTypeInfo.selectionSets) {
      applyKeySelectionSet(subschemaConfig, selectionSet);
    }

    if (mergedTypeInfo.entryPointSelectionSets) {
      for (const [subschemaConfig, selectionSets] of mergedTypeInfo.entryPointSelectionSets) {
        for (const selectionSet of selectionSets) {
          applyKeySelectionSet(subschemaConfig, selectionSet);
        }
      }
    }

    for (const [, selectionSetFieldMap] of mergedTypeInfo.fieldSelectionSets) {
      for (const fieldName in selectionSetFieldMap) {
        const selectionSet = selectionSetFieldMap[fieldName];
        if (selectionSet) {
          updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
        }
      }
    }
  }

  for (const typeName in resolvers) {
    const type = schema.getType(typeName);
    if (type === undefined || isLeafType(type) || isInputObjectType(type) || isUnionType(type)) {
      continue;
    }
    const resolver = resolvers[typeName] as any;
    for (const fieldName in resolver) {
      const field = resolver[fieldName] as IFieldResolverOptions;
      if (typeof field.selectionSet === 'function') {
        if (!dynamicSelectionSetsByField[typeName]) {
          dynamicSelectionSetsByField[typeName] = Object.create(null);
        }

        if (!dynamicSelectionSetsByField[typeName]![fieldName]) {
          dynamicSelectionSetsByField[typeName]![fieldName] = [];
        }

        dynamicSelectionSetsByField[typeName]![fieldName].push(field.selectionSet);
      } else if (field.selectionSet) {
        const selectionSet = parseSelectionSet(field.selectionSet, {
          noLocation: true,
        });
        updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet);
      }
    }
  }

  const variableValues = getVariableValues(undefined);
  const fragments = Object.create(null);

  const fieldNodeMap: Record<string, FieldNode> = Object.create(null);

  for (const typeName in selectionSetsByField) {
    const type = schema.getType(typeName) as GraphQLObjectType;
    // fields selected through an implementation (`... on Impl { field }`) need
    // the dependencies declared on the interface too, like @requires on an @interfaceObject
    const typeNames = isInterfaceType(type)
      ? [typeName, ...schema.getPossibleTypes(type).map(t => t.name)]
      : [typeName];
    for (const fieldName in selectionSetsByField[typeName]) {
      for (const selectionSet of selectionSetsByField[typeName]![fieldName]!) {
        const { fields } = collectFields(schema, fragments, variableValues, type, selectionSet);

        for (const [, fieldNodes] of fields) {
          for (const fieldNode of fieldNodes) {
            const key = print(fieldNode);
            fieldNodeMap[key] ??= fieldNode;
            for (const name of typeNames) {
              updateArrayMap(fieldNodesByField, name, fieldName, fieldNodeMap[key]);
            }
          }
        }
      }
    }
  }

  return stitchingInfo;
}

function updateSelectionSetMap(
  map: Record<string, Record<string, Array<SelectionSetNode>>>,
  typeName: string,
  fieldName: string,
  selectionSet: SelectionSetNode,
  includeTypename?: boolean,
): void {
  if (includeTypename) {
    const typenameSelectionSet = parseSelectionSet('{ __typename }', {
      noLocation: true,
    });
    updateArrayMap(map, typeName, fieldName, selectionSet, typenameSelectionSet);
    return;
  }

  updateArrayMap(map, typeName, fieldName, selectionSet);
}

function updateArrayMap<T>(
  map: Record<string, Record<string, Array<T>>>,
  typeName: string,
  fieldName: string,
  value: T,
  initialValue?: T,
): void {
  if (map[typeName] == null) {
    const initialItems = initialValue === undefined ? [value] : [initialValue, value];
    map[typeName] = Object.create(null);
    map[typeName][fieldName] = initialItems;
  } else if (map[typeName][fieldName] == null) {
    const initialItems = initialValue === undefined ? [value] : [initialValue, value];
    map[typeName][fieldName] = initialItems;
  } else {
    map[typeName][fieldName].push(value);
  }
}

export function addStitchingInfo<TContext = Record<string, any>>(
  stitchedSchema: GraphQLSchema,
  stitchingInfo: StitchingInfo<TContext>,
) {
  stitchedSchema.extensions = {
    ...stitchedSchema.extensions,
    stitchingInfo,
  };
}

export function selectionSetContainsTopLevelField(
  selectionSet: SelectionSetNode,
  fieldName: string,
) {
  return selectionSet.selections.some(
    selection => selection.kind === Kind.FIELD && selection.name.value === fieldName,
  );
}
