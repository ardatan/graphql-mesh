import { GraphQLSchema, OperationTypeNode } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import {
  ExecutionRequest,
  ExecutionResult,
  getRootTypeMap,
  selectObjectFields,
} from '@graphql-tools/utils';
import { WrapType } from '@graphql-tools/wrap';

const OPERATION_TYPE_SUFFIX_MAP = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

const DEFAULT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

export default class EncapsulateTransform implements MeshTransform {
  private transformMap: Partial<Record<string, Transform>> = {};
  private transforms: Transform[] = [];
  private config: YamlConfig.Transform['encapsulate'];
  private name: string;

  constructor(options: MeshTransformOptions<YamlConfig.Transform['encapsulate']>) {
    this.config = options.config;
    this.name = this.config?.name || options.apiName;

    if (!this.name) {
      throw new Error(
        `Unable to execute encapsulate transform without a name. Please make sure to use it over a specific schema, or specify a name in your configuration!`,
      );
    }
  }

  *generateSchemaTransforms(originalWrappingSchema: GraphQLSchema) {
    const applyTo = { ...DEFAULT_APPLY_TO, ...(this.config?.applyTo || {}) } as Record<
      OperationTypeNode,
      boolean
    >;
    const outerTypeNames = getRootTypeMap(originalWrappingSchema);

    for (const operationType in applyTo) {
      if (applyTo[operationType as OperationTypeNode] === true) {
        const outerTypeName = outerTypeNames.get(operationType as OperationTypeNode)?.name;
        if (outerTypeName) {
          this.transformMap[outerTypeName] = new WrapType(
            outerTypeName,
            `${this.name}${OPERATION_TYPE_SUFFIX_MAP[operationType as OperationTypeNode]}`,
            this.name,
          ) as any;
        }
      }
    }

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
