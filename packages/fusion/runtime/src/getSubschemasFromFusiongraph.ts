import {
  ASTNode,
  buildASTSchema,
  ConstDirectiveNode,
  DocumentNode,
  getArgumentValues,
  GraphQLArgument,
  GraphQLFieldConfigArgumentMap,
  GraphQLSchema,
  isOutputType,
  isSpecifiedScalarType,
  Kind,
  parseType,
  print,
  printSchema,
  printType,
  typeFromAST,
  valueFromASTUntyped,
  visit,
} from 'graphql';
import { TransportEntry } from '@graphql-mesh/transport-common';
import { getDefDirectives, resolveAdditionalResolvers } from '@graphql-mesh/utils';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  DirectiveAnnotation,
  getRootTypeNames,
  MapperKind,
  mapSchema,
  printSchemaWithDirectives,
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

export function extractSubgraphsFromFusiongraph(fusiongraph: GraphQLSchema) {
  const subgraphNames = new Set<string>();
  const subschemaMap = new Map<string, SubschemaConfig>();
  const transportEntryMap: Record<string, TransportEntry> = {};
  const schemaDirectives = getDefDirectives(fusiongraph, fusiongraph);
  const transportDirectives = schemaDirectives.filter(directive => directive.name === 'transport');
  const { stitchingDirectivesTransformer } = stitchingDirectives();
  for (const transportDirective of transportDirectives) {
    const subgraph = transportDirective.args.subgraph;
    if (typeof subgraph === 'string') {
      subgraphNames.add(subgraph);
      transportEntryMap[subgraph] = transportDirective.args as TransportEntry;
    }
  }
  const rootTypeNames = getRootTypeNames(fusiongraph);
  const additionalResolversFromTypeDefs: Exclude<
    Parameters<typeof resolveAdditionalResolvers>[1][0],
    string
  >[] = [];
  const additionalTypeDefs = new Set<string>();
  for (const subgraph of subgraphNames) {
    const renameTypeNames: Record<string, string> = {};
    const renameTypeNamesReversed: Record<string, string> = {};
    const renameFieldByObjectTypeNames: Record<string, Record<string, string>> = {};
    const renameFieldByInputTypeNames: Record<string, Record<string, string>> = {};
    const renameFieldByInterfaceTypeNames: Record<string, Record<string, string>> = {};
    const renameEnumValueByEnumTypeNames: Record<string, Record<string, string>> = {};
    const renameFieldByTypeNamesReversed: Record<string, Record<string, string>> = {};
    const renameArgByFieldByTypeNames: Record<string, Record<string, Record<string, string>>> = {};
    const transforms: Transform[] = [];
    const subgraphSchema = mapSchema(fusiongraph, {
      [MapperKind.TYPE]: type => {
        const typeDirectives = getDefDirectives(fusiongraph, type, subgraph);
        const sourceDirectives = typeDirectives.filter(directive => directive.name === 'source');
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.args.name ?? type.name;
          if (type.name !== realName) {
            renameTypeNames[realName] = type.name;
            renameTypeNamesReversed[type.name] = realName;
            return new (Object.getPrototypeOf(type).constructor)({
              ...type.toConfig(),
              name: realName,
            });
          }
          return type;
        }
        if (rootTypeNames.has(type.name) || isSpecifiedScalarType(type)) {
          return type;
        }
        additionalTypeDefs.add(printType(type));
        // The fields of this type won't be visited so we need to get @resolveTo directives if there are any
        if ('getFields' in type) {
          for (const fieldName in type.getFields()) {
            const fieldConfig = type.getFields()[fieldName];
            const fieldDirectives = getDefDirectives(fusiongraph, fieldConfig);
            const resolveToDirectives = fieldDirectives.filter(
              directive => directive.name === 'resolveTo',
            );
            if (resolveToDirectives.length > 0) {
              for (const resolveToDirective of resolveToDirectives) {
                additionalResolversFromTypeDefs.push({
                  targetTypeName: type.name,
                  targetFieldName: fieldName,
                  ...(resolveToDirective.args as any),
                });
              }
            }
          }
        }
        return null;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fusiongraph, fieldConfig);
        const resolveToDirectives = fieldDirectives.filter(
          directive => directive.name === 'resolveTo',
        );
        if (resolveToDirectives.length > 0) {
          for (const resolveToDirective of resolveToDirectives) {
            additionalResolversFromTypeDefs.push({
              targetTypeName: typeName,
              targetFieldName: fieldName,
              ...(resolveToDirective.args as any),
            });
          }
        }
        const sourceDirectives = fieldDirectives.filter(directive => directive.name === 'source');
        if (!sourceDirectives.length) {
          const argEntries = Object.entries(fieldConfig.args ?? {});
          additionalTypeDefs.add(
            `extend type ${typeName} {
              ${fieldName}${
                argEntries.length > 0
                  ? `
                (${argEntries.map(([argName, argConfig]) => `${argName}: ${argConfig.type}`).join('\n,')})
              `
                  : ''
              }: ${fieldConfig.type}
            }
          `,
          );
        }
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
          const realName = sourceDirective.args.name ?? fieldName;
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
          if (sourceDirective.args?.hoist) {
            const pathConfig: (
              | string
              | {
                  fieldName: string;
                  argFilter?: (arg: GraphQLArgument) => boolean;
                }
            )[] = sourceDirective.args.hoist.map(annotation => {
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
          const directivesObj: Record<string, any> = {};
          for (const fieldDirective of fieldDirectives) {
            if (fieldDirective?.args?.subgraph && fieldDirective.args.subgraph !== subgraph) {
              continue;
            }
            directivesObj[fieldDirective.name] ||= [];
            directivesObj[fieldDirective.name].push(fieldDirective.args);
          }
          const newArgs: GraphQLFieldConfigArgumentMap = {};
          if (fieldConfig.args) {
            for (const argName in fieldConfig.args) {
              const argConfig = fieldConfig.args[argName];
              const argDirectives = getDefDirectives(fusiongraph, argConfig);
              const argSourceDirective = argDirectives.find(
                directive => directive.name === 'source' && directive.args.subgraph === subgraph,
              );
              if (argSourceDirective != null) {
                const realArgName = argSourceDirective.args.name ?? argName;
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
              }
            }
          }
          let fieldType = fieldConfig.type;
          if (sourceDirective.args?.type) {
            const fieldTypeNode = parseTypeNodeWithRenames(
              sourceDirective.args.type,
              renameTypeNames,
            );
            const newType = typeFromAST(fusiongraph, fieldTypeNode);
            if (!newType) {
              throw new Error(
                `Type ${sourceDirective.args.type} for field ${typeName}.${fieldName} is not defined in the schema`,
              );
            }
            if (!isOutputType(newType)) {
              throw new Error(
                `Type ${sourceDirective.args.type} for field ${typeName}.${fieldName} is not an output type`,
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
              astNode: undefined,
              extensions: {
                ...fieldConfig.extensions,
                directives: directivesObj,
              },
            },
          ];
        }
        return null;
      },
      [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fusiongraph, fieldConfig, subgraph);
        const [sourceDirective] = fieldDirectives.filter(
          directive => directive.name === 'source' && directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
          const realName = sourceDirective.args.name ?? fieldName;
          if (fieldName !== realName) {
            if (!renameFieldByInputTypeNames[realTypeName]) {
              renameFieldByInputTypeNames[realTypeName] = {};
            }
            renameFieldByInputTypeNames[realTypeName][realName] = fieldName;
          }
          return [realName, fieldConfig];
        }
        return null;
      },
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fusiongraph, fieldConfig, subgraph);
        const [sourceDirective] = fieldDirectives.filter(
          directive => directive.name === 'source' && directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.args.name ?? fieldName;
          if (fieldName !== realName) {
            const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
            if (!renameFieldByInterfaceTypeNames[realTypeName]) {
              renameFieldByInterfaceTypeNames[realTypeName] = {};
            }
            renameFieldByInterfaceTypeNames[realTypeName][realName] = fieldName;
          }
          return [realName, fieldConfig];
        }
        return null;
      },
      [MapperKind.ENUM_VALUE]: (enumValueConfig, typeName, _schema, externalValue) => {
        const enumValueDirectives = getDefDirectives(fusiongraph, enumValueConfig, subgraph);
        const [sourceDirective] = enumValueDirectives.filter(
          directive => directive.name === 'source' && directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realValue = sourceDirective.args.name ?? externalValue;
          const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
          if (externalValue !== realValue) {
            if (!renameEnumValueByEnumTypeNames[realTypeName]) {
              renameEnumValueByEnumTypeNames[realTypeName] = {};
            }
            renameEnumValueByEnumTypeNames[realTypeName][realValue] = externalValue;
          }
          return [realValue, enumValueConfig];
        }
        return null;
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
    let subschema: SubschemaConfig = {
      schema: subgraphSchema,
      transforms,
    };
    subschema = stitchingDirectivesTransformer(subschema);
    const queryType = subgraphSchema.getQueryType();
    // Transformer doesn't respect transforms
    if (transforms.length && subschema.merge) {
      const mergeConfig: SubschemaConfig['merge'] = {};
      for (const realTypeName in subschema.merge) {
        const renamedTypeName = renameTypeNames[realTypeName] ?? realTypeName;
        mergeConfig[renamedTypeName] = subschema.merge[realTypeName];
        const realQueryFieldName = mergeConfig[renamedTypeName].fieldName;
        if (realQueryFieldName) {
          mergeConfig[renamedTypeName].fieldName =
            renameFieldByObjectTypeNames[queryType.name]?.[realQueryFieldName] ??
            realQueryFieldName;
        }
        mergeConfig[renamedTypeName].entryPoints = subschema.merge[realTypeName].entryPoints?.map(
          entryPoint => ({
            ...entryPoint,
            fieldName:
              renameFieldByObjectTypeNames[queryType.name]?.[entryPoint.fieldName] ??
              entryPoint.fieldName,
          }),
        );
      }
      subschema.merge = mergeConfig;
    }
    subschemaMap.set(subgraph, subschema);
  }
  return {
    subschemaMap,
    transportEntryMap,
    additionalTypeDefs,
    additionalResolversFromTypeDefs,
  };
}

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
