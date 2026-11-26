import { type GraphQLInputFieldConfig, type GraphQLSchema } from 'graphql';
import {
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import type { ExecutionRequest, InputFieldFilter } from '@graphql-tools/utils';
import { type InputObjectNodeTransformer } from '../types.js';
import TransformInputObjectFields from './TransformInputObjectFields.js';

interface FilterInputObjectFieldsTransformationContext extends Record<string, any> {}

export default class FilterInputObjectFields<TContext = Record<string, any>> implements Transform<
  FilterInputObjectFieldsTransformationContext,
  TContext
> {
  private readonly transformer: TransformInputObjectFields<TContext>;

  constructor(filter: InputFieldFilter, inputObjectNodeTransformer?: InputObjectNodeTransformer) {
    this.transformer = new TransformInputObjectFields(
      (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) =>
        filter(typeName, fieldName, inputFieldConfig) ? undefined : null,
      undefined,
      inputObjectNodeTransformer,
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: FilterInputObjectFieldsTransformationContext,
  ): ExecutionRequest {
    return this.transformer.transformRequest(
      originalRequest,
      delegationContext,
      transformationContext,
    );
  }
}
