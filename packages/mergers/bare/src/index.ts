import { MeshMerger, MeshMergerContext, Logger, MeshMergerOptions, RawSourceOutput } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { mergeSchemas } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  private logger: Logger;
  constructor(options: MeshMergerOptions) {
    this.logger = options.logger;
  }

  async getUnifiedSchema({ rawSources, typeDefs, resolvers, transforms }: MeshMergerContext) {
    const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
    this.logger.debug(() => `Applying transforms for each source`);
    const schemas = rawSources.map(source => {
      let schema = source.schema;
      let sourceLevelSchema = source.schema;

      const handlerLevelTransformGroups = groupTransforms(source.transforms || []);

      if (handlerLevelTransformGroups.wrapTransforms.length > 0 || source.executor) {
        schema = wrapSchema({
          batch: true,
          ...source,
          schema,
        } as any);
      } else {
        schema = applySchemaTransforms(schema, undefined, schema, handlerLevelTransformGroups.noWrapTransforms);
      }

      // After that step, it will be considered as root level schema
      sourceLevelSchema = schema;

      sourceMap.set(source, sourceLevelSchema);

      return schema;
    });

    this.logger.debug(() => `Merging sources`);
    let unifiedSchema =
      schemas.length === 1 && !typeDefs?.length && !resolvers
        ? schemas[0]
        : mergeSchemas({
            schemas,
            typeDefs,
            resolvers,
          });

    this.logger.debug(() => `Handling root level transforms`);
    const rootLevelTransformGroups = groupTransforms(transforms || []);

    if (rootLevelTransformGroups.wrapTransforms.length > 0) {
      unifiedSchema = wrapSchema({
        schema: unifiedSchema,
        batch: true,
        transforms,
      } as any);
    } else {
      unifiedSchema = applySchemaTransforms(
        unifiedSchema,
        undefined,
        unifiedSchema,
        rootLevelTransformGroups.noWrapTransforms
      );
    }

    this.logger.debug(() => `Attaching sources to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });
    return unifiedSchema;
  }
}
