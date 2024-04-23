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
  valueFromASTUntyped,
  visit,
} from 'graphql';
import { TransportEntry } from '@graphql-mesh/transport-common';
import { resolveAdditionalResolvers } from '@graphql-mesh/utils';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { DirectiveAnnotation, getRootTypeNames, MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFieldArguments,
  RenameRootFields,
  TransformEnumValues,
} from '@graphql-tools/wrap';

export function extractSubgraphsFromFusiongraph(fusiongraph: GraphQLSchema) {
  const renameTypeNames: Record<string, string> = {};
  const renameFieldByObjectTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInputTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInterfaceTypeNames: Record<string, Record<string, string>> = {};
  const renameEnumValueByEnumTypeNames: Record<string, Record<string, string>> = {};
  const subgraphNames = new Set<string>();
  const subschemaMap = new Map<string, SubschemaConfig>();
  const transportEntryMap: Record<string, TransportEntry> = {};
  const schemaDirectives = getDefDirectives(fusiongraph);
  const transportDirectives = schemaDirectives.filter(directive => directive.name === 'transport');
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
  const additionalTypeDefs: string[] = [];
  for (const subgraph of subgraphNames) {
    const subgraphSchema = mapSchema(fusiongraph, {
      [MapperKind.TYPE]: type => {
        const typeDirectives = getDefDirectives(type);
        const sourceDirectives = typeDirectives.filter(directive => directive.name === 'source');
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.args.name ?? type.name;
          if (type.name !== realName) {
            renameTypeNames[realName] = type.name;
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
          additionalTypeDefs.push(
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
          const realName = sourceDirective.args.name ?? fieldName;
          if (fieldName !== realName) {
            if (!renameFieldByObjectTypeNames[typeName]) {
              renameFieldByObjectTypeNames[typeName] = {};
            }
            renameFieldByObjectTypeNames[typeName][realName] = fieldName;
          }
          return [realName, fieldConfig];
        }
        return null;
      },
      [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fieldConfig);
        const sourceDirectives = fieldDirectives.filter(directive => directive.name === 'source');
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.args.name ?? fieldName;
          if (fieldName !== realName) {
            if (!renameFieldByInputTypeNames[typeName]) {
              renameFieldByInputTypeNames[typeName] = {};
            }
            renameFieldByInputTypeNames[typeName][realName] = fieldName;
          }
          return [realName, fieldConfig];
        }
        return null;
      },
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldDirectives = getDefDirectives(fieldConfig);
        const sourceDirectives = fieldDirectives.filter(directive => directive.name === 'source');
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realName = sourceDirective.args.name ?? fieldName;
          if (fieldName !== realName) {
            if (!renameFieldByInterfaceTypeNames[typeName]) {
              renameFieldByInterfaceTypeNames[typeName] = {};
            }
            renameFieldByInterfaceTypeNames[typeName][realName] = fieldName;
          }
          return [realName, fieldConfig];
        }
        return null;
      },
      [MapperKind.ENUM_VALUE]: (enumValueConfig, enumName, _schema, externalValue) => {
        const enumValueDirectives = getDefDirectives(enumValueConfig);
        const sourceDirectives = enumValueDirectives.filter(
          directive => directive.name === 'source',
        );
        const sourceDirective = sourceDirectives.find(
          directive => directive.args.subgraph === subgraph,
        );
        if (sourceDirective != null) {
          const realValue = sourceDirective.args.name ?? externalValue;
          if (externalValue !== realValue) {
            if (!renameEnumValueByEnumTypeNames[enumName]) {
              renameEnumValueByEnumTypeNames[enumName] = {};
            }
            renameEnumValueByEnumTypeNames[enumName][realValue] = externalValue;
          }
          return [realValue, enumValueConfig];
        }
        return null;
      },
    });
    const transforms: Transform[] = [];
    if (Object.keys(renameTypeNames).length > 0) {
      transforms.push(
        new RenameRootFields((_operation, fieldName) => renameTypeNames[fieldName] || fieldName),
      );
    }
    if (Object.keys(renameFieldByObjectTypeNames).length > 0) {
      transforms.push(
        new RenameObjectFieldArguments((typeName, fieldName, _fieldConfig) => {
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
    subschemaMap.set(subgraph, {
      schema: subgraphSchema,
      transforms,
    });
  }
  return {
    subschemaMap,
    transportEntryMap,
    additionalTypeDefs,
    additionalResolversFromTypeDefs,
  };
}

function getDefDirectives({ astNode, extensions }: { astNode?: ASTNode | null; extensions?: any }) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      directiveAnnotations.push({
        name: directiveNode.name.value,
        args:
          directiveNode.arguments?.reduce(
            (acc, arg) => {
              acc[arg.name.value] = valueFromASTUntyped(arg.value);
              return acc;
            },
            {} as Record<string, any>,
          ) ?? {},
      });
    });
  }
  if (extensions?.directives != null) {
    for (const directiveName in extensions.directives) {
      const directiveExt = extensions.directives[directiveName];
      if (directiveExt != null) {
        if (Array.isArray(directiveExt)) {
          directiveExt.forEach(directive => {
            directiveAnnotations.push({
              name: directiveName,
              args: directive,
            });
          });
        } else {
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
