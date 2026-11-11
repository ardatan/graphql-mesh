import {
  DirectiveLocation,
  getNamedType,
  GraphQLDirective,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  isInterfaceType,
  isObjectType,
  type GraphQLField,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
} from 'graphql';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { applyHoistAliasToConnectSelection, TransformValidationError } from './utils.js';

export interface CreateHoistFieldTransformOpts {
  mapping?: HoistFieldMappingObject[];
}

export interface HoistFieldMappingObject {
  /**
   * Type name that defines where field should be hoisted to
   */
  typeName: string;
  /**
   * Array of field names to reach the field to be hoisted
   */
  pathConfig: (string | HoistFieldTransformFieldPathConfigObject)[];
  /**
   * Name the hoisted field should have when hoisted to the type specified in typeName
   */
  newFieldName: string;

  alias?: string;

  /**
   * Defines if args in path are filtered (default = false)
   */
  filterArgsInPath?: boolean;
}

export interface HoistFieldTransformFieldPathConfigObject {
  fieldName: string;
  filterArgs?: string[];
}

function assertTypeWithFields(
  type: GraphQLNamedType,
): asserts type is GraphQLObjectType | GraphQLInterfaceType {
  if (!checkTypeWithFields(type)) {
    throw new TransformValidationError(
      `Type ${type.name} is not an object or interface type, so you cannot apply hoisting for this type`,
    );
  }
}
function checkTypeWithFields(
  type: GraphQLNamedType,
): type is GraphQLObjectType | GraphQLInterfaceType {
  return isObjectType(type) || isInterfaceType(type);
}

export const hoistDirective = new GraphQLDirective({
  name: 'hoist',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    pathConfig: {
      type: new GraphQLScalarType({
        name: '_HoistConfig',
      }),
    },
  },
});

export function createHoistFieldTransform(opts: CreateHoistFieldTransformOpts): SubgraphTransform {
  return function hoistFieldTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const hoistAliasesByReturnType = new Map<
      string,
      Array<{ path: string[]; newFieldName: string }>
    >();
    const mappedSchema = mapSchema(schema, {
      [MapperKind.TYPE](type) {
        if (opts.mapping) {
          if (checkTypeWithFields(type)) {
            let changed = false;
            const fields = type.getFields();
            const typeConfig = type.toConfig();
            const newFieldConfigMap = typeConfig.fields;
            for (const mapping of opts.mapping) {
              if (type.name === mapping.typeName) {
                const pathConfig = mapping.pathConfig[0];
                let fieldName = typeof pathConfig === 'string' ? pathConfig : pathConfig.fieldName;
                let field: GraphQLField<any, any> = fields[fieldName];
                const pathConfigArr = [...mapping.pathConfig.slice(1)];
                let filteredArgs: string[] | undefined =
                  typeof pathConfig === 'object' ? pathConfig.filterArgs : undefined;
                const argsConfig: GraphQLFieldConfigArgumentMap = {};
                const pathFieldNames: string[] = [fieldName];
                while (pathConfigArr.length > 0) {
                  if (!field) {
                    throw new TransformValidationError(
                      `Field ${fieldName} not found for the hoisting of ${type.name}, so you cannot apply hoisting`,
                    );
                  }
                  for (const arg of field.args) {
                    if (filteredArgs) {
                      if (filteredArgs.includes(arg.name)) {
                        continue;
                      }
                    } else if (mapping.filterArgsInPath) {
                      continue;
                    }
                    argsConfig[arg.name] = arg;
                  }
                  const fieldType = getNamedType(field.type);
                  assertTypeWithFields(fieldType);
                  const subFields = fieldType.getFields();
                  const pathPart = pathConfigArr.shift();
                  filteredArgs = typeof pathPart === 'string' ? [] : pathPart.filterArgs || [];
                  fieldName = typeof pathPart === 'string' ? pathPart : pathPart.fieldName;
                  pathFieldNames.push(fieldName);
                  field = subFields[fieldName];
                }
                changed = true;
                const existingFieldConfig = newFieldConfigMap[mapping.newFieldName];
                // Keep Mesh `@hoist` for non-Connectors runtimes; Connectors also get a
                // selection alias below so Apollo Router does not need `@hoist`.
                newFieldConfigMap[mapping.newFieldName] = {
                  ...(existingFieldConfig || {}),
                  args: argsConfig,
                  type: field.type,
                  extensions: {
                    ...existingFieldConfig?.extensions,
                    directives: {
                      ...(existingFieldConfig?.extensions?.directives as Record<string, any>),
                      hoist: [
                        {
                          subgraph: subgraphConfig.name,
                          pathConfig: mapping.pathConfig,
                        },
                      ],
                    },
                  },
                };
                const aliases = hoistAliasesByReturnType.get(type.name) || [];
                aliases.push({ path: pathFieldNames, newFieldName: mapping.newFieldName });
                hoistAliasesByReturnType.set(type.name, aliases);
              }
            }
            if (changed) {
              return new (Object.getPrototypeOf(type).constructor)({
                ...typeConfig,
                fields: newFieldConfigMap,
              });
            }
          }
        }
        return type;
      },
    });
    const withConnectAliases =
      hoistAliasesByReturnType.size === 0
        ? mappedSchema
        : mapSchema(mappedSchema, {
            [MapperKind.FIELD]: fieldConfig => {
              const directives = getDirectiveExtensions(fieldConfig);
              const connectList = directives?.connect;
              if (!connectList?.length) {
                return fieldConfig;
              }
              const returnTypeName = getNamedType(fieldConfig.type).name;
              const aliases = hoistAliasesByReturnType.get(returnTypeName);
              if (!aliases?.length) {
                return fieldConfig;
              }
              const nextConnect = connectList.map((connectArgs: any) => {
                if (typeof connectArgs?.selection !== 'string') {
                  return connectArgs;
                }
                let selection = connectArgs.selection;
                for (const alias of aliases) {
                  selection = applyHoistAliasToConnectSelection(
                    selection,
                    alias.path,
                    alias.newFieldName,
                  );
                }
                return { ...connectArgs, selection };
              });
              return {
                ...fieldConfig,
                extensions: {
                  ...fieldConfig.extensions,
                  directives: {
                    ...directives,
                    connect: nextConnect,
                  },
                },
                astNode: undefined,
              };
            },
          });
    if (withConnectAliases.getDirective('hoist') == null) {
      return new GraphQLSchema({
        ...withConnectAliases.toConfig(),
        directives: [...withConnectAliases.toConfig().directives, hoistDirective],
      });
    }
    return withConnectAliases;
  };
}
