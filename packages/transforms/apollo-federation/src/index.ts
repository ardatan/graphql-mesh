import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { transformSchemaFederation, FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';

export const extendFederation: TransformFn<YamlConfig.Transform['federation']> = ({
  schema,
  config
}): GraphQLSchema => {

    const federationConfig: FederationConfig<any> = {};

    if (config?.types) {
        for (const type of config.types) {
            const fields: FederationFieldsConfig = {};
            if (type.config?.fields) {
                for (const field of type.config.fields) {
                    fields[field.name] = field.config;
                }
            }
            federationConfig[type.name] = {
                ...type.config,
                fields,
            };
        }
    }

    const federationSchema = transformSchemaFederation(schema, federationConfig);

    return federationSchema;

};

export default extendFederation;
