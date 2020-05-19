import { GraphQLSchema, GraphQLObjectType, GraphQLID, isNonNullType, GraphQLNonNull } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { transformSchemaFederation, FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';

const extendFederation: TransformFn<YamlConfig.Transform['federation']> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  const federationConfig: FederationConfig<any> = {};

  if (config?.types) {
    for (const type of config.types) {
      const fields: FederationFieldsConfig = {};
      if (type.config?.fields) {
        for (const field of type.config.fields) {
          fields[field.name] = field.config;
        }
      }
      // If a field is a key field, it should be GraphQLID

      if (type.config?.keyFields) {
        for (const fieldName of type.config.keyFields) {
          const objectType = schema.getType(type.name) as GraphQLObjectType;
          const existingType = objectType.getFields()[fieldName].type;
          objectType.getFields()[fieldName].type = isNonNullType(existingType) ? GraphQLNonNull(GraphQLID) : GraphQLID;
        }
      }

      const resolveReference =
        type.config?.resolveReference && (await loadFromModuleExportExpression(type.config.resolveReference));
      federationConfig[type.name] = {
        ...type.config,
        resolveReference,
        fields,
      };
    }
  }

  const federationSchema = transformSchemaFederation(schema, federationConfig);

  return federationSchema;
};

export default extendFederation;
