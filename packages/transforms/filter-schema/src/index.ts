import { matcher } from 'micromatch';

import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions , applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { FilterRootFields, FilterObjectFields, FilterInputObjectFields, FilterTypes } from '@graphql-tools/wrap';
import { ExecutionResult, Request } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';


export default class FilterTransform implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.Transform['filterSchema']>) {
    const { config } = options;
    for (const filter of config) {
      const [typeName, fieldGlob] = filter.split('.');
      if (!fieldGlob) {
        const isMatch = matcher(typeName);
        this.transforms.push(
          new FilterTypes(type => {
            return !isMatch(type.name);
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
            if (rootTypeName === typeName) {
              return isMatch(rootFieldName);
            }
            return true;
          })
        );
        this.transforms.push(
          new FilterObjectFields((objectTypeName, objectFieldName) => {
            if (objectTypeName === typeName) {
              return isMatch(objectFieldName);
            }
            return true;
          })
        );
        this.transforms.push(
          new FilterInputObjectFields((inputObjectTypeName, inputObjectFieldName) => {
            if (inputObjectTypeName === typeName) {
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
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema, this.transforms);
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
