import type { GraphQLSchema } from 'graphql';
import { Minimatch } from 'minimatch';
import type { YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  FilterInputObjectFields,
  FilterInterfaceFields,
  FilterObjectFields,
  FilterRootFields,
  FilterTypes,
  TransformCompositeFields,
} from '@graphql-tools/wrap';

export default class WrapFilter implements Transform {
  private transforms: Transform[] = [];
  constructor({
    config: { filters, filterDeprecatedFields, filterDeprecatedTypes },
  }: {
    config: YamlConfig.FilterSchemaTransform;
  }) {
    for (const filter of filters) {
      const [typeName, fieldNameOrGlob, argsGlob] = filter.split('.');
      const typeMatcher = new Minimatch(typeName);

      // TODO: deprecate this in next major release as dscussed in #1605
      if (!fieldNameOrGlob) {
        this.transforms.push(
          new FilterTypes(type => {
            return typeMatcher.match(type.name);
          }) as any,
        );
        continue;
      }

      let fixedFieldGlob = argsGlob || fieldNameOrGlob;
      if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
        fixedFieldGlob = fieldNameOrGlob.replace('{', '').replace('}', '');
      }
      fixedFieldGlob = fixedFieldGlob.split(', ').join(',');

      const globalTypeMatcher = new Minimatch(fixedFieldGlob.trim());

      if (typeName === 'Type') {
        this.transforms.push(
          new FilterTypes(type => {
            return globalTypeMatcher.match(type.name);
          }),
        );
        continue;
      }

      if (argsGlob) {
        const fieldMatcher = new Minimatch(fieldNameOrGlob);

        this.transforms.push(
          new TransformCompositeFields((fieldTypeName, fieldName, fieldConfig) => {
            if (typeMatcher.match(fieldTypeName) && fieldMatcher.match(fieldName)) {
              const fieldArgs = Object.entries(fieldConfig.args).reduce(
                (args, [argName, argConfig]) =>
                  !globalTypeMatcher.match(argName) ? args : { ...args, [argName]: argConfig },
                {},
              );

              return { ...fieldConfig, args: fieldArgs };
            }
            return undefined;
          }),
        );
        continue;
      }

      // If the glob is not for Types nor Args, finally we register Fields filters
      this.transforms.push(
        new FilterRootFields((rootTypeName, rootFieldName) => {
          if (typeMatcher.match(rootTypeName)) {
            return globalTypeMatcher.match(rootFieldName);
          }
          return true;
        }),
      );

      this.transforms.push(
        new FilterObjectFields((objectTypeName, objectFieldName) => {
          if (typeMatcher.match(objectTypeName)) {
            return globalTypeMatcher.match(objectFieldName);
          }
          return true;
        }),
      );

      this.transforms.push(
        new FilterInputObjectFields((inputObjectTypeName, inputObjectFieldName) => {
          if (typeMatcher.match(inputObjectTypeName)) {
            return globalTypeMatcher.match(inputObjectFieldName);
          }
          return true;
        }),
      );

      this.transforms.push(
        new FilterInterfaceFields((interfaceTypeName, interfaceFieldName) => {
          if (typeMatcher.match(interfaceTypeName)) {
            return globalTypeMatcher.match(interfaceFieldName);
          }
          return true;
        }),
      );
    }
    if (filterDeprecatedFields) {
      this.transforms.push(
        new FilterRootFields((_, fieldName, fieldConfig) => {
          return !fieldConfig.deprecationReason;
        }),
      );
      this.transforms.push(
        new FilterObjectFields((_, fieldName, fieldConfig) => {
          return !fieldConfig.deprecationReason;
        }),
      );
      this.transforms.push(
        new FilterInputObjectFields((_, fieldName, fieldConfig) => {
          return !fieldConfig.deprecationReason;
        }),
      );
      this.transforms.push(
        new FilterInterfaceFields((_, fieldName, fieldConfig) => {
          return !fieldConfig.deprecationReason;
        }),
      );
    }
    if (filterDeprecatedTypes) {
      this.transforms.push(
        new FilterTypes(type => {
          return !type.astNode?.directives?.some(
            directive => directive.name.value === 'deprecated',
          );
        }),
      );
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema,
  ) {
    let finalSchema = applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
    finalSchema = mapSchema(finalSchema, {
      [MapperKind.ROOT_OBJECT]: type => {
        if (Object.keys(type.getFields()).length === 0) return null;
      },
    });
    return finalSchema;
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>,
  ) {
    return applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }

  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: any,
  ) {
    return applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }
}
