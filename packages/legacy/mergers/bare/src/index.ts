import type { GraphQLSchema } from 'graphql';
import { extendSchema } from 'graphql';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import type {
  MeshMerger,
  MeshMergerContext,
  MeshMergerOptions,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { applySchemaTransforms } from '@graphql-mesh/utils';
import { addResolversToSchema, mergeSchemas } from '@graphql-tools/schema';
import { asArray, mapSchema } from '@graphql-tools/utils';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  private stitchingMerger: StitchingMerger;
  constructor(private options: MeshMergerOptions) {}

  handleSingleWrappedExtendedSource(mergerCtx: MeshMergerContext) {
    // switch to stitching merger
    this.name = 'stitching';
    this.options.logger.debug(
      `Switching to Stitching merger due to the transforms and additional resolvers`,
    );
    this.options.logger = this.options.logger.child({ proxy: 'stitching' });
    this.stitchingMerger = this.stitchingMerger || new StitchingMerger(this.options);
    return this.stitchingMerger.getUnifiedSchema(mergerCtx);
  }

  handleSingleRegularSource({ rawSources: [rawSource], typeDefs, resolvers }: MeshMergerContext) {
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
    this.options.logger.debug(`Attaching a dummy sourceMap to the final schema`);
    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'sourceMap', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: {
        get() {
          // We should return a version of the schema only with the source-level transforms
          // But we should prevent the existing schema from being mutated internally
          const nonExecutableSchema = mapSchema(schema);
          return applySchemaTransforms(
            nonExecutableSchema,
            rawSource,
            nonExecutableSchema,
            rawSource.transforms,
          );
        },
      },
    });
    return {
      ...rawSource,
      schema,
    };
  }

  getUnifiedSchema({ rawSources, typeDefs, resolvers }: MeshMergerContext) {
    if (rawSources.length === 1) {
      if (
        (rawSources[0].executor || rawSources[0].transforms?.length) &&
        (typeDefs.length > 0 || asArray(resolvers).length > 0)
      ) {
        return this.handleSingleWrappedExtendedSource({ rawSources, typeDefs, resolvers });
      }
      return this.handleSingleRegularSource({ rawSources, typeDefs, resolvers });
    }
    const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
    this.options.logger.debug(`Applying transforms for each source`);
    const schemas = rawSources.map(source => {
      let schema = source.schema;
      let sourceLevelSchema = source.schema;

      schema = applySchemaTransforms(schema, undefined, schema, source.transforms);

      // After that step, it will be considered as root level schema
      sourceLevelSchema = schema;

      sourceMap.set(source, sourceLevelSchema);

      return schema;
    });

    this.options.logger.debug(`Merging sources`);
    const unifiedSchema = mergeSchemas({
      schemas,
      typeDefs,
      resolvers,
    });

    this.options.logger.debug(`Attaching sources to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });

    return {
      schema: unifiedSchema,
    };
  }
}
