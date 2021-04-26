import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { WrapType } from '@graphql-tools/wrap';
import { ExecutionResult, Request, selectObjectFields } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

const DEFUALT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

type RootType = 'Query' | 'Mutation' | 'Subscription';

export default class EncapsulateTransform implements MeshTransform {
  private transforms: Partial<Record<RootType, Transform>> = {};

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
      this.transforms.Query = new WrapType('Query', `${name}Query`, name);
    }
    if (applyTo.mutation) {
      this.transforms.Mutation = new WrapType('Mutation', `${name}Mutation`, name);
    }
    if (applyTo.subscription) {
      this.transforms.Subscription = new WrapType('Subscription', `${name}Subscription`, name);
    }
  }

  *generateSchemaTransforms(originalWrappingSchema: GraphQLSchema) {
    for (const typeName of Object.keys(this.transforms)) {
      const fieldConfigMap = selectObjectFields(originalWrappingSchema, typeName, () => true);
      if (Object.keys(fieldConfigMap).length) {
        yield this.transforms[typeName];
      }
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ) {
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema, [
      ...this.generateSchemaTransforms(originalWrappingSchema),
    ]);
  }

  transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      Object.values(this.transforms)
    );
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      Object.values(this.transforms)
    );
  }
}
