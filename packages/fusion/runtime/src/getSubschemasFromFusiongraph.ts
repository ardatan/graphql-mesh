import {
  ASTNode,
  buildASTSchema,
  ConstDirectiveNode,
  DocumentNode,
  GraphQLSchema,
  isSpecifiedScalarType,
  Kind,
  parseType,
  print,
  printSchema,
  valueFromASTUntyped,
  visit,
} from 'graphql';
import { TransportEntry } from '@graphql-mesh/transport-common';
import { resolveAdditionalResolvers } from '@graphql-mesh/utils';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  DirectiveAnnotation,
  getRootTypeMap,
  getRootTypeNames,
  MapperKind,
  mapSchema,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import {
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFields,
  RenameRootFields,
  RenameTypes,
  TransformEnumValues,
} from '@graphql-tools/wrap';

export function extractSubgraphsFromFusiongraph(fusiongraph: GraphQLSchema) {
  const subgraphNames = new Set<string>();
  const subschemaMap = new Map<string, SubschemaConfig>();
  const transportEntryMap: Record<string, TransportEntry> = {};
  const schemaDirectives = getDefDirectives(fusiongraph);
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
    const subgraphSchema = mapSchema(fusiongraph, {
      [MapperKind.TYPE]: type => {
        const typeDirectives = getDefDirectives(type, subgraph);
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
        return null;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fieldConfig);
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
          }
          const directivesObj: Record<string, any> = {};
          for (const fieldDirective of fieldDirectives) {
            if (fieldDirective?.args?.subgraph && fieldDirective.args.subgraph !== subgraph)
              continue;
            directivesObj[fieldDirective.name] ||= [];
            directivesObj[fieldDirective.name].push(fieldDirective.args);
          }
          return [
            realName,
            {
              ...fieldConfig,
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
        const fieldDirectives = getDefDirectives(fieldConfig, subgraph);
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
        const fieldDirectives = getDefDirectives(fieldConfig, subgraph);
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
        const enumValueDirectives = getDefDirectives(enumValueConfig, subgraph);
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
    const transforms: Transform[] = [];
    if (Object.keys(renameTypeNames).length > 0) {
      transforms.push(new RenameTypes(typeName => renameTypeNames[typeName] || typeName));
    }
    if (Object.keys(renameFieldByObjectTypeNames).length > 0) {
      transforms.push(
        new RenameObjectFields((typeName, fieldName, _fieldConfig) => {
          return renameFieldByObjectTypeNames[typeName]?.[fieldName] ?? fieldName;
        }),
      );
    }
    if (Object.keys(renameFieldByInputTypeNames).length > 0) {
      transforms.push(
        new RenameInputObjectFields((typeName, fieldName, _fieldConfig) => {
          return renameFieldByInputTypeNames[typeName]?.[fieldName] ?? fieldName;
        }),
      );
    }
    if (Object.keys(renameFieldByInterfaceTypeNames).length > 0) {
      transforms.push(
        new RenameInterfaceFields((typeName, fieldName, _fieldConfig) => {
          return renameFieldByInterfaceTypeNames[typeName]?.[fieldName] ?? fieldName;
        }),
      );
    }
    if (Object.keys(renameEnumValueByEnumTypeNames).length > 0) {
      transforms.push(
        new TransformEnumValues((typeName, externalValue, enumValueConfig) => {
          return [
            renameEnumValueByEnumTypeNames[typeName]?.[externalValue] ?? externalValue,
            enumValueConfig,
          ];
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

function getDefDirectives(
  { astNode, extensions }: { astNode?: ASTNode | null; extensions?: any },
  subgraph?: string,
) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      const directiveAnnotation = {
        name: directiveNode.name.value,
        args:
          directiveNode.arguments?.reduce(
            (acc, arg) => {
              acc[arg.name.value] = valueFromASTUntyped(arg.value);
              return acc;
            },
            {} as Record<string, any>,
          ) ?? {},
      };
      if (
        subgraph &&
        directiveAnnotation.args.subgraph &&
        directiveAnnotation.args.subgraph !== subgraph
      )
        return;
      directiveAnnotations.push(directiveAnnotation);
    });
  }
  if (extensions?.directives != null) {
    for (const directiveName in extensions.directives) {
      const directiveExt = extensions.directives[directiveName];
      if (directiveExt != null) {
        if (Array.isArray(directiveExt)) {
          directiveExt.forEach(directive => {
            if (subgraph && directive.subgraph && directive.subgraph !== subgraph) return;
            directiveAnnotations.push({
              name: directiveName,
              args: directive,
            });
          });
        } else {
          if (subgraph && directiveExt.subgraph && directiveExt.subgraph !== subgraph) continue;
          directiveAnnotations.push({
            name: directiveName,
            args: directiveExt,
          });
        }
      }
    }
  }
  return directiveAnnotations;
}
