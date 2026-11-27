import type {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
} from 'graphql';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLSchema,
  GraphQLString,
  isInterfaceType,
  isObjectType,
  isOutputType,
  Kind,
  parse,
  parseType,
  print,
  typeFromAST,
  visit,
} from 'graphql';
import { type YamlConfig } from '@graphql-mesh/types';
import { resolveLookupKeyField } from '@graphql-mesh/utils';
import type { MergedTypeConfig, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import {
  astFromField,
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type TypeSource,
} from '@graphql-tools/utils';
import {
  HoistField,
  PruneSchema,
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFieldArguments,
  RenameObjectFields,
  RenameTypes,
  TransformEnumValues,
} from '@graphql-tools/wrap';
import { compareSubgraphNames, type getOnSubgraphExecute, type TransportEntry } from '../utils.js';

export interface HandleFederationSubschemaOpts {
  subschemaConfig: SubschemaConfig & { endpoint?: string };
  unifiedGraphDirectives?: Record<string, any>;
  realSubgraphNameMap?: Map<string, string>;
  additionalTypeDefs: TypeSource[];
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
  onSubgraphExecute: ReturnType<typeof getOnSubgraphExecute>;
}

function isMeshSourceSpecUrl(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  // Current core `@link` plus the older Mesh source `@link` still seen on
  // existing supergraphs. Unpublished intermediate prefixes are not accepted.
  return (
    url === 'https://the-guild.dev/graphql/mesh/spec/v1.0' ||
    url.startsWith('https://the-guild.dev/graphql/mesh/spec/') ||
    url.startsWith('https://specs.graphql-mesh.dev/core/')
  );
}

function getMeshSourceDirectiveName(schemaExtensions: Record<string, any>): string | undefined {
  // Find Mesh source directive name from schema extensions
  const linkDirectives = schemaExtensions?.directives?.link;
  if (linkDirectives) {
    for (const linkDirective of linkDirectives) {
      if (isMeshSourceSpecUrl(linkDirective.url)) {
        for (const importInfo of linkDirective.import || []) {
          if (importInfo === '@source') {
            return 'source';
          } else if (importInfo.name === '@source') {
            const alias = importInfo.as;
            if (typeof alias === 'string') {
              return alias.startsWith('@') ? alias.slice(1) : undefined;
            }
            return undefined;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * After Mesh Compose rewrites to `join__directive` (no subgraph arg), federation
 * extract reconstitutes native apps onto a subgraph-scoped schema - missing
 * subgraph means "this subgraph".
 */
function directiveTargetsSubgraph(
  directive: { subgraph?: string } | null | undefined,
  subgraphName: string,
): boolean {
  if (directive == null) {
    return false;
  }
  if (directive.subgraph == null || directive.subgraph === '') {
    return true;
  }
  return compareSubgraphNames(directive.subgraph, subgraphName);
}

function getMeshSourceDirectives(
  directives: Record<string, any> | undefined,
  meshSourceDirectiveName: string | undefined,
): SourceDirective[] | undefined {
  if (meshSourceDirectiveName && directives?.[meshSourceDirectiveName]?.length) {
    return directives[meshSourceDirectiveName] as SourceDirective[];
  }
  return (directives?.meshSource || directives?.source) as SourceDirective[] | undefined;
}

interface SourceDirective {
  subgraph?: string;
  name?: string;
  type?: string;
}

export function handleFederationSubschema({
  subschemaConfig,
  unifiedGraphDirectives,
  realSubgraphNameMap,
  additionalTypeDefs,
  stitchingDirectivesTransformer,
  onSubgraphExecute,
}: HandleFederationSubschemaOpts) {
  // Fix name
  const subgraphName =
    (subschemaConfig.name =
      realSubgraphNameMap?.get(subschemaConfig.name || '') || subschemaConfig.name) || '';
  const subgraphDirectives = getDirectiveExtensions<{
    transport: TransportEntry;
    [key: string]: any;
  }>(subschemaConfig.schema);

  // We need to add subgraph specific directives from supergraph to the subgraph schema
  // So the executor can use it
  const directivesToLook = unifiedGraphDirectives || subgraphDirectives;
  for (const directiveName in directivesToLook) {
    if (
      !subgraphDirectives[directiveName]?.length &&
      unifiedGraphDirectives?.[directiveName]?.length
    ) {
      const directives = unifiedGraphDirectives[directiveName];
      for (const directive of directives) {
        if (directive.subgraph && directive.subgraph !== subgraphName) {
          continue;
        }
        subgraphDirectives[directiveName] ||= [];
        subgraphDirectives[directiveName].push(directive);
      }
    }
  }
  const subgraphExtensions: Record<string, unknown> = (subschemaConfig.schema.extensions ||= {});
  subgraphExtensions.directives = subgraphDirectives;

  const meshSourceDirectiveName = getMeshSourceDirectiveName(subgraphExtensions);

  interface TypeDirectives {
    source: SourceDirective;
    [key: string]: any;
  }
  interface ArgDirectives {
    source: SourceDirective;
    [key: string]: any;
  }
  interface FieldDirectives {
    additionalField: {};
    merge: {};
    /** Federation Spec draft `@lookup` entity entry (preferred over `@merge`). */
    lookup: Array<Record<string, unknown>>;
    resolveTo: YamlConfig.AdditionalStitchingResolverObject;
    source: SourceDirective;
    hoist: any;
    [key: string]: any;
  }
  const renameTypeNames: Record<string, string> = {};
  const renameTypeNamesReversed: Record<string, string> = {};
  const renameFieldByObjectTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInputTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInterfaceTypeNames: Record<string, Record<string, string>> = {};
  const renameEnumValueByEnumTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByTypeNamesReversed: Record<string, Record<string, string>> = {};
  const renameArgByFieldByTypeNames: Record<string, Record<string, Record<string, string>>> = {};
  const transforms: Transform[] = (subschemaConfig.transforms ||= []);
  const entitiesWithKeys = new Set<[string, string[]]>();
  let mergeDirectiveUsed = false;
  subschemaConfig.schema = mapSchema(subschemaConfig.schema, {
    [MapperKind.TYPE]: type => {
      const typeDirectives = getDirectiveExtensions<TypeDirectives>(type);
      const keyDirectives = typeDirectives.key;
      const keys: string[] = [];
      if (keyDirectives?.length) {
        for (const keyDirective of keyDirectives) {
          const fields = keyDirective.fields;
          if (fields) {
            keys.push(fields);
          }
        }
        entitiesWithKeys.add([type.name, keys]);
      }
      {
        const sourceDirectives = getMeshSourceDirectives(typeDirectives, meshSourceDirectiveName);
        const sourceDirective = sourceDirectives?.find(directive =>
          directiveTargetsSubgraph(directive, subgraphName),
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.name || type.name;
          if (type.name !== realName) {
            renameTypeNames[realName] = type.name;
            renameTypeNamesReversed[type.name] = realName;
            return new (Object.getPrototypeOf(type).constructor)({
              ...type.toConfig(),
              name: realName,
            });
          }
        }
      }
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
      const fieldDirectives = getDirectiveExtensions<FieldDirectives>(fieldConfig);
      // Federation Spec `@lookup` (+ `@is`) → stitching `@merge` hop config.
      if (fieldDirectives.lookup?.length && !fieldDirectives.merge?.length) {
        const mergeFromLookup = synthesizeMergeFromLookup(fieldConfig, fieldDirectives);
        if (mergeFromLookup) {
          fieldDirectives.merge = mergeFromLookup;
          const fieldExtensions: Record<string, unknown> = (fieldConfig.extensions ||= {});
          fieldExtensions.directives = fieldDirectives;
        }
      }
      if (fieldDirectives.merge?.length) {
        mergeDirectiveUsed = true;
      }
      const resolveToDirectives = fieldDirectives.resolveTo;
      if (resolveToDirectives?.length) {
        const type = schema.getType(typeName);
        if (!isObjectType(type)) {
          throw new Error(`Type ${typeName} for field ${fieldName} is not an object type`);
        }
        const fieldMap = type.getFields();
        const field = fieldMap[fieldName];
        if (!field) {
          throw new Error(`Field ${typeName}.${fieldName} not found`);
        }
        additionalTypeDefs.push({
          kind: Kind.DOCUMENT,
          definitions: [
            {
              kind: Kind.OBJECT_TYPE_DEFINITION,
              name: { kind: Kind.NAME, value: typeName },
              fields: [astFromField(field, schema)],
            },
          ],
        });
      }
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length) {
        return null;
      }
      const sourceDirectives = getMeshSourceDirectives(fieldDirectives, meshSourceDirectiveName);
      const sourceDirective = sourceDirectives?.find(directive =>
        directiveTargetsSubgraph(directive, subgraphName),
      );
      const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
      const realName = sourceDirective?.name ?? fieldName;
      if (fieldName !== realName) {
        if (!renameFieldByObjectTypeNames[realTypeName]) {
          renameFieldByObjectTypeNames[realTypeName] = {};
        }
        renameFieldByObjectTypeNames[realTypeName][realName] = fieldName;
        if (!renameFieldByTypeNamesReversed[realTypeName]) {
          renameFieldByTypeNamesReversed[realTypeName] = {};
        }
        renameFieldByTypeNamesReversed[realTypeName][fieldName] = realName;
      }
      const hoistDirectives = fieldDirectives.hoist;
      if (hoistDirectives?.length) {
        for (const hoistDirective of hoistDirectives) {
          if (directiveTargetsSubgraph(hoistDirective, subgraphName)) {
            const pathConfig: {
              fieldName: string;
              argFilter?: (arg: GraphQLArgument) => boolean;
            }[] = hoistDirective.pathConfig.map((annotation: any) => {
              if (typeof annotation === 'string') {
                return {
                  fieldName: annotation,
                  argFilter: () => true,
                };
              }
              return {
                fieldName: annotation.fieldName,
                argFilter: annotation.filterArgs
                  ? (arg: any) => !annotation.filterArgs.includes(arg.name)
                  : () => true,
              };
            });
            transforms.push(new HoistField(realTypeName, pathConfig, fieldName), new PruneSchema());
          }
        }
      }
      const newArgs: GraphQLFieldConfigArgumentMap = {};
      if (fieldConfig.args) {
        for (const argName in fieldConfig.args) {
          const argConfig: GraphQLArgumentConfig = fieldConfig.args[argName]!;
          const argDirectives = getDirectiveExtensions<ArgDirectives>(argConfig);
          const argSourceDirectives = getMeshSourceDirectives(
            argDirectives,
            meshSourceDirectiveName,
          );
          const argSourceDirective = argSourceDirectives?.find(directive =>
            directiveTargetsSubgraph(directive, subgraphName),
          );
          if (argSourceDirective != null) {
            const realArgName = argSourceDirective.name ?? argName;
            newArgs[realArgName] = argConfig;
            if (realArgName !== argName) {
              if (!renameArgByFieldByTypeNames[realTypeName]) {
                renameArgByFieldByTypeNames[realTypeName] = {};
              }
              if (!renameArgByFieldByTypeNames[realTypeName][realName]) {
                renameArgByFieldByTypeNames[realTypeName][realName] = {};
              }
              renameArgByFieldByTypeNames[realTypeName][realName][realArgName] = argName;
            }
          } else {
            newArgs[argName] = argConfig;
          }
        }
      }
      let fieldType = fieldConfig.type;
      if (sourceDirective?.type) {
        const fieldTypeNode = parseTypeNodeWithRenames(sourceDirective.type, renameTypeNames);
        const newType = typeFromAST(subschemaConfig.schema, fieldTypeNode);
        if (!newType) {
          throw new Error(
            `Type ${sourceDirective.type} for field ${typeName}.${fieldName} is not defined in the schema`,
          );
        }
        if (!isOutputType(newType)) {
          throw new Error(
            `Type ${sourceDirective.type} for field ${typeName}.${fieldName} is not an output type`,
          );
        }
        fieldType = newType;
      }
      return [
        realName,
        {
          ...fieldConfig,
          type: fieldType,
          args: newArgs,
        },
      ];
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const fieldDirectives = getDirectiveExtensions<FieldDirectives>(fieldConfig);
      const sourceDirectives = getMeshSourceDirectives(fieldDirectives, meshSourceDirectiveName);
      const sourceDirective = sourceDirectives?.find(directive =>
        directiveTargetsSubgraph(directive, subgraphName),
      );
      if (sourceDirective != null) {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realName = sourceDirective.name ?? fieldName;
        if (fieldName !== realName) {
          if (!renameFieldByInputTypeNames[realTypeName]) {
            renameFieldByInputTypeNames[realTypeName] = {};
          }
          renameFieldByInputTypeNames[realTypeName][realName] = fieldName;
        }
        return [realName, fieldConfig];
      }
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length) {
        return null;
      }
      return undefined;
    },
    [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
      const fieldDirectives = getDirectiveExtensions<FieldDirectives>(fieldConfig);
      const resolveToDirectives = fieldDirectives.resolveTo;
      if (resolveToDirectives?.length) {
        const type = schema.getType(typeName);
        if (!isInterfaceType(type)) {
          throw new Error(`Type ${typeName} for field ${fieldName} is not an object type`);
        }
        const fieldMap = type.getFields();
        const field = fieldMap[fieldName];
        if (!field) {
          throw new Error(`Field ${typeName}.${fieldName} not found`);
        }
        additionalTypeDefs.push({
          kind: Kind.DOCUMENT,
          definitions: [
            {
              kind: Kind.INTERFACE_TYPE_DEFINITION,
              name: { kind: Kind.NAME, value: typeName },
              fields: [astFromField(field, schema)],
            },
          ],
        });
      }
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length) {
        return null;
      }
      const sourceDirectives = getMeshSourceDirectives(fieldDirectives, meshSourceDirectiveName);
      const sourceDirective = sourceDirectives?.find(directive =>
        directiveTargetsSubgraph(directive, subgraphName),
      );
      if (sourceDirective != null) {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realName = sourceDirective.name ?? fieldName;
        if (fieldName !== realName) {
          if (!renameFieldByInterfaceTypeNames[realTypeName]) {
            renameFieldByInterfaceTypeNames[realTypeName] = {};
          }
          renameFieldByInterfaceTypeNames[realTypeName][realName] = fieldName;
        }
        return [realName, fieldConfig];
      }
      return undefined;
    },
    [MapperKind.ENUM_VALUE]: (enumValueConfig, typeName, _schema, externalValue) => {
      const enumDirectives = getDirectiveExtensions(enumValueConfig);
      const sourceDirectives = getMeshSourceDirectives(enumDirectives, meshSourceDirectiveName);
      const sourceDirective = sourceDirectives?.find(directive =>
        directiveTargetsSubgraph(directive, subgraphName),
      );
      if (sourceDirective != null) {
        const realValue = sourceDirective.name ?? externalValue;
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        if (externalValue !== realValue) {
          if (!renameEnumValueByEnumTypeNames[realTypeName]) {
            renameEnumValueByEnumTypeNames[realTypeName] = {};
          }
          renameEnumValueByEnumTypeNames[realTypeName][realValue] = externalValue;
        }
        return [
          realValue,
          {
            ...enumValueConfig,
            value: realValue,
          },
        ];
      }
      return undefined;
    },
  });
  if (Object.keys(renameTypeNames).length > 0) {
    transforms.push(new RenameTypes(typeName => renameTypeNames[typeName] || typeName));
  }
  if (Object.keys(renameFieldByObjectTypeNames).length > 0) {
    transforms.push(
      new RenameObjectFields((typeName, fieldName, _fieldConfig) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        return renameFieldByObjectTypeNames[realTypeName]?.[fieldName] ?? fieldName;
      }),
    );
  }
  if (Object.keys(renameFieldByInputTypeNames).length > 0) {
    transforms.push(
      new RenameInputObjectFields((typeName, fieldName, _fieldConfig) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        return renameFieldByInputTypeNames[realTypeName]?.[fieldName] ?? fieldName;
      }),
    );
  }
  if (Object.keys(renameFieldByInterfaceTypeNames).length > 0) {
    transforms.push(
      new RenameInterfaceFields((typeName, fieldName, _fieldConfig) => {
        const realTypeName = Object.prototype.hasOwnProperty.call(renameTypeNamesReversed, typeName)
          ? renameTypeNamesReversed[typeName]
          : typeName;
        const byType = Object.prototype.hasOwnProperty.call(
          renameFieldByInterfaceTypeNames,
          realTypeName!,
        )
          ? renameFieldByInterfaceTypeNames[realTypeName!]
          : undefined;
        if (
          byType &&
          Object.prototype.hasOwnProperty.call(byType, fieldName) &&
          byType[fieldName] != null
        ) {
          return byType[fieldName]!;
        }
        return fieldName;
      }),
    );
  }
  if (Object.keys(renameEnumValueByEnumTypeNames).length > 0) {
    transforms.push(
      new TransformEnumValues((typeName, externalValue, enumValueConfig) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realValue =
          renameEnumValueByEnumTypeNames[realTypeName]?.[enumValueConfig.value || externalValue] ??
          enumValueConfig.value;
        return [
          realValue,
          {
            ...enumValueConfig,
            value: realValue,
          },
        ];
      }),
    );
  }
  if (Object.keys(renameArgByFieldByTypeNames).length > 0) {
    transforms.push(
      new RenameObjectFieldArguments((typeName, fieldName, argName) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realFieldName =
          renameFieldByTypeNamesReversed[realTypeName]?.[fieldName] ?? fieldName;
        return renameArgByFieldByTypeNames[realTypeName]?.[realFieldName]?.[argName] ?? argName;
      }),
    );
  }
  if (mergeDirectiveUsed) {
    const existingMergeConfig = subschemaConfig.merge || {};
    subschemaConfig.merge = {};
    // Workaround because transformer needs the directive definition itself
    const subgraphSchemaConfig = subschemaConfig.schema.toConfig();
    subschemaConfig.schema = new GraphQLSchema({
      ...subgraphSchemaConfig,
      directives: [...subgraphSchemaConfig.directives, mergeDirective],
      assumeValid: true,
    });

    subschemaConfig.merge = Object.assign(
      existingMergeConfig,
      stitchingDirectivesTransformer(subschemaConfig).merge,
    );
    const queryType = subschemaConfig.schema.getQueryType();
    if (!queryType) {
      throw new Error('Query type is required');
    }
    // Transformer doesn't respect transforms
    if (transforms.length && subschemaConfig.merge) {
      const subschemaConfigMerge = subschemaConfig.merge;
      const mergeConfig: Record<string, MergedTypeConfig<any, any, Record<string, any>>> = {};
      for (const realTypeName in subschemaConfig.merge) {
        // Public type name after Mesh `@source` rename (AuthorWithBooks → Author).
        const renamedTypeName = renameTypeNames[realTypeName] ?? realTypeName;
        mergeConfig[renamedTypeName] = subschemaConfigMerge[realTypeName]!;
        const realQueryFieldName = mergeConfig[renamedTypeName].fieldName;
        if (realQueryFieldName) {
          mergeConfig[renamedTypeName].fieldName =
            renameFieldByObjectTypeNames[queryType.name]?.[realQueryFieldName] ??
            realQueryFieldName;
        }
        mergeConfig[renamedTypeName].entryPoints = subschemaConfigMerge[
          realTypeName
        ]?.entryPoints?.map(entryPoint => ({
          ...entryPoint,
          fieldName:
            entryPoint.fieldName &&
            (renameFieldByObjectTypeNames[queryType.name]?.[entryPoint.fieldName] ??
              entryPoint.fieldName),
          selectionSet: renameSelectionSetFieldNames(
            entryPoint.selectionSet,
            renameFieldByObjectTypeNames[realTypeName],
          ),
        }));
      }
      subschemaConfig.merge = mergeConfig;
    }
  }
  for (const [entityName, keys] of entitiesWithKeys) {
    const mergeConfig = (subschemaConfig.merge ||= {});
    const entryPoints = keys.map(key => ({
      selectionSet: `{ ${key} }`,
    }));
    if (entryPoints.length > 1) {
      mergeConfig[entityName] ||= {
        entryPoints,
      };
    } else {
      mergeConfig[entityName] ||= entryPoints[0] || {
        selectionSet: `{ __typename }`,
      };
    }
  }
  subschemaConfig.executor = (req =>
    onSubgraphExecute(subgraphName, req)) as typeof subschemaConfig.executor;

  return subschemaConfig;
}

const mergeDirective = new GraphQLDirective({
  name: 'merge',
  isRepeatable: true,
  locations: [DirectiveLocation.FIELD],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    key: {
      type: GraphQLString,
    },
    keyField: {
      type: GraphQLString,
    },
    keyArg: {
      type: GraphQLString,
    },
    argsExpr: {
      type: GraphQLString,
    },
  },
});

function parseTypeNodeWithRenames(typeString: string, renameTypeNames: Record<string, string>) {
  const typeNode = parseType(typeString);
  return visit(typeNode, {
    NamedType: node => {
      const realName = renameTypeNames[node.name.value] ?? node.name.value;
      return {
        ...node,
        name: {
          ...node.name,
          value: realName,
        },
      };
    },
  });
}

/**
 * Rewrite backend field names inside an entry-point selection set to public names
 * using the type's field rename table (same mapping as RenameObjectFields).
 */
function renameSelectionSetFieldNames(
  selectionSet: string | undefined,
  fieldRenameMap: Record<string, string> | undefined,
): string | undefined {
  if (selectionSet == null || fieldRenameMap == null) {
    return selectionSet;
  }
  if (Object.keys(fieldRenameMap).length === 0) {
    return selectionSet;
  }
  try {
    const document = parse(`query _ ${selectionSet}`);
    const rewritten = visit(document, {
      [Kind.FIELD](node) {
        if (!Object.hasOwn(fieldRenameMap, node.name.value)) {
          return undefined;
        }
        return {
          ...node,
          name: {
            ...node.name,
            value: fieldRenameMap[node.name.value]!,
          },
        };
      },
    });
    const operation = rewritten.definitions[0];
    if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
      return selectionSet;
    }
    return print(operation.selectionSet);
  } catch {
    return selectionSet;
  }
}

/**
 * Build stitching `@merge` hop args from Federation Spec draft `@lookup` + `@is`
 * on entity entry fields that return one object (not a list). Keeps the existing
 * stitching transformer path while preferring `@lookup` on SDL.
 */
function synthesizeMergeFromLookup(
  fieldConfig: GraphQLFieldConfig<any, any>,
  fieldDirectives: { lookup?: unknown[]; merge?: unknown[] },
): Array<Record<string, unknown>> | undefined {
  if (!fieldDirectives.lookup?.length || fieldDirectives.merge?.length) {
    return undefined;
  }
  const args = fieldConfig.args || {};
  const argNames = Object.keys(args) as string[];
  if (!argNames.length) {
    // Zero-arg lookup: keyless type merge entry (selection only).
    return [{}];
  }
  const merges: Array<Record<string, unknown>> = [];
  for (const argName of argNames) {
    const argConfig = args[argName]!;
    const argDirs = getDirectiveExtensions(argConfig);
    // Native `@is` (subgraph SDL / reconstituted) or Supergraph
    // `@join__directive(name: "is")` left on ARGUMENT_DEFINITION by extract.
    const isFromJoin = (
      (argDirs?.join__directive as
        Array<{ name?: string; args?: { field?: string } }> | undefined) || []
    )
      .filter(d => d?.name === 'is')
      .map(d => ({ field: d.args?.field }));
    const keyField = resolveLookupKeyField(String(argName), [
      ...((argDirs?.is as Array<{ field?: string }> | undefined) || []),
      ...isFromJoin,
    ]);
    // Nested paths (`address.id`) are not expressible as a simple stitching keyField;
    // fall back to the first path segment for hop planning.
    const keyArg = String(argName);
    const simpleKeyField = keyField.split('.')[0] || keyArg;
    merges.push({
      keyArg,
      keyField: simpleKeyField,
    });
  }
  // Stitching transformer expects one `@merge` app per field; use the first arg mapping.
  return merges.length ? [merges[0]!] : undefined;
}
