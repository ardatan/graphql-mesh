import { GraphQLSchema, GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { addMocksToSchema, createMockStore, IMocks } from '@graphql-tools/mock';
import faker from 'faker';
import { getInterpolatedStringFactory, loadFromModuleExportExpression } from '@graphql-mesh/utils';

import { mocks as graphqlScalarsMocks } from 'graphql-scalars';

export default class MockingTransform implements MeshTransform {
  private config: YamlConfig.MockingConfig;
  private baseDir: string;

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.MockingConfig>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema) {
    const configIf = 'if' in this.config ? this.config.if : true;
    if (configIf) {
      const store = createMockStore({ schema });
      const mocks: IMocks = {
        ...graphqlScalarsMocks,
      };
      const resolvers: any = {};
      if (this.config.initializeStore) {
        loadFromModuleExportExpression(this.config.initializeStore, { cwd: this.baseDir }).then(initializeStore =>
          initializeStore(store)
        );
      }
      if (this.config.mocks) {
        for (const fieldConfig of this.config.mocks) {
          const fieldConfigIf = 'if' in fieldConfig ? fieldConfig.if : true;
          if (fieldConfigIf) {
            const [typeName, fieldName] = fieldConfig.apply.split('.');
            if (fieldName) {
              if (fieldConfig.faker) {
                let fakerFn: Function; // eslint-disable-line
                const [service, method] = fieldConfig.faker.split('.');
                if (service in faker) {
                  fakerFn = () => (faker as any)[service][method]();
                } else {
                  fakerFn = () => faker.fake(fieldConfig.faker || '');
                }
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = fakerFn;
              } else if (fieldConfig.custom) {
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = async (
                  root: any,
                  args: any,
                  context: any,
                  info: GraphQLResolveInfo
                ) => {
                  context = context || {};
                  context.mockStore = store;
                  const exportedVal = await loadFromModuleExportExpression<any>(fieldConfig.custom, {
                    cwd: this.baseDir,
                  });
                  return typeof exportedVal === 'function' ? exportedVal(root, args, context, info) : exportedVal;
                };
              } else if ('length' in fieldConfig) {
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = () => new Array(fieldConfig.length).fill({});
              } else if ('updateStore' in fieldConfig) {
                const getFromStoreKeyFactory = getInterpolatedStringFactory(fieldConfig.store.key);
                const updateStoreFactories = fieldConfig.updateStore.map(updateStoreConfig => ({
                  updateStoreConfig,
                  keyFactory: getInterpolatedStringFactory(updateStoreConfig.key),
                  valueFactory: getInterpolatedStringFactory(updateStoreConfig.value),
                }));
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                  const resolverData = { root, args, context, info, random: Date.now().toString() };
                  updateStoreFactories.forEach(({ updateStoreConfig, keyFactory, valueFactory }) => {
                    const key = keyFactory(resolverData);
                    const value = valueFactory(resolverData);
                    store.set(updateStoreConfig.type, key, updateStoreConfig.fieldName, value);
                  });
                  const key = getFromStoreKeyFactory(resolverData);
                  return store.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
                };
              } else if ('store' in fieldConfig) {
                const keyFactory = getInterpolatedStringFactory(fieldConfig.store.key);
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                  const key = keyFactory({ root, args, context, info });
                  return store.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
                };
              }
            } else {
              if (fieldConfig.faker) {
                let fakerFn: GraphQLFieldResolver<any, any, { [argName: string]: any }>;
                const [service, method] = fieldConfig.faker.split('.');
                if (service in faker) {
                  fakerFn = () => (faker as any)[service][method]();
                } else {
                  fakerFn = () => faker.fake(fieldConfig.faker || '');
                }
                mocks[typeName] = fakerFn;
              } else if (fieldConfig.custom) {
                mocks[typeName] = async () => {
                  const exportedVal = await loadFromModuleExportExpression<any>(fieldConfig.custom, {
                    cwd: this.baseDir,
                  });
                  return typeof exportedVal === 'function' ? exportedVal(store) : exportedVal;
                };
              }
            }
          }
        }
      }
      return addMocksToSchema({
        schema,
        store,
        mocks,
        resolvers,
        preserveResolvers: this.config?.preserveResolvers,
      });
    }
    return schema;
  }
}
