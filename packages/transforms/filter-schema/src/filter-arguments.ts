import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { RootFieldFilter } from '@graphql-tools/utils';
import { TransformRootFields } from '@graphql-tools/wrap';
import { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLSchema } from 'graphql';

export type FieldArgumentFilter = (argName: string) => boolean;

export class FilterRootFieldArguments implements Transform {
  private readonly transformer: TransformRootFields;

  constructor(fieldFilter: RootFieldFilter, argFilter: FieldArgumentFilter) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        fieldConfig: GraphQLFieldConfig<any, any>
      ) => {
        if (fieldFilter(operation, fieldName, fieldConfig)) {
          const args = Object.keys(fieldConfig.args)
            .filter((argName: string) => argFilter(argName))
            .reduce((prev, key) => {
              prev[key] = fieldConfig.args[key];
              return prev;
            }, {} as GraphQLFieldConfigArgumentMap);

          return { ...fieldConfig, args };
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
