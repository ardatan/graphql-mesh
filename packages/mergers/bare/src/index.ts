import { MeshMerger, MeshMergerContext, MeshTransform, Logger, MeshMergerOptions } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { addResolversToSchema, mergeSchemas } from '@graphql-tools/schema';
import { asArray } from '@graphql-tools/utils';
import { extendSchema } from 'graphql';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  private logger: Logger;
  constructor(options: MeshMergerOptions) {
    this.logger = options.logger;
  }

  handleSingleSource({ rawSources, typeDefs, resolvers, transforms }: MeshMergerContext) {
    const [source] = rawSources;
    let schema = source.schema;

    let wrapTransforms: MeshTransform[] = [];
    let noWrapTransforms: MeshTransform[] = [];

    if (transforms?.length) {
      const transformGroups = groupTransforms(transforms);
      wrapTransforms = transformGroups.wrapTransforms;
      noWrapTransforms = transformGroups.noWrapTransforms;
    }

    if (source.executor || source.transforms.length) {
      const firstRoundTransforms = [...source.transforms];
      if (!typeDefs && !resolvers) {
        firstRoundTransforms.push(...wrapTransforms, ...noWrapTransforms);
      }
      schema = wrapSchema({
        ...source,
        schema,
        transforms: firstRoundTransforms,
        batch: true,
      });
    }
    if (typeDefs || resolvers) {
      this.logger.debug(() => `Applying additionalTypeDefs`);
      typeDefs?.forEach(typeDef => {
        schema = extendSchema(schema, typeDef);
      });
      if (resolvers) {
        this.logger.debug(() => `Applying additionalResolvers`);
        for (const resolversObj of asArray(resolvers)) {
          schema = addResolversToSchema({
            schema,
            resolvers: resolversObj,
            updateResolversInPlace: true,
          });
        }
      }
      if (wrapTransforms.length) {
        schema = wrapSchema({
          schema,
          transforms: [...wrapTransforms, ...noWrapTransforms],
          batch: true,
        });
      } else if (noWrapTransforms.length) {
        schema = applySchemaTransforms(schema, undefined, schema, noWrapTransforms);
      }
    }
    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'sourceMap', {
      get: () => new Map([[source, schema]]),
    });
    return schema;
  }

  async getUnifiedSchema(mergerContext: MeshMergerContext) {
    if (mergerContext.rawSources.length === 1) {
      return this.handleSingleSource(mergerContext);
    }

    const { rawSources, typeDefs, resolvers, transforms } = mergerContext;
    const sourceMap = new Map();
    const schemas = rawSources.map(source => {
      let schema = source.schema;

      if (source.executor || source.transforms.length) {
        schema = wrapSchema({
          ...source,
          schema,
          transforms: source.transforms,
          batch: true,
        });
      }
      sourceMap.set(source, schema);
      return schema;
    });

    let schema = mergeSchemas({
      schemas,
      typeDefs,
      resolvers,
    });

    let wrapTransforms: MeshTransform[] = [];
    let noWrapTransforms: MeshTransform[] = [];

    if (transforms?.length) {
      const transformGroups = groupTransforms(transforms);
      wrapTransforms = transformGroups.wrapTransforms;
      noWrapTransforms = transformGroups.noWrapTransforms;
    }

    if (wrapTransforms.length) {
      schema = wrapSchema({
        schema,
        transforms: [...wrapTransforms, ...noWrapTransforms],
        batch: true,
      });
    } else if (noWrapTransforms.length) {
      schema = applySchemaTransforms(schema, undefined, schema, noWrapTransforms);
    }

    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });
    return schema;
  }
}
