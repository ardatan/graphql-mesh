import {
  getNamedType,
  getNullableType,
  isInterfaceType,
  isListType,
  isObjectType,
  isUnionType,
  Kind,
  parseValue,
  print,
  valueFromASTUntyped,
  type GraphQLNamedType,
  type GraphQLSchema,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  cloneSubschemaConfig,
  type MergedFieldConfig,
  type MergedTypeConfig,
  type MergedTypeEntryPoint,
  type SubschemaConfig,
} from '@graphql-tools/delegate';
import {
  getDirective,
  getImplementingTypes,
  MapperKind,
  mapSchema,
  mergeDeep,
  parseSelectionSet,
} from '@graphql-tools/utils';
import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions.js';
import { parseMergeArgsExpr } from './parseMergeArgsExpr.js';
import { addProperty, getProperties, getProperty } from './properties.js';
import { type MergedTypeResolverInfo, type StitchingDirectivesOptions } from './types.js';

export function stitchingDirectivesTransformer(
  options: StitchingDirectivesOptions = {},
): (subschemaConfig: SubschemaConfig) => SubschemaConfig {
  const {
    keyDirectiveName,
    computedDirectiveName,
    mergeDirectiveName,
    canonicalDirectiveName,
    pathToDirectivesInExtensions,
  } = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  return (subschemaConfig: SubschemaConfig): SubschemaConfig => {
    const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);

    const selectionSetsByType: Record<string, SelectionSetNode> = Object.create(null);
    const computedFieldSelectionSets: Record<
      string,
      Record<string, SelectionSetNode>
    > = Object.create(null);
    /** Fields that received `@computed`; programmatic selectionSet deps must not flip `computed`. */
    const computedDirectiveFields: Record<string, Set<string>> = Object.create(null);
    const mergedTypesResolversInfo: Record<string, MergedTypeResolverInfo> = Object.create(null);
    const canonicalTypesInfo: Record<
      string,
      { canonical?: boolean; fields?: Record<string, boolean> }
    > = Object.create(null);
    const selectionSetsByTypeAndEntryField: Record<
      string,
      Record<string, SelectionSetNode>
    > = Object.create(null);
    const mergedTypesResolversInfoByEntryField: Record<
      string,
      Record<string, MergedTypeResolverInfo>
    > = Object.create(null);

    const schema = subschemaConfig.schema;

    function setCanonicalDefinition(typeName: string, fieldName?: string): void {
      canonicalTypesInfo[typeName] = canonicalTypesInfo[typeName] || Object.create(null);
      if (fieldName) {
        const fields: Record<string, boolean> =
          canonicalTypesInfo[typeName]?.fields ?? Object.create(null);
        canonicalTypesInfo[typeName]!.fields = fields;
        fields[fieldName] = true;
      } else {
        canonicalTypesInfo[typeName]!.canonical = true;
      }
    }

    mapSchema(schema, {
      [MapperKind.OBJECT_TYPE]: type => {
        const keyDirective = getDirective(
          schema,
          type,
          keyDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];
        if (keyDirective != null) {
          const selectionSet = parseSelectionSet(keyDirective.selectionSet, {
            noLocation: true,
          });
          selectionSetsByType[type.name] = selectionSet;
        }

        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];
        if (canonicalDirective != null) {
          setCanonicalDefinition(type.name);
        }
        return undefined;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const computedDirective = getDirective(
          schema,
          fieldConfig,
          computedDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];
        if (computedDirective != null) {
          const selectionSet = parseSelectionSet(computedDirective.selectionSet, {
            noLocation: true,
          });
          if (!computedFieldSelectionSets[typeName]) {
            computedFieldSelectionSets[typeName] = Object.create(null);
          }
          computedFieldSelectionSets[typeName]![fieldName] = selectionSet;
          (computedDirectiveFields[typeName] ||= new Set()).add(fieldName);
        }

        const mergeDirective = getDirective(
          schema,
          fieldConfig,
          mergeDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];
        if (mergeDirective?.keyField != null) {
          const mergeDirectiveKeyField = mergeDirective.keyField;
          const selectionSet = parseSelectionSet(
            selectionSetFromDottedKeyField(mergeDirectiveKeyField),
            {
              noLocation: true,
            },
          );

          const typeNames: Array<string> = mergeDirective.types;

          const returnType = getNamedType(fieldConfig.type);

          forEachConcreteType(schema, returnType, typeNames, typeName => {
            if (typeNames == null || typeNames.includes(typeName)) {
              let existingEntryFieldMap = selectionSetsByTypeAndEntryField[typeName]!;
              if (existingEntryFieldMap == null) {
                existingEntryFieldMap = Object.create(null);
                selectionSetsByTypeAndEntryField[typeName] = existingEntryFieldMap;
              }
              let existingSelectionSet = existingEntryFieldMap[fieldName];
              if (existingSelectionSet == null) {
                existingSelectionSet = selectionSetsByType[typeName];
              }
              existingEntryFieldMap[fieldName] = existingSelectionSet
                ? mergeSelectionSets(existingSelectionSet, selectionSet)
                : selectionSet;
            }
          });
        }

        const canonicalDirective = getDirective(
          schema,
          fieldConfig,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];
        if (canonicalDirective != null) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.INTERFACE_TYPE]: type => {
        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const canonicalDirective = getDirective(
          schema,
          fieldConfig,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.INPUT_OBJECT_TYPE]: type => {
        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName, typeName) => {
        const canonicalDirective = getDirective(
          schema,
          inputFieldConfig,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective != null) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.UNION_TYPE]: type => {
        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective != null) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.ENUM_TYPE]: type => {
        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective != null) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.SCALAR_TYPE]: type => {
        const canonicalDirective = getDirective(
          schema,
          type,
          canonicalDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (canonicalDirective != null) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
    });

    if (subschemaConfig.merge) {
      for (const typeName in subschemaConfig.merge) {
        const mergedTypeConfig = subschemaConfig.merge[typeName];
        if (mergedTypeConfig?.selectionSet) {
          const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, {
            noLocation: true,
          });
          if (selectionSet) {
            if (selectionSetsByType[typeName]) {
              selectionSetsByType[typeName] = mergeSelectionSets(
                selectionSetsByType[typeName],
                selectionSet,
              );
            } else {
              selectionSetsByType[typeName] = selectionSet;
            }
          }
        }
        if (mergedTypeConfig?.fields) {
          for (const fieldName in mergedTypeConfig.fields) {
            const fieldConfig = mergedTypeConfig.fields[fieldName];
            if (!fieldConfig?.selectionSet) continue;

            const selectionSet = parseSelectionSet(fieldConfig.selectionSet, {
              noLocation: true,
            });
            if (selectionSet) {
              if (computedFieldSelectionSets[typeName]?.[fieldName]) {
                computedFieldSelectionSets[typeName][fieldName] = mergeSelectionSets(
                  computedFieldSelectionSets[typeName][fieldName],
                  selectionSet,
                );
              } else {
                if (computedFieldSelectionSets[typeName] == null) {
                  computedFieldSelectionSets[typeName] = Object.create(null);
                }
                computedFieldSelectionSets[typeName]![fieldName] = selectionSet;
              }
            }
          }
        }
      }
    }

    const allSelectionSetsByType: Record<string, Array<SelectionSetNode>> = Object.create(null);

    for (const typeName in selectionSetsByType) {
      allSelectionSetsByType[typeName] = allSelectionSetsByType[typeName] || [];
      const selectionSet = selectionSetsByType[typeName]!;
      allSelectionSetsByType[typeName].push(selectionSet);
    }

    for (const typeName in computedFieldSelectionSets) {
      const selectionSets = computedFieldSelectionSets[typeName];
      for (const i in selectionSets) {
        allSelectionSetsByType[typeName] = allSelectionSetsByType[typeName] || [];
        const selectionSet = selectionSets[i]!;
        allSelectionSetsByType[typeName].push(selectionSet);
      }
    }

    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: function objectFieldMapper(fieldConfig, fieldName) {
        const mergeDirective = getDirective(
          schema,
          fieldConfig,
          mergeDirectiveName,
          pathToDirectivesInExtensions,
        )?.[0];

        if (mergeDirective != null) {
          const returnType = getNullableType(fieldConfig.type);
          const returnsList = isListType(returnType);
          const namedType = getNamedType(returnType);

          let mergeArgsExpr: string = mergeDirective.argsExpr;

          if (mergeArgsExpr == null) {
            const key: Array<string> = mergeDirective.key;
            const keyField: string = mergeDirective.keyField;
            const keyExpr =
              key != null ? buildKeyExpr(key) : keyField != null ? `$key.${keyField}` : '$key';

            const keyArg: string = mergeDirective.keyArg;
            const argNames =
              keyArg == null ? [Object.keys(fieldConfig.args ?? {})[0]] : keyArg.split('.');

            const lastArgName = argNames.pop();
            mergeArgsExpr = returnsList
              ? `${lastArgName}: [[${keyExpr}]]`
              : `${lastArgName}: ${keyExpr}`;

            for (const argName of argNames.reverse()) {
              mergeArgsExpr = `${argName}: { ${mergeArgsExpr} }`;
            }
          }

          const typeNames: Array<string> = mergeDirective.types;

          forEachConcreteTypeName(
            namedType,
            schema,
            typeNames,
            function generateResolveInfo(typeName) {
              const mergedSelectionSets: SelectionSetNode[] = [];
              if (allSelectionSetsByType[typeName]) {
                mergedSelectionSets.push(...allSelectionSetsByType[typeName]);
              }
              if (selectionSetsByTypeAndEntryField[typeName]?.[fieldName]) {
                mergedSelectionSets.push(selectionSetsByTypeAndEntryField[typeName][fieldName]);
              }
              const parsedMergeArgsExpr = parseMergeArgsExpr(
                mergeArgsExpr,
                mergedSelectionSets.length === 0
                  ? undefined
                  : mergeSelectionSets(...mergedSelectionSets),
              );

              const additionalArgs = mergeDirective.additionalArgs;
              if (additionalArgs != null) {
                parsedMergeArgsExpr.args = mergeDeep([
                  parsedMergeArgsExpr.args,
                  valueFromASTUntyped(parseValue(`{ ${additionalArgs} }`, { noLocation: true })),
                ]);
              }

              if (selectionSetsByTypeAndEntryField[typeName]?.[fieldName] != null) {
                const typeConfigByField = (mergedTypesResolversInfoByEntryField[typeName] ||=
                  Object.create(null));
                typeConfigByField[fieldName] = {
                  fieldName,
                  returnsList,
                  ...parsedMergeArgsExpr,
                };
              } else {
                mergedTypesResolversInfo[typeName] = {
                  fieldName,
                  returnsList,
                  ...parsedMergeArgsExpr,
                };
              }
            },
          );
        }

        return undefined;
      },
    });

    for (const typeName in selectionSetsByType) {
      const selectionSet = selectionSetsByType[typeName]!;
      const mergeConfig: Record<
        string,
        MergedTypeConfig<any, any, any>
      > = newSubschemaConfig.merge ?? Object.create(null);
      newSubschemaConfig.merge = mergeConfig;

      if (mergeConfig[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = mergeConfig[typeName];

      mergeTypeConfig!.selectionSet = print(selectionSet);
    }

    for (const typeName in computedFieldSelectionSets) {
      const selectionSets = computedFieldSelectionSets[typeName];
      const mergeConfig: Record<
        string,
        MergedTypeConfig<any, any, any>
      > = newSubschemaConfig.merge ?? Object.create(null);
      newSubschemaConfig.merge = mergeConfig;

      if (mergeConfig[typeName] == null) {
        mergeConfig[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];
      const mergeTypeConfigFields: Record<string, MergedFieldConfig> =
        mergeTypeConfig!.fields ?? Object.create(null);
      mergeTypeConfig!.fields = mergeTypeConfigFields;

      for (const fieldName in selectionSets) {
        const selectionSet = selectionSets[fieldName]!;
        const fieldConfig: MergedFieldConfig =
          mergeTypeConfigFields[fieldName] ?? Object.create(null);
        mergeTypeConfigFields[fieldName] = fieldConfig;

        fieldConfig.selectionSet = print(selectionSet);
        if (computedDirectiveFields[typeName]?.has(fieldName)) {
          fieldConfig.computed = true;
        }
      }
    }

    for (const typeName in mergedTypesResolversInfo) {
      const mergedTypeResolverInfo = mergedTypesResolversInfo[typeName]!;

      const mergeConfig: Record<
        string,
        MergedTypeConfig<any, any, any>
      > = newSubschemaConfig.merge ?? Object.create(null);
      newSubschemaConfig.merge = mergeConfig;

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName]!;

      mergeTypeConfig.fieldName = mergedTypeResolverInfo.fieldName;

      if (mergedTypeResolverInfo.returnsList) {
        mergeTypeConfig.key = generateKeyFn(mergedTypeResolverInfo);
        mergeTypeConfig.argsFromKeys = generateArgsFromKeysFn(mergedTypeResolverInfo);
        delete mergeTypeConfig.args;
      } else {
        mergeTypeConfig.args = generateArgsFn(mergedTypeResolverInfo);
        // Replacing a batch lookup with a singleton must drop stale batch callbacks.
        delete mergeTypeConfig.key;
        delete mergeTypeConfig.argsFromKeys;
      }
    }

    for (const typeName in canonicalTypesInfo) {
      const canonicalTypeInfo = canonicalTypesInfo[typeName]!;
      const mergeConfig: Record<
        string,
        MergedTypeConfig<any, any, any>
      > = newSubschemaConfig.merge ?? Object.create(null);
      newSubschemaConfig.merge = mergeConfig;

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName]!;

      if (canonicalTypeInfo.canonical) {
        mergeTypeConfig.canonical = true;
      }

      if (canonicalTypeInfo.fields) {
        const mergeTypeConfigFields: Record<string, MergedFieldConfig> =
          mergeTypeConfig.fields ?? Object.create(null);
        mergeTypeConfig.fields = mergeTypeConfigFields;
        for (const fieldName in canonicalTypeInfo.fields) {
          if (mergeTypeConfigFields[fieldName] == null) {
            mergeTypeConfigFields[fieldName] = Object.create(null);
          }
          mergeTypeConfigFields[fieldName]!.canonical = true;
        }
      }
    }

    for (const typeName in mergedTypesResolversInfoByEntryField) {
      const entryPoints: MergedTypeEntryPoint[] = [];
      const existingMergeConfig = newSubschemaConfig.merge?.[typeName];
      const newMergeConfig: Record<
        string,
        MergedTypeConfig<any, any, Record<string, any>>
      > = (newSubschemaConfig.merge ||= Object.create(null));
      if (existingMergeConfig) {
        const {
          fields,
          canonical,
          entryPoints: existingEntryPoints,
          ...baseEntryPoint
        } = existingMergeConfig;
        newMergeConfig[typeName] = {
          fields,
          canonical,
          entryPoints,
        };
        // Keep existing entry points at the outer level (do not nest under baseEntryPoint).
        if (Array.isArray(existingEntryPoints) && existingEntryPoints.length) {
          entryPoints.push(...existingEntryPoints);
        } else if (Object.keys(baseEntryPoint).length > 0) {
          entryPoints.push(baseEntryPoint);
        }
      } else {
        newMergeConfig[typeName] = {
          entryPoints,
        };
      }
      for (const fieldName in mergedTypesResolversInfoByEntryField[typeName]) {
        const mergedTypeResolverInfo = mergedTypesResolversInfoByEntryField[typeName][fieldName]!;
        const entrySelection = selectionSetsByTypeAndEntryField[typeName]![fieldName]!;
        // Include type-level merge selections so the keyField guard matches argsExpr reads.
        const typeLevelSelection = selectionSetsByType[typeName];
        const selectionSetForEntry = typeLevelSelection
          ? mergeSelectionSets(typeLevelSelection, entrySelection)
          : entrySelection;
        const newEntryPoint: MergedTypeEntryPoint = {
          fieldName,
          selectionSet: print(selectionSetForEntry),
        };
        if (mergedTypeResolverInfo.returnsList) {
          newEntryPoint.key = generateKeyFn(mergedTypeResolverInfo);
          newEntryPoint.argsFromKeys = generateArgsFromKeysFn(mergedTypeResolverInfo);
        } else {
          newEntryPoint.args = generateArgsFn(mergedTypeResolverInfo);
        }
        entryPoints.push(newEntryPoint);
      }
      if (entryPoints.length === 1) {
        const [entryPoint] = entryPoints;
        const { fields, canonical } = newMergeConfig[typeName];
        newMergeConfig[typeName] = {
          ...entryPoint,
          fields,
          canonical,
        };
      }
    }

    return newSubschemaConfig;
  };
}

function forEachConcreteType(
  schema: GraphQLSchema,
  type: GraphQLNamedType,
  typeNames: Array<string>,
  fn: (typeName: string) => void,
) {
  if (isInterfaceType(type)) {
    // Also register the abstract type itself so stub members in other
    // subschemas can trigger type merging via the shared interface name
    // (graphql-tools#4966).
    if (typeNames == null || typeNames.includes(type.name)) {
      fn(type.name);
    }
    for (const typeName of getImplementingTypes(type.name, schema)) {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    }
  } else if (isUnionType(type)) {
    if (typeNames == null || typeNames.includes(type.name)) {
      fn(type.name);
    }
    for (const { name: typeName } of type.getTypes()) {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    }
  } else if (isObjectType(type)) {
    fn(type.name);
  }
}

function generateKeyFn(
  mergedTypeResolverInfo: MergedTypeResolverInfo,
): (originalResult: any) => any {
  return function keyFn(originalResult: any) {
    return getProperties(originalResult, mergedTypeResolverInfo.usedProperties);
  };
}

function deepCloneArgs(args: Record<string, any>): Record<string, any> {
  return args == null ? Object.create(null) : JSON.parse(JSON.stringify(args));
}

function generateArgsFromKeysFn(
  mergedTypeResolverInfo: MergedTypeResolverInfo,
): (keys: ReadonlyArray<any>) => Record<string, any> {
  const { expansions, args } = mergedTypeResolverInfo;
  return function generateArgsFromKeys(keys: ReadonlyArray<any>): Record<string, any> {
    // Isolate nested containers so separate resolver calls do not share mutated objects.
    const newArgs = deepCloneArgs(args);
    if (expansions) {
      for (const expansion of expansions) {
        const mappingInstructions = expansion.mappingInstructions;
        const expanded: Array<any> = [];
        for (const key of keys) {
          // Start from the parsed template so static fields (e.g. scope) are preserved.
          // Root expansions (`[[$key.id]]`) replace the whole value when destinationPath is empty.
          let newValue =
            expansion.value != null && typeof expansion.value === 'object'
              ? JSON.parse(JSON.stringify(expansion.value))
              : Object.create(null);
          for (const { destinationPath, sourcePath } of mappingInstructions) {
            if (destinationPath.length) {
              addProperty(newValue, destinationPath, getProperty(key, sourcePath));
            } else {
              newValue = getProperty(key, sourcePath);
            }
          }
          expanded.push(newValue);
        }
        addProperty(newArgs, expansion.valuePath, expanded);
      }
    }
    return newArgs;
  };
}

function generateArgsFn(
  mergedTypeResolverInfo: MergedTypeResolverInfo,
): (originalResult: any) => Record<string, any> {
  const { mappingInstructions, args, usedProperties } = mergedTypeResolverInfo;

  return function generateArgs(originalResult: any): Record<string, any> {
    const newArgs = deepCloneArgs(args);
    const filteredResult = getProperties(originalResult, usedProperties);
    if (mappingInstructions) {
      for (const mappingInstruction of mappingInstructions) {
        const { destinationPath, sourcePath } = mappingInstruction;
        addProperty(newArgs, destinationPath, getProperty(filteredResult, sourcePath));
      }
    }
    return newArgs;
  };
}

/** Build `{ organization { id } }` from a dotted `keyField` such as `organization.id`. */
function selectionSetFromDottedKeyField(keyField: string): string {
  const parts = keyField.split('.').filter(Boolean);
  if (parts.length === 0) {
    return '{ }';
  }
  let inner = parts[parts.length - 1]!;
  for (let i = parts.length - 2; i >= 0; i--) {
    inner = `${parts[i]} { ${inner} }`;
  }
  return `{ ${inner} }`;
}

function buildKeyExpr(key: Array<string>): string {
  let mergedObject = {};
  for (const keyDef of key) {
    let [aliasOrKeyPath, keyPath] = keyDef.split(':') as [string, string | undefined];
    let aliasPath: string;
    if (keyPath == null) {
      keyPath = aliasPath = aliasOrKeyPath;
    } else {
      aliasPath = aliasOrKeyPath;
    }
    const aliasParts = aliasPath.split('.');
    const lastAliasPart = aliasParts.pop();
    if (lastAliasPart == null) {
      throw new Error(`Key "${key}" is invalid, no path provided.`);
    }
    let object: Record<string, unknown> = {
      [lastAliasPart]: `$key.${keyPath}`,
    };

    for (const aliasPart of aliasParts.reverse()) {
      object = { [aliasPart]: object };
    }
    mergedObject = mergeDeep([mergedObject, object]);
  }

  return JSON.stringify(mergedObject).replace(/"/g, '');
}

function mergeSelectionSets(...selectionSets: Array<SelectionSetNode>): SelectionSetNode {
  const normalizedSelections: Record<string, SelectionNode> = Object.create(null);

  for (const selectionSet of selectionSets) {
    for (const selection of selectionSet.selections) {
      const normalizedSelection = print(selection);
      normalizedSelections[normalizedSelection] = selection;
    }
  }

  const newSelectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: Object.values(normalizedSelections),
  };

  return newSelectionSet;
}

function forEachConcreteTypeName(
  returnType: GraphQLNamedType,
  schema: GraphQLSchema,
  typeNames: Array<string>,
  fn: (typeName: string) => void,
): void {
  if (isInterfaceType(returnType)) {
    // Register the abstract type as well as its implementers so that a stub
    // concrete type from another subschema can still merge through the
    // shared interface/union name (graphql-tools#4966).
    if (typeNames == null || typeNames.includes(returnType.name)) {
      fn(returnType.name);
    }
    for (const typeName of getImplementingTypes(returnType.name, schema)) {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    }
  } else if (isUnionType(returnType)) {
    if (typeNames == null || typeNames.includes(returnType.name)) {
      fn(returnType.name);
    }
    for (const type of returnType.getTypes()) {
      if (typeNames == null || typeNames.includes(type.name)) {
        fn(type.name);
      }
    }
  } else if (
    isObjectType(returnType) &&
    (typeNames == null || typeNames.includes(returnType.name))
  ) {
    fn(returnType.name);
  }
}
