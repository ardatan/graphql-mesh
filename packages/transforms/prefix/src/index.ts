import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { RenameTypes, RenameRootFields } from '@graphql-tools/wrap';
import { ExecutionResult, Request } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

export default class PrefixTransform implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.PrefixTransformConfig>) {
    const { apiName, config } = options;
    let prefix: string | null = null;

    if (config.value) {
      prefix = config.value;
    } else if (apiName) {
      prefix = `${apiName}_`;
    }

    if (!prefix) {
      throw new Error(`Transform 'prefix' has missing config: prefix`);
    }

    const ignoreList = config.ignore || [];

    this.transforms.push(
      new RenameTypes(typeName => (ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`))
    );

    if (config.includeRootOperations) {
      this.transforms.push(
        new RenameRootFields((typeName, fieldName) =>
          ignoreList.includes(typeName) || ignoreList.includes(`${typeName}.${fieldName}`)
            ? fieldName
            : `${prefix}${fieldName}`
        )
      );
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
