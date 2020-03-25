import { GraphQLSchema, isObjectType, isListType } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { addMockFunctionsToSchema, IMocks } from 'graphql-tools-fork';
import { fake } from 'faker';

const mockingTransform: TransformFn<YamlConfig.MockingConfig> = async ({
  schema,
  config
}): Promise<GraphQLSchema> => {
    const configIf = 'if' in config ? config.if : true;
    if (configIf) {
        let mocks: IMocks = {};
        if (config.mocks) {
            for (const fieldConfig of config.mocks) {
                const fieldConfigIf = 'if' in fieldConfig ? fieldConfig.if : true;
                if (fieldConfigIf) {
                    const [typeName, fieldName] = fieldConfig.apply.split('.');
                    mocks[typeName] = mocks[typeName] || (() => ({}));
                    if (fieldName) {
                        if (fieldConfig.faker) {
                            const prevFn = mocks[typeName];
                            mocks[typeName] = (...args) => {
                                const prevObj = prevFn(...args);
                                prevObj[fieldName] = () => fake(fieldConfig.faker || '');
                                return prevObj;
                            };
                        } else if (fieldConfig.custom) {
                            const [moduleName, exportName] = fieldConfig.custom.split('#');
                            const m = await import(moduleName);
                            const exportedVal = m[exportName] || (m.default && m.default[exportName]);
                            const prevFn = mocks[typeName];
                            mocks[typeName] = (...args) => {
                                const prevObj = prevFn(...args);
                                prevObj[fieldName] = typeof exportedVal === 'function' ? exportedVal : () => exportedVal;
                                return prevObj;
                            };
                        }
                    } else {
                        if (fieldConfig.faker) {
                            mocks[typeName] = () => fake(fieldConfig.faker || '');
                        } else if (fieldConfig.custom) {
                            const [moduleName, exportName] = fieldConfig.custom.split('#');
                            const m = await import(moduleName);
                            const exportedVal = m[exportName] || (m.default && m.default[exportName]);
                            mocks[typeName] = typeof exportedVal === 'function' ? exportedVal : () => exportedVal;
                        }
                    }
                }
            }
        
        }
        addMockFunctionsToSchema({ 
            schema, 
            mocks,
            preserveResolvers: config?.preserveResolvers,
        });
    }

    return schema;
};

export default mockingTransform;
