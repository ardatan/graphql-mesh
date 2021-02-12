import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { RootFieldFilter } from '@graphql-tools/utils';
import { TransformRootFields } from '@graphql-tools/wrap';
import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';

import { FieldArgumentFilter, filterFieldArguments } from './common';

export class FilterRootFieldsAndArguments implements Transform {
  private readonly transformer: TransformRootFields;

  constructor(fieldFilter: RootFieldFilter, argFilter: FieldArgumentFilter) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        fieldConfig: GraphQLFieldConfig<any, any>
      ) => {
        if (fieldFilter(operation, fieldName, fieldConfig)) {
          return filterFieldArguments(fieldName, fieldConfig, argFilter);
        }

        return null;
      }
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }
}
