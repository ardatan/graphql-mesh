import { GraphQLSchema, GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions, ImportFn } from '@graphql-mesh/types';
import { addMocksToSchema, createMockStore, IMocks } from '@graphql-tools/mock';
import faker from 'faker';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

import { mocks as graphqlScalarsMocks } from 'graphql-scalars';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import { getResolversFromSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';

export default class MockingTransform implements MeshTransform {
  noWrap = true;
  private config: YamlConfig.MockingConfig;
  private baseDir: string;
  private importFn: ImportFn;

  constructor({ baseDir, config, importFn }: MeshTransformOptions<YamlConfig.MockingConfig>) {
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
  }

  transformSchema(schema: GraphQLSchema, context: any, transformedSchema: GraphQLSchema) {
    const configIf = this.config != null && 'if' in this.config ? this.config.if : true;
    if (configIf) {
      const mocks: IMocks = {
        ...graphqlScalarsMocks,
      };
      const resolvers: any = {};
      const typeMap = schema.getTypeMap();
      for (const typeName in typeMap) {
        const type = typeMap[typeName];
        const examples = type.extensions.examples as any[];
        if (examples?.length) {
          mocks[typeName] = () => examples[Math.floor(Math.random() * examples.length)];
        }
      }
      if (this.config?.mocks?.length) {
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
                const exportedVal$ = loadFromModuleExportExpression<any>(fieldConfig.custom, {
                  cwd: this.baseDir,
                  defaultExportName: 'default',
                  importFn: this.importFn,
                });
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                  context = context || {};
                  context.mockStore = store;
                  return exportedVal$.then(exportedVal =>
                    typeof exportedVal === 'function' ? exportedVal(root, args, context, info) : exportedVal
                  );
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
                  const resolverData = { root, args, context, info, random: Date.now().toString(), env: process.env };
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
                  const key = keyFactory({ root, args, context, info, env: process.env });
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
                const exportedVal$ = loadFromModuleExportExpression<any>(fieldConfig.custom, {
                  cwd: this.baseDir,
                  defaultExportName: 'default',
                  importFn: this.importFn,
                });
                mocks[typeName] = () => {
                  return exportedVal$.then(exportedVal =>
                    typeof exportedVal === 'function' ? exportedVal(store) : exportedVal
                  );
                };
              }
            }
          }
        }
      }
      const store = createMockStore({ schema, mocks });
      if (this.config?.initializeStore) {
        const initializeStoreFn$ = loadFromModuleExportExpression(this.config.initializeStore, {
          cwd: this.baseDir,
          defaultExportName: 'default',
          importFn: this.importFn,
        });
        // eslint-disable-next-line no-void
        void initializeStoreFn$.then(fn => fn(store));
      }
      const newResolvers = getResolversFromSchema(
        addMocksToSchema({
          schema: transformedSchema,
          store,
          mocks,
          resolvers,
          preserveResolvers: this.config?.preserveResolvers,
        }),
        true
      );
      addResolversToSchema({
        schema: transformedSchema,
        resolvers: newResolvers,
        updateResolversInPlace: true,
      });
    }
    return schema;
  }
}
