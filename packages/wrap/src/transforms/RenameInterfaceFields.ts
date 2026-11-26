import { type GraphQLFieldConfig, type GraphQLSchema } from 'graphql';
import {
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import type { ExecutionRequest } from '@graphql-tools/utils';
import TransformInterfaceFields from './TransformInterfaceFields.js';

interface RenameInterfaceFieldsTransformationContext extends Record<string, any> {}

export default class RenameInterfaceFields<TContext = Record<string, any>> implements Transform<
  RenameInterfaceFieldsTransformationContext,
  TContext
> {
  private readonly transformer: TransformInterfaceFields<TContext>;

  constructor(
    renamer: (
      typeName: string,
      fieldName: string,
      fieldConfig: GraphQLFieldConfig<any, any>,
    ) => string,
  ) {
    this.transformer = new TransformInterfaceFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => [
        renamer(typeName, fieldName, fieldConfig),
        fieldConfig,
      ],
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
    transformationContext: RenameInterfaceFieldsTransformationContext,
  ): ExecutionRequest {
    return this.transformer.transformRequest(
      originalRequest,
      delegationContext,
      transformationContext,
    );
  }
}
