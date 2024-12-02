import {
  isNonNullType,
  type DirectiveLocation,
  type GraphQLDirective,
  type GraphQLFieldConfig,
  type GraphQLInputFieldConfig,
  type GraphQLNamedType,
  type GraphQLSchema,
  type isObjectType,
} from 'graphql';
import { Minimatch } from 'minimatch';
import {
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type DirectableObject,
  type SchemaMapper,
} from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose.js';

export interface FilterTransformConfig {}

export function addInaccessibleDirective(
  directableObj: Parameters<typeof getDirectiveExtensions>[0],
) {
  const directives = getDirectiveExtensions(directableObj);
  directives.inaccessible = [{}];
  const extensions: any = (directableObj.extensions ||= {});
  extensions.directives = directives;
  directableObj.astNode = undefined;
}

function compareAndAddInaccessibleDirective(
  originalSchema: GraphQLSchema,
  filteredSchema: GraphQLSchema,
) {
  return mapSchema(originalSchema, {
    [MapperKind.TYPE]: type => {
      const typeInFiltered = filteredSchema.getType(type.name);
      if (!typeInFiltered) {
        addInaccessibleDirective(type);
      } else if ('getFields' in type) {
        if (!('getFields' in typeInFiltered)) {
          addInaccessibleDirective(type);
        } else {
          const numOfFieldsInFiltered = Object.keys(typeInFiltered.getFields()).length;
          if (numOfFieldsInFiltered === 0) {
            addInaccessibleDirective(type);
          }
        }
      }
      return type;
    },
    [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
      const typeInFiltered = filteredSchema.getType(typeName);
      if (!typeInFiltered || !('getFields' in typeInFiltered)) {
        addInaccessibleDirective(fieldConfig);
      } else {
        const filteredFields = typeInFiltered.getFields();
        const fieldInFiltered = filteredFields[fieldName];
        if (!fieldInFiltered) {
          addInaccessibleDirective(fieldConfig);
        } else {
          if ('args' in fieldConfig && !('args' in fieldInFiltered)) {
            for (const argName in fieldConfig.args) {
              const argConfig = fieldConfig.args[argName];
              addInaccessibleDirective(argConfig);
            }
          } else if ('args' in fieldConfig && 'args' in fieldInFiltered) {
            const filteredArgs = fieldInFiltered.args;
            for (const argName in fieldConfig.args) {
              if (!filteredArgs.some(arg => arg.name === argName)) {
                const argConfig = fieldConfig.args[argName];
                addInaccessibleDirective(argConfig);
                if (isNonNullType(argConfig.type)) {
                  argConfig.type = argConfig.type.ofType;
                }
              }
            }
          }
        }
      }
      return fieldConfig;
    },
  });
}

export interface CreateFilterTransformOpts {
  // Declarative filters
  // TODO: For backwards compatibility; remove this in the next major
  /**
   * Array of filter rules
   */
  filters?: string[];
  /**
   * Filter deprecated types
   */
  filterDeprecatedTypes?: boolean;
  /**
   * Filter deprecated fields
   */
  filterDeprecatedFields?: boolean;

  // Programmatic filters
  rootFieldFilter?: (typeName: string, fieldName: string) => boolean;
  typeFilter?: (type: GraphQLNamedType) => boolean;
  fieldFilter?: (
    typeName: string,
    fieldName: string,
    fieldConfig: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
  ) => boolean;
  objectFieldFilter?: (typeName: string, fieldName: string) => boolean;
  interfaceFieldFilter?: (typeName: string, fieldName: string) => boolean;
  inputObjectFieldFilter?: (typeName: string, fieldName: string) => boolean;
  argumentFilter?: (typeName: string, fieldName: string, argName: string) => boolean;
}

export function createFilterTransform({
  // Declarative Filters
  filters,
  filterDeprecatedTypes,
  filterDeprecatedFields,

  // Programmatic Filters
  ...programmaticFilters
}: CreateFilterTransformOpts): SubgraphTransform {
  const typeFilters: CreateFilterTransformOpts['typeFilter'][] = programmaticFilters.typeFilter
    ? [programmaticFilters.typeFilter]
    : [];
  const fieldFilters: CreateFilterTransformOpts['fieldFilter'][] = programmaticFilters.fieldFilter
    ? [programmaticFilters.fieldFilter]
    : [];
  const argumentFilters: CreateFilterTransformOpts['argumentFilter'][] =
    programmaticFilters.argumentFilter ? [programmaticFilters.argumentFilter] : [];
  if (filters?.length) {
    for (const filter of filters) {
      const [typeName, fieldNameOrGlob, argsGlob] = filter.split('.');
      const typeMatcher = new Minimatch(typeName);

      // TODO: deprecate this in next major release as dscussed in #1605
      if (!fieldNameOrGlob) {
        typeFilters.push(type => typeMatcher.match(type.name));
        continue;
      }

      let fixedFieldGlob = argsGlob || fieldNameOrGlob;
      if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
        fixedFieldGlob = fieldNameOrGlob.replace('{', '').replace('}', '');
      }
      fixedFieldGlob = fixedFieldGlob.split(', ').join(',');

      const globalTypeMatcher = new Minimatch(fixedFieldGlob.trim());

      if (typeName === 'Type') {
        typeFilters.push(type => globalTypeMatcher.match(type.name));
        continue;
      }

      if (argsGlob) {
        const fieldMatcher = new Minimatch(fieldNameOrGlob);

        argumentFilters.push((typeName, fieldName, argName) => {
          if (typeMatcher.match(typeName) && fieldMatcher.match(fieldName)) {
            return globalTypeMatcher.match(argName);
          }
        });
        continue;
      }

      // If the glob is not for Types nor Args, finally we register Fields filters
      fieldFilters.push((typeName, fieldName) => {
        if (typeMatcher.match(typeName)) {
          return globalTypeMatcher.match(fieldName);
        }
        return true;
      });
    }
  }
  if (filterDeprecatedFields) {
    fieldFilters.push((_, __, fieldConfig) => !fieldConfig.deprecationReason);
  }
  if (filterDeprecatedTypes) {
    typeFilters.push(type => !getDirectiveExtensions(type)?.deprecated?.length);
  }

  const schemaMapper: SchemaMapper = {};
  if (programmaticFilters.rootFieldFilter) {
    schemaMapper[MapperKind.ROOT_FIELD] = (fieldConfig, fieldName, typeName: string, schema) => {
      const filterResult = programmaticFilters.rootFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        return null;
      }
    };
  }
  if (typeFilters.length) {
    schemaMapper[MapperKind.TYPE] = type => {
      for (const filter of typeFilters) {
        const filterResult = filter(type);
        if (filterResult != null && !filterResult) {
          return null;
        }
      }
      return type;
    };
  }
  if (argumentFilters.length || fieldFilters.length) {
    schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName, typeName: string, schema) => {
      for (const filter of fieldFilters) {
        const filterResult = filter(typeName, fieldName, fieldConfig);
        if (filterResult != null && !filterResult) {
          return null;
        }
      }
      if (argumentFilters.length && 'args' in fieldConfig && fieldConfig.args) {
        const newArgs = {};
        for (const argName in fieldConfig.args) {
          const argConfig = fieldConfig.args[argName];
          let filtered = false;
          for (const argFilter of argumentFilters) {
            const argFilterResult = argFilter(typeName, fieldName, argName);
            if (argFilterResult != null && !argFilterResult) {
              filtered = true;
              break;
            }
          }
          if (!filtered) {
            newArgs[argName] = argConfig;
          }
        }
        fieldConfig.args = newArgs;
      }
      return fieldConfig;
    };
  }
  if (programmaticFilters.objectFieldFilter) {
    schemaMapper[MapperKind.OBJECT_FIELD] = (fieldConfig, fieldName, typeName, schema) => {
      const filterResult = programmaticFilters.objectFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        return null;
      }
    };
  }
  if (programmaticFilters.interfaceFieldFilter) {
    schemaMapper[MapperKind.INTERFACE_FIELD] = (
      fieldConfig,
      fieldName,
      typeName: string,
      schema,
    ) => {
      const filterResult = programmaticFilters.interfaceFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        return null;
      }
    };
  }
  if (programmaticFilters.inputObjectFieldFilter) {
    schemaMapper[MapperKind.INPUT_OBJECT_FIELD] = (
      fieldConfig,
      fieldName,
      typeName: string,
      schema,
    ) => {
      const filterResult = programmaticFilters.inputObjectFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        return null;
      }
    };
  }

  return function filterTransform(schema) {
    return compareAndAddInaccessibleDirective(schema, mapSchema(schema, schemaMapper));
  };
}
