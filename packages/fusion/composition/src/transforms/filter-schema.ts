import type { GraphQLFieldConfig, GraphQLInputFieldConfig, GraphQLNamedType } from 'graphql';
import { DirectiveLocation, GraphQLDirective, GraphQLSchema } from 'graphql';
import { Minimatch } from 'minimatch';
import {
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type SchemaMapper,
} from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose.js';

export interface FilterTransformConfig {}

export function addHiddenDirective(directableObj: Parameters<typeof getDirectiveExtensions>[0]) {
  const directives = getDirectiveExtensions(directableObj);
  directives.hidden = [{}];
  const extensions: any = (directableObj.extensions ||= {});
  extensions.directives = directives;
  directableObj.astNode = undefined;
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
    schemaMapper[MapperKind.ROOT_FIELD] = (fieldConfig, fieldName, typeName: string) => {
      const filterResult = programmaticFilters.rootFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        addHiddenDirective(fieldConfig);
      }
      return [fieldName, fieldConfig];
    };
  }
  if (typeFilters.length) {
    schemaMapper[MapperKind.TYPE] = type => {
      for (const filter of typeFilters) {
        const filterResult = filter(type);
        if (filterResult != null && !filterResult) {
          addHiddenDirective(type);
          return type;
        }
      }
      return type;
    };
  }
  if (argumentFilters.length || fieldFilters.length) {
    schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName, typeName: string) => {
      for (const filter of fieldFilters) {
        const filterResult = filter(typeName, fieldName, fieldConfig);
        if (filterResult != null && !filterResult) {
          addHiddenDirective(fieldConfig);
          return fieldConfig;
        }
      }
      if (argumentFilters.length && 'args' in fieldConfig && fieldConfig.args) {
        for (const argName in fieldConfig.args) {
          const argConfig = fieldConfig.args[argName];
          for (const argFilter of argumentFilters) {
            const argFilterResult = argFilter(typeName, fieldName, argName);
            if (argFilterResult != null && !argFilterResult) {
              addHiddenDirective(argConfig);
              break;
            }
          }
        }
      }
      return fieldConfig;
    };
  }
  if (programmaticFilters.objectFieldFilter) {
    schemaMapper[MapperKind.OBJECT_FIELD] = (fieldConfig, fieldName, typeName: string) => {
      const filterResult = programmaticFilters.objectFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        addHiddenDirective(fieldConfig);
        return [fieldName, fieldConfig];
      }
    };
  }
  if (programmaticFilters.interfaceFieldFilter) {
    schemaMapper[MapperKind.INTERFACE_FIELD] = (fieldConfig, fieldName, typeName: string) => {
      const filterResult = programmaticFilters.interfaceFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        addHiddenDirective(fieldConfig);
        return [fieldName, fieldConfig];
      }
    };
  }
  if (programmaticFilters.inputObjectFieldFilter) {
    schemaMapper[MapperKind.INPUT_OBJECT_FIELD] = (fieldConfig, fieldName, typeName: string) => {
      const filterResult = programmaticFilters.inputObjectFieldFilter(typeName, fieldName);
      if (filterResult != null && !filterResult) {
        addHiddenDirective(fieldConfig);
        return fieldConfig;
      }
    };
  }

  return function filterTransform(schema) {
    const mappedSchema = mapSchema(schema, schemaMapper);
    const mappedSchemaConfig = mappedSchema.toConfig();
    return new GraphQLSchema({
      ...mappedSchemaConfig,
      directives: [...mappedSchemaConfig.directives, hiddenDirective],
    });
  };
}

export const hiddenDirective = new GraphQLDirective({
  name: 'hidden',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.OBJECT,
    DirectiveLocation.INTERFACE,
    DirectiveLocation.INPUT_FIELD_DEFINITION,
    DirectiveLocation.ARGUMENT_DEFINITION,
    DirectiveLocation.INPUT_OBJECT,
  ],
});
