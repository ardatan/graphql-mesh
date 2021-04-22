import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { addMocksToSchema, IMocks } from '@graphql-tools/mock';
import * as faker from 'faker';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';

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
      const mocks: IMocks = {};
      const resolvers: any = {};
      if (this.config.mocks) {
        for (const fieldConfig of this.config.mocks) {
          const fieldConfigIf = 'if' in fieldConfig ? fieldConfig.if : true;
          if (fieldConfigIf) {
            const [typeName, fieldName] = fieldConfig.apply.split('.');
            if (fieldName) {
              if (fieldConfig.faker) {
                const prevFn: any = mocks[typeName];
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
                const exportedVal = loadFromModuleExportExpressionSync<any>(fieldConfig.custom, { cwd: this.baseDir });
                const prevFn: any = mocks[typeName];
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = typeof exportedVal === 'function' ? exportedVal : () => exportedVal;
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
                const [moduleName, exportName] = fieldConfig.custom.split('#');
                const m = require(moduleName);
                const exportedVal = m[exportName] || (m.default && m.default[exportName]);
                mocks[typeName] = typeof exportedVal === 'function' ? exportedVal : () => exportedVal;
              }
            }
          }
        }
      }
      return addMocksToSchema({
        schema,
        mocks,
        resolvers,
        preserveResolvers: this.config?.preserveResolvers,
      });
    }
    return schema;
  }
}
