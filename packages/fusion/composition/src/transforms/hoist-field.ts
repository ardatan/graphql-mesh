import type {
  GraphQLField,
  GraphQLFieldConfigArgumentMap,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import { getNamedType, isInterfaceType, isObjectType, isOutputType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { TransformValidationError } from './utils.js';

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

export function createHoistFieldTransform(opts: CreateHoistFieldTransformOpts): SubgraphTransform {
  return function hoistFieldTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    return mapSchema(schema, {
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
                  field = subFields[fieldName];
                }
                changed = true;
                const existingFieldConfig = newFieldConfigMap[mapping.newFieldName];
                const directives = getDirectiveExtensions(existingFieldConfig);
                const newSourceDirectives = directives?.source?.map(directive => {
                  if (directive.subgraph === subgraphConfig.name) {
                    return {
                      ...directive,
                      hoist: mapping.pathConfig,
                    };
                  }
                  return directive;
                });
                newFieldConfigMap[mapping.newFieldName] = {
                  ...(existingFieldConfig || {}),
                  args: argsConfig,
                  type: field.type,
                  extensions: {
                    ...existingFieldConfig?.extensions,
                    directives: {
                      ...directives,
                      source: newSourceDirectives,
                    },
                  },
                };
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
  };
}
