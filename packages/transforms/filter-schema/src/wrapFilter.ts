import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { ExecutionResult, pruneSchema, Request } from '@graphql-tools/utils';
import {
  FilterRootFields,
  FilterObjectFields,
  FilterInputObjectFields,
  FilterTypes,
  TransformCompositeFields,
} from '@graphql-tools/wrap';
import { GraphQLSchema } from 'graphql';
import { matcher } from 'micromatch';

export default class WrapFilter implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.FilterSchemaTransform>) {
    const {
      config: { filters },
    } = options;

    for (const filter of filters) {
      const [typeName, fieldNameOrGlob, argsGlob] = filter.split('.');
      const isTypeMatch = matcher(typeName);

      // TODO: deprecate this in next major release as dscussed in #1605
      if (!fieldNameOrGlob) {
        this.transforms.push(
          new FilterTypes(type => {
            return isTypeMatch(type.name);
          })
        );
        continue;
      }

      let fixedFieldGlob = argsGlob || fieldNameOrGlob;
      if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
        fixedFieldGlob = fieldNameOrGlob.replace('{', '').replace('}', '');
      }
      fixedFieldGlob = fixedFieldGlob.split(', ').join(',');

      const isMatch = matcher(fixedFieldGlob.trim());

      if (typeName === 'Type') {
        this.transforms.push(
          new FilterTypes(type => {
            return isMatch(type.name);
          })
        );
        continue;
      }

      if (argsGlob) {
        const isFieldMatch = matcher(fieldNameOrGlob);

        this.transforms.push(
          new TransformCompositeFields((fieldTypeName, fieldName, fieldConfig) => {
            if (isTypeMatch(fieldTypeName) && isFieldMatch(fieldName)) {
              const fieldArgs = Object.entries(fieldConfig.args).reduce(
                (args, [argName, argConfig]) => (!isMatch(argName) ? args : { ...args, [argName]: argConfig }),
                {}
              );

              return { ...fieldConfig, args: fieldArgs };
            }
            return undefined;
          })
        );
        continue;
      }

      // If the glob is not for Types nor Args, finally we register Fields filters
      this.transforms.push(
        new FilterRootFields((rootTypeName, rootFieldName) => {
          if (isTypeMatch(rootTypeName)) {
            return isMatch(rootFieldName);
          }
          return true;
        })
      );

      this.transforms.push(
        new FilterObjectFields((objectTypeName, objectFieldName) => {
          if (isTypeMatch(objectTypeName)) {
            return isMatch(objectFieldName);
          }
          return true;
        })
      );

      this.transforms.push(
        new FilterInputObjectFields((inputObjectTypeName, inputObjectFieldName) => {
          if (isTypeMatch(inputObjectTypeName)) {
            return isMatch(inputObjectFieldName);
          }
          return true;
        })
      );
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ) {
    const returnedSchema = applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms
    );
    // TODO: Need a better solution
    return pruneSchema(returnedSchema, {
      skipEmptyCompositeTypePruning: false,
      skipEmptyUnionPruning: true,
      skipUnimplementedInterfacesPruning: true,
      skipUnusedTypesPruning: true,
    });
  }

  transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
