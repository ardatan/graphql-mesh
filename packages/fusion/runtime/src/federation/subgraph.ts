import type { GraphQLArgument, GraphQLFieldConfigArgumentMap } from 'graphql';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLSchema,
  GraphQLString,
  isObjectType,
  isOutputType,
  Kind,
  parseType,
  typeFromAST,
  visit,
} from 'graphql';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import {
  getDirectiveExtensions,
  resolveAdditionalResolversWithoutImport,
} from '@graphql-mesh/utils';
import type { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import {
  astFromField,
  MapperKind,
  mapSchema,
  type IResolvers,
  type TypeSource,
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
import { compareSubgraphNames, type getOnSubgraphExecute } from '../utils.js';

export interface HandleFederationSubschemaOpts {
  subschemaConfig: SubschemaConfig & { endpoint?: string };
  realSubgraphNameMap?: Map<string, string>;
  schemaDirectives?: Record<string, any>;
  transportEntryMap: Record<string, TransportEntry>;
  additionalTypeDefs: TypeSource[];
  additionalResolvers: IResolvers<unknown, any>[];
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
  onSubgraphExecute: ReturnType<typeof getOnSubgraphExecute>;
}

export function handleFederationSubschema({
  subschemaConfig,
  realSubgraphNameMap,
  schemaDirectives,
  transportEntryMap,
  additionalTypeDefs,
  additionalResolvers,
  stitchingDirectivesTransformer,
  onSubgraphExecute,
}: HandleFederationSubschemaOpts) {
  // Fix name
  const subgraphName = (subschemaConfig.name =
    realSubgraphNameMap?.get(subschemaConfig.name) || subschemaConfig.name);
  const subgraphDirectives = getDirectiveExtensions(subschemaConfig.schema);
  for (const directiveName in schemaDirectives || subgraphDirectives) {
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
  const subgraphExtensions: Record<string, unknown> = (subschemaConfig.schema.extensions ||= {});
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
  const renameArgByFieldByTypeNames: Record<string, Record<string, Record<string, string>>> = {};
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
      }
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length > 0) {
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
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length > 0) {
        return null;
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
      const additionalFieldDirectives = fieldDirectives.additionalField;
      if (additionalFieldDirectives?.length > 0) {
        return null;
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
        return [
          realValue,
          {
            ...enumValueConfig,
            value: realValue,
          },
        ];
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
