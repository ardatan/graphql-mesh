import { matcher } from 'micromatch';

import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { FilterRootFields, FilterObjectFields, FilterInputObjectFields, FilterTypes } from '@graphql-tools/wrap';
import { ExecutionResult, Request, pruneSchema } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

export default class FilterTransform implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.Transform['filterSchema']>) {
    const { config } = options;
    for (const filter of config) {
      const [typeName, fieldGlob] = filter.split('.');
      const isTypeMatch = matcher(typeName);
      if (!fieldGlob) {
        this.transforms.push(
          new FilterTypes(type => {
            return !isTypeMatch(type.name);
          })
        );
      } else {
        let fixedFieldGlob = fieldGlob;
        if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
          fixedFieldGlob = fieldGlob.replace('{', '').replace('}', '');
        }
        fixedFieldGlob = fixedFieldGlob.split(', ').join(',');
        const isMatch = matcher(fixedFieldGlob.trim());
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
