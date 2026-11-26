import { type GraphQLSchema } from 'graphql';
import { type SubschemaConfig, type Transform } from '@graphql-tools/delegate';
import { valueMatchesCriteria } from '@graphql-tools/utils';
import FilterInterfaceFields from './FilterInterfaceFields.js';
import FilterObjectFields from './FilterObjectFields.js';

interface RemoveObjectFieldsWithDeprecationTransformationContext extends Record<string, any> {}

/**
 * Removes object (and matching interface) fields whose deprecation reason matches.
 *
 * Interface fields are filtered with the same predicate so the resulting schema
 * remains valid: object types cannot keep fields that were removed from an
 * interface they implement. If you previously relied on object-only filtering,
 * also run `FilterInterfaceFields` is no longer required — this transform does both.
 */
export default class RemoveObjectFieldsWithDeprecation<
  TContext = Record<string, any>,
> implements Transform<RemoveObjectFieldsWithDeprecationTransformationContext, TContext> {
  private readonly objectTransformer: FilterObjectFields<TContext>;
  private readonly interfaceTransformer: FilterInterfaceFields<TContext>;

  constructor(reason: string | RegExp) {
    const filter = (
      _typeName: string,
      _fieldName: string,
      fieldConfig: { deprecationReason?: string | null },
    ) => {
      // Treat empty-string reasons as present so they can match "".
      if (fieldConfig.deprecationReason != null) {
        return !valueMatchesCriteria(fieldConfig.deprecationReason, reason);
      }
      return true;
    };
    this.objectTransformer = new FilterObjectFields(filter);
    this.interfaceTransformer = new FilterInterfaceFields(filter);
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    return this.interfaceTransformer.transformSchema(
      this.objectTransformer.transformSchema(originalWrappingSchema, subschemaConfig),
      subschemaConfig,
    );
  }
}
