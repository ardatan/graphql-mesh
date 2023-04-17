import { GraphQLSchema } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { ExecutionRequest, ExecutionResult, selectObjectFields } from '@graphql-tools/utils';
import { WrapType } from '@graphql-tools/wrap';

const DEFAULT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

const DEFAULT_OUTER_TYPE_NAMES = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

export default class EncapsulateTransform implements MeshTransform {
  private transformMap: Partial<Record<string, Transform>> = {};
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.Transform['encapsulate']>) {
    const config = options.config;
    const name = config?.name || options.apiName;

    if (!name) {
      throw new Error(
        `Unable to execute encapsulate transform without a name. Please make sure to use it over a specific schema, or specify a name in your configuration!`,
      );
    }

    const applyTo = { ...DEFAULT_APPLY_TO, ...(config?.applyTo || {}) };
    const outerTypeNames = { ...DEFAULT_OUTER_TYPE_NAMES, ...(config?.outerTypeName || {}) };

    if (applyTo.query) {
      this.transformMap[outerTypeNames.query] = new WrapType(
        outerTypeNames.query,
        `${name}Query`,
        name,
      ) as any;
    }
    if (applyTo.mutation) {
      this.transformMap[outerTypeNames.mutation] = new WrapType(
        outerTypeNames.mutation,
        `${name}Mutation`,
        name,
      ) as any;
    }
    if (applyTo.subscription) {
      this.transformMap[outerTypeNames.subscription] = new WrapType(
        outerTypeNames.subscription,
        `${name}Subscription`,
        name,
      ) as any;
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

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema,
  ) {
    this.transforms = [...this.generateSchemaTransforms(originalWrappingSchema)];
    return applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
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
