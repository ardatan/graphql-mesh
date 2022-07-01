import { MeshMerger, MeshMergerContext, Logger, MeshMergerOptions, RawSourceOutput } from '@graphql-mesh/types';
import { applySchemaTransforms } from '@graphql-mesh/utils';
import { addResolversToSchema, mergeSchemas } from '@graphql-tools/schema';
import { asArray } from '@graphql-tools/utils';
import { extendSchema, GraphQLSchema } from 'graphql';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  private logger: Logger;
  constructor(options: MeshMergerOptions) {
    this.logger = options.logger;
  }

  handleSingleSource({ rawSources: [rawSource], typeDefs, resolvers }: MeshMergerContext) {
    let schema = rawSource.schema;
    if (typeDefs.length > 0 || asArray(resolvers).length > 0) {
      for (const typeDef of typeDefs) {
        schema = extendSchema(schema, typeDef);
      }
      for (const resolversObj of asArray(resolvers)) {
        addResolversToSchema({
          schema,
          resolvers: resolversObj,
          updateResolversInPlace: true,
        });
      }
    }
    return {
      ...rawSource,
      schema,
    };
  }

  async getUnifiedSchema({ rawSources, typeDefs, resolvers }: MeshMergerContext) {
    if (rawSources.length === 1) {
      return this.handleSingleSource({ rawSources, typeDefs, resolvers });
    }
    const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
    this.logger.debug(`Applying transforms for each source`);
    const schemas = rawSources.map(source => {
      let schema = source.schema;
      let sourceLevelSchema = source.schema;

      schema = applySchemaTransforms(schema, undefined, schema, source.transforms);

      // After that step, it will be considered as root level schema
      sourceLevelSchema = schema;

      sourceMap.set(source, sourceLevelSchema);

      return schema;
    });

    this.logger.debug(`Merging sources`);
    const unifiedSchema = mergeSchemas({
      schemas,
      typeDefs,
      resolvers,
    });

    this.logger.debug(`Attaching sources to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });

    return {
      schema: unifiedSchema,
    };
  }
}
