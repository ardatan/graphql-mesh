import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { WrapType } from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest, selectObjectFields } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

const DEFUALT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

type RootType = 'Query' | 'Mutation' | 'Subscription';

export default class EncapsulateTransform implements MeshTransform {
  private transformMap: Partial<Record<RootType, Transform>> = {};
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
      this.transformMap.Query = new WrapType('Query', `${name}Query`, name) as any;
    }
    if (applyTo.mutation) {
      this.transformMap.Mutation = new WrapType('Mutation', `${name}Mutation`, name) as any;
    }
    if (applyTo.subscription) {
      this.transformMap.Subscription = new WrapType('Subscription', `${name}Subscription`, name) as any;
    }
  }

  *generateSchemaTransforms(originalWrappingSchema: GraphQLSchema) {
    for (const typeName of Object.keys(this.transformMap)) {
      const fieldConfigMap = selectObjectFields(originalWrappingSchema, typeName, () => true);
      if (Object.keys(fieldConfigMap).length) {
        yield this.transformMap[typeName];
      }
    }
  }

  transformSchema(originalWrappingSchema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
    this.transforms = [...this.generateSchemaTransforms(originalWrappingSchema)];
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, this.transforms);
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
