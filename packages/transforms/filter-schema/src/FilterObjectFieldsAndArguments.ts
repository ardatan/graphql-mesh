import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { FieldFilter } from '@graphql-tools/utils';
import { TransformObjectFields } from '@graphql-tools/wrap';
import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';

import { FieldArgumentFilter, filterFieldArguments } from './common';

export default class FilterObjectFieldsAndArguments implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(fieldFilter: FieldFilter, argFilter: FieldArgumentFilter) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        if (fieldFilter(typeName, fieldName, fieldConfig)) {
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
