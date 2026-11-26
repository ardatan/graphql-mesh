import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isSpecifiedScalarType,
  type GraphQLFieldResolver,
  type GraphQLSchema,
} from 'graphql';
import {
  applySchemaTransforms,
  defaultMergedResolver,
  type Subschema,
  type SubschemaConfig,
} from '@graphql-tools/delegate';
import { MapperKind, mapSchema, memoize1 } from '@graphql-tools/utils';
import { generateProxyingResolvers } from './generateProxyingResolvers.js';

export const wrapSchema = memoize1(function wrapSchema<
  TConfig extends Record<string, any> = Record<string, any>,
>(
  subschemaConfig: SubschemaConfig<any, any, any, TConfig> | Subschema<any, any, any, TConfig>,
): GraphQLSchema {
  const targetSchema = subschemaConfig.schema;

  const proxyingResolvers = generateProxyingResolvers(subschemaConfig);
  const schema = createWrappingSchema(targetSchema, proxyingResolvers);
  const transformed = applySchemaTransforms(schema, subschemaConfig);
  return transformed;
});

function createWrappingSchema(
  schema: GraphQLSchema,
  proxyingResolvers: Record<string, Record<string, GraphQLFieldResolver<any, any>>>,
) {
  return mapSchema(schema, {
    [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) => {
      return {
        ...fieldConfig,
        ...proxyingResolvers[typeName]?.[fieldName],
      };
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      return {
        ...fieldConfig,
        resolve: defaultMergedResolver,
        subscribe: undefined,
      };
    },
    [MapperKind.OBJECT_TYPE]: type => {
      const config = type.toConfig();
      return new GraphQLObjectType({
        ...config,
        isTypeOf: undefined,
      });
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const config = type.toConfig();
      return new GraphQLInterfaceType({
        ...config,
        resolveType: undefined,
      });
    },
    [MapperKind.UNION_TYPE]: type => {
      const config = type.toConfig();
      return new GraphQLUnionType({
        ...config,
        resolveType: undefined,
      });
    },
    [MapperKind.ENUM_VALUE]: valueConfig => {
      return {
        ...valueConfig,
        value: undefined,
      };
    },
    [MapperKind.SCALAR_TYPE]: type => {
      if (isSpecifiedScalarType(type)) {
        return type;
      }
      // the subschema coerces scalars, so drop all coercion functions. graphql 17 has
      // the `coerce*` and `valueToLiteral` variants, kept off the literal to type
      // check against graphql 16 too
      const config = {
        ...type.toConfig(),
        serialize: undefined,
        parseValue: undefined,
        parseLiteral: undefined,
        coerceOutputValue: undefined,
        coerceInputValue: undefined,
        coerceInputLiteral: undefined,
        valueToLiteral: undefined,
      };
      return new GraphQLScalarType(config);
    },
  });
}
