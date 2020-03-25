import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema, IResolvers } from 'graphql-tools-fork';
import { fake } from 'faker';

const mockingTransform: TransformFn<YamlConfig.MockingConfig> = ({
  schema,
  config
}): GraphQLSchema => {

    if (config.if) {
        const newResolvers: IResolvers = {};

        for (const fieldConfig of config.fields) {
            if (fieldConfig.if) {
                const [typeName, fieldName] = fieldConfig.apply.split('.');
                newResolvers[typeName] = newResolvers[typeName] || {};
                if (fieldConfig.faker) {
                    newResolvers[typeName][fieldName] = () => fake(fieldConfig.faker);
                }
                if (fieldConfig.custom) {
                    const [moduleName, exportName] = fieldConfig.custom.split('#');
                    const m = require(moduleName);
                    const exportedVal = m[exportName] || (m.default && m.default[exportName]);
                    newResolvers[typeName][fieldName] = typeof exportedVal === 'function' ? exportedVal : () => exportedVal;
                }
            }
        }
    
        addResolveFunctionsToSchema({ 
            schema, 
            resolvers: newResolvers,
        });
    }

    return schema;
};

export default mockingTransform;
