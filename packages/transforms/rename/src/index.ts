import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  RenameObjectFields,
  RenameRootFields,
  RenameRootTypes,
  RenameInputObjectFields,
} from '@graphql-tools/wrap';
import { ExecutionResult, Request } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

export default class RenameTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.RenameTransformObject[]>) {
    const { config } = options;
    for (const change of config) {
      const [fromTypeName, fromFieldName] = change.from.split('.');
      const [toTypeName, toFieldName] = change.to.split('.');

      if (fromTypeName !== toTypeName) {
        this.transforms.push(new RenameRootTypes(t => (t === fromTypeName ? toTypeName : t)));
        this.transforms.push(new RenameTypes(t => (t === fromTypeName ? toTypeName : t)));
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        this.transforms.push(
          new RenameRootFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
        this.transforms.push(
          new RenameObjectFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
        this.transforms.push(
          new RenameInputObjectFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
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
