import { constantCase } from 'change-case';
import {
  DirectiveLocation,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLFieldConfigArgumentMap,
  GraphQLSchema,
  GraphQLString,
  isEnumType,
  isObjectType,
  isOutputType,
  Kind,
  parseType,
  typeFromAST,
  visit,
} from 'graphql';
import { TransportEntry } from '@graphql-mesh/transport-common';
import {
  getDirectiveExtensions,
  resolveAdditionalResolversWithoutImport,
} from '@graphql-mesh/utils';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  asArray,
  astFromField,
  getDocumentNodeFromSchema,
  MapperKind,
  mapSchema,
  memoize1,
} from '@graphql-tools/utils';
import {
  HoistField,
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFieldArguments,
  RenameObjectFields,
  RenameTypes,
  TransformEnumValues,
} from '@graphql-tools/wrap';
import { filterHiddenPartsInSchema } from './filterHiddenPartsInSchema.js';
import { UnifiedGraphHandler } from './unifiedGraphManager.js';

// Memoize to avoid re-parsing the same schema AST
// Workaround for unsupported directives on composition: restore extra directives
const restoreExtraDirectives = memoize1(function restoreExtraDirectives(schema: GraphQLSchema) {
  const queryType = schema.getQueryType();
  const queryTypeExtensions = getDirectiveExtensions(queryType);
  const extraTypeDirectives: { name: string; directives: Record<string, any[]> }[] | undefined =
    queryTypeExtensions?.extraTypeDirective;
  const extraSchemaDefinitionDirectives: { directives: Record<string, any[]> }[] | undefined =
    queryTypeExtensions?.extraSchemaDefinitionDirective;
  const extraEnumValueDirectives:
    | { name: string; value: string; directives: Record<string, any[]> }[]
    | undefined = queryTypeExtensions?.extraEnumValueDirective;
  if (
    extraTypeDirectives?.length ||
    extraSchemaDefinitionDirectives?.length ||
    extraEnumValueDirectives?.length
  ) {
    const extraTypeDirectiveMap = new Map<string, Record<string, any[]>>();
    if (extraTypeDirectives) {
      for (const { name, directives } of extraTypeDirectives) {
        extraTypeDirectiveMap.set(name, directives);
      }
    }
    const extraEnumValueDirectiveMap = new Map<string, Map<string, Record<string, any[]>>>();
    if (extraEnumValueDirectives) {
      for (const { name, value, directives } of extraEnumValueDirectives) {
        let enumValueDirectivesMap = extraEnumValueDirectiveMap.get(name);
        if (!enumValueDirectivesMap) {
          enumValueDirectivesMap = new Map();
          extraEnumValueDirectiveMap.set(name, enumValueDirectivesMap);
        }
        enumValueDirectivesMap.set(value, directives);
      }
    }
    schema = mapSchema(schema, {
      [MapperKind.TYPE]: type => {
        const typeDirectiveExtensions = getDirectiveExtensions(type) || {};
        const TypeCtor = Object.getPrototypeOf(type).constructor;
        if (type.name === queryType.name) {
          const typeConfig = type.toConfig();
          // Cleanup extra directives on Query type
          return new TypeCtor({
            ...typeConfig,
            extensions: {
              ...(type.extensions || {}),
              directives: {
                ...typeDirectiveExtensions,
                extraTypeDirective: [],
                extraSchemaDefinitionDirective: [],
                extraEnumValueDirective: [],
              },
            },
            // Cleanup ASTNode to prevent conflicts
            astNode: undefined,
          });
        }
        const extraDirectives = extraTypeDirectiveMap.get(type.name);
        if (extraDirectives) {
          for (const directiveName in extraDirectives) {
            const extraDirectiveArgs = extraDirectives[directiveName];
            if (extraDirectiveArgs?.length) {
              typeDirectiveExtensions[directiveName] ||= [];
              typeDirectiveExtensions[directiveName].push(...extraDirectiveArgs);
            }
          }
          return new TypeCtor({
            ...type.toConfig(),
            extensions: {
              ...(type.extensions || {}),
              directives: typeDirectiveExtensions,
            },
            // Cleanup ASTNode to prevent conflicts
            astNode: undefined,
          });
        }
      },
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, schema, externalValue) => {
        const enumValueDirectivesMap = extraEnumValueDirectiveMap.get(typeName);
        if (enumValueDirectivesMap) {
          const enumValueDirectives = enumValueDirectivesMap.get(externalValue);
          if (enumValueDirectives) {
            const valueDirectives = getDirectiveExtensions(valueConfig) || {};
            for (const directiveName in enumValueDirectives) {
              const extraDirectives = enumValueDirectives[directiveName];
              if (extraDirectives?.length) {
                valueDirectives[directiveName] ||= [];
                valueDirectives[directiveName].push(...extraDirectives);
              }
            }
            return {
              ...valueConfig,
              extensions: {
                ...(valueConfig.extensions || {}),
                directives: valueDirectives,
              },
            };
          }
        }
      },
    });
    if (extraSchemaDefinitionDirectives?.length) {
      const schemaDirectives = getDirectiveExtensions(schema);
      for (const { directives } of extraSchemaDefinitionDirectives) {
        for (const directiveName in directives) {
          schemaDirectives[directiveName] ||= [];
          schemaDirectives[directiveName].push(...directives[directiveName]);
        }
      }
      const schemaExtensions: Record<string, unknown> = (schema.extensions ||= {});
      schemaExtensions.directives = schemaDirectives;
    }
  }
  return schema;
});

export const handleFederationSupergraph: UnifiedGraphHandler = function ({
  unifiedGraph,
  onSubgraphExecute,
  additionalTypeDefs: additionalTypeDefsFromConfig = [],
  additionalResolvers: additionalResolversFromConfig = [],
}) {
  const additionalTypeDefs = [...asArray(additionalTypeDefsFromConfig)];
  const additionalResolvers = [...asArray(additionalResolversFromConfig)];
  const transportEntryMap: Record<string, TransportEntry> = {};
  let subschemas: SubschemaConfig[] = [];
  const { stitchingDirectivesTransformer } = stitchingDirectives({
    keyDirectiveName: 'stitch__key',
    computedDirectiveName: 'stitch__computed',
    mergeDirectiveName: 'merge',
    canonicalDirectiveName: 'stitch__canonical',
  });
  unifiedGraph = restoreExtraDirectives(unifiedGraph);
  // Get Transport Information from Schema Directives
  const schemaDirectives = getDirectiveExtensions(unifiedGraph);
  // Workaround to get the real name of the subschema
  const realSubgraphNameMap = new Map<string, string>();
  const joinGraphType = unifiedGraph.getType('join__Graph');
  if (isEnumType(joinGraphType)) {
    for (const enumValue of joinGraphType.getValues()) {
      const enumValueDirectives = getDirectiveExtensions(enumValue);
      const joinGraphDirectives = enumValueDirectives?.join__graph;
      if (joinGraphDirectives?.length) {
        for (const joinGraphDirective of joinGraphDirectives) {
          realSubgraphNameMap.set(enumValue.name, joinGraphDirective.name);
        }
      }
    }
  }
  let executableUnifiedGraph = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: getDocumentNodeFromSchema(unifiedGraph),
    onSubschemaConfig(subschemaConfig) {
      // Fix name
      const subgraphName = (subschemaConfig.name =
        realSubgraphNameMap.get(subschemaConfig.name) || subschemaConfig.name);
      const subgraphDirectives = getDirectiveExtensions(subschemaConfig.schema);
      for (const directiveName in schemaDirectives) {
        if (!subgraphDirectives[directiveName]?.length && schemaDirectives[directiveName]?.length) {
          const directives = schemaDirectives[directiveName];
          for (const directive of directives) {
            if (directive.subgraph && directive.subgraph !== subgraphName) {
              continue;
            }
            subgraphDirectives[directiveName] ||= [];
            subgraphDirectives[directiveName].push(directive);
          }
        }
      }
      const subgraphExtensions: Record<string, unknown> = (subschemaConfig.schema.extensions ||=
        {});
      subgraphExtensions.directives = subgraphDirectives;
      const transportDirectives = (subgraphDirectives.transport ||= []);
      if (transportDirectives.length) {
        transportEntryMap[subgraphName] = transportDirectives[0];
      } else {
        transportEntryMap[subgraphName] = {
          kind: 'http',
          subgraph: subgraphName,
          location: subschemaConfig.endpoint,
        };
      }
      const renameTypeNames: Record<string, string> = {};
      const renameTypeNamesReversed: Record<string, string> = {};
      const renameFieldByObjectTypeNames: Record<string, Record<string, string>> = {};
      const renameFieldByInputTypeNames: Record<string, Record<string, string>> = {};
      const renameFieldByInterfaceTypeNames: Record<string, Record<string, string>> = {};
      const renameEnumValueByEnumTypeNames: Record<string, Record<string, string>> = {};
      const renameFieldByTypeNamesReversed: Record<string, Record<string, string>> = {};
      const renameArgByFieldByTypeNames: Record<
        string,
        Record<string, Record<string, string>>
      > = {};
      const transforms: Transform[] = (subschemaConfig.transforms ||= []);
      let mergeDirectiveUsed = false;
      subschemaConfig.schema = mapSchema(subschemaConfig.schema, {
        [MapperKind.TYPE]: type => {
          const typeDirectives = getDirectiveExtensions(type);
          const sourceDirectives = typeDirectives.source;
          const sourceDirective = sourceDirectives?.find(directive =>
            compareSubgraphNames(directive.subgraph, subgraphName),
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
        },
        [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
          const fieldDirectives = getDirectiveExtensions(fieldConfig);
          if (fieldDirectives.merge?.length) {
            mergeDirectiveUsed = true;
          }
          const resolveToDirectives = fieldDirectives.resolveTo;
          if (resolveToDirectives?.length > 0) {
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
            for (const resolveToDirective of resolveToDirectives) {
              additionalResolvers.push(
                resolveAdditionalResolversWithoutImport({
                  targetTypeName: typeName,
                  targetFieldName: fieldName,
                  ...resolveToDirective,
                }),
              );
            }
            return null;
          }
          const sourceDirectives = fieldDirectives.source;
          const sourceDirective = sourceDirectives?.find(directive =>
            compareSubgraphNames(directive.subgraph, subgraphName),
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
          if (sourceDirective?.hoist) {
            const pathConfig: (
              | string
              | {
                  fieldName: string;
                  argFilter?: (arg: GraphQLArgument) => boolean;
                }
            )[] = sourceDirective.hoist.map(annotation => {
              if (typeof annotation === 'string') {
                return {
                  fieldName: annotation,
                  argFilter: () => true,
                };
              }
              return {
                fieldName: annotation.fieldName,
                argFilter: annotation.filterArgs
                  ? arg => !annotation.filterArgs.includes(arg.name)
                  : () => true,
              };
            });
            transforms.push(new HoistField(typeName, pathConfig, fieldName));
          }
          const newArgs: GraphQLFieldConfigArgumentMap = {};
          if (fieldConfig.args) {
            for (const argName in fieldConfig.args) {
              const argConfig = fieldConfig.args[argName];
              const argDirectives = getDirectiveExtensions(argConfig);
              const argSourceDirectives = argDirectives.source;
              const argSourceDirective = argSourceDirectives?.find(directive =>
                compareSubgraphNames(directive.subgraph, subgraphName),
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
          const fieldDirectives = getDirectiveExtensions(fieldConfig);
          const sourceDirectives = fieldDirectives.source;
          const sourceDirective = sourceDirectives?.find(directive =>
            compareSubgraphNames(directive.subgraph, subgraphName),
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
        },
        [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
          const fieldDirectives = getDirectiveExtensions(fieldConfig);
          const sourceDirectives = fieldDirectives.source;
          const sourceDirective = sourceDirectives?.find(directive =>
            compareSubgraphNames(directive.subgraph, subgraphName),
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
        },
        [MapperKind.ENUM_VALUE]: (enumValueConfig, typeName, _schema, externalValue) => {
          const enumDirectives = getDirectiveExtensions(enumValueConfig);
          const sourceDirectives = enumDirectives.source;
          const sourceDirective = sourceDirectives?.find(directive =>
            compareSubgraphNames(directive.subgraph, subgraphName),
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
            return [realValue, enumValueConfig];
          }
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
            const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
            return renameFieldByInterfaceTypeNames[realTypeName]?.[fieldName] ?? fieldName;
          }),
        );
      }
      if (Object.keys(renameEnumValueByEnumTypeNames).length > 0) {
        transforms.push(
          new TransformEnumValues((typeName, externalValue, enumValueConfig) => {
            const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
            const realValue =
              renameEnumValueByEnumTypeNames[realTypeName]?.[
                enumValueConfig.value || externalValue
              ] ?? enumValueConfig.value;
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
            return renameArgByFieldByTypeNames[realTypeName]?.[fieldName]?.[argName] ?? argName;
          }),
        );
      }
      if (mergeDirectiveUsed) {
        subschemaConfig.merge = {};
        // Workaround because transformer needs the directive definition itself
        const subgraphSchemaConfig = subschemaConfig.schema.toConfig();
        subschemaConfig.schema = new GraphQLSchema({
          ...subgraphSchemaConfig,
          directives: [...subgraphSchemaConfig.directives, mergeDirective],
          assumeValid: true,
        });

        subschemaConfig.merge = stitchingDirectivesTransformer(subschemaConfig).merge;
        const queryType = subschemaConfig.schema.getQueryType();
        // Transformer doesn't respect transforms
        if (transforms.length && subschemaConfig.merge) {
          const mergeConfig: SubschemaConfig['merge'] = {};
          for (const realTypeName in subschemaConfig.merge) {
            const renamedTypeName = renameTypeNames[realTypeName] ?? realTypeName;
            mergeConfig[renamedTypeName] = subschemaConfig.merge[realTypeName];
            const realQueryFieldName = mergeConfig[renamedTypeName].fieldName;
            if (realQueryFieldName) {
              mergeConfig[renamedTypeName].fieldName =
                renameFieldByObjectTypeNames[queryType.name]?.[realQueryFieldName] ??
                realQueryFieldName;
            }
            mergeConfig[renamedTypeName].entryPoints = subschemaConfig.merge[
              realTypeName
            ].entryPoints?.map(entryPoint => ({
              ...entryPoint,
              fieldName:
                renameFieldByObjectTypeNames[queryType.name]?.[entryPoint.fieldName] ??
                entryPoint.fieldName,
            }));
          }
          subschemaConfig.merge = mergeConfig;
        }
      }
      subschemaConfig.executor = function subschemaExecutor(req) {
        return onSubgraphExecute(subgraphName, req);
      };
    },
    batch: true,
    onStitchingOptions(opts: any) {
      subschemas = opts.subschemas;
      opts.typeDefs = [opts.typeDefs, additionalTypeDefs];
      opts.resolvers = additionalResolvers;
    },
  });

  executableUnifiedGraph = filterHiddenPartsInSchema(executableUnifiedGraph);

  return {
    unifiedGraph: executableUnifiedGraph,
    subschemas,
    transportEntryMap,
    additionalResolvers,
  };
};
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

const mergeDirective = new GraphQLDirective({
  name: 'merge',
  isRepeatable: true,
  locations: [DirectiveLocation.FIELD],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    keyField: {
      type: GraphQLString,
    },
    keyArg: {
      type: GraphQLString,
    },
  },
});

// TODO: Fix this in GraphQL Tools
export function compareSubgraphNames(name1: string, name2: string) {
  return constantCase(name1) === constantCase(name2);
}
