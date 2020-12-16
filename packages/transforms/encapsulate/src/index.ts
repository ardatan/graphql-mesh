import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { WrapType } from '@graphql-tools/wrap';
import { ExecutionResult, Request } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

const DEFUALT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

export default class EncapsulateTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.Transform['encapsulate']>) {
    const config = options.config;
    const name = config?.name || options.apiName;

    if (!name) {
      throw new Error(
        `Unable to execute encapsulate transform without a name. Please make sure to use it over a specific schema, or specify a name in your configuration!`
      );
    }

    const applyTo = { ...DEFUALT_APPLY_TO, ...(config?.applyTo || {}) };

    if (applyTo.query) {
      this.transforms.push(new WrapType('Query', `${name}Query`, name));
    }
    if (applyTo.mutation) {
      this.transforms.push(new WrapType('Mutation', `${name}Mutation`, name));
    }
    if (applyTo.subscription) {
      this.transforms.push(new WrapType('Subscription', `${name}Subscription`, name));
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
