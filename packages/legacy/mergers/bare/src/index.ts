import FederationMerger from '@graphql-mesh/merger-federation';
import type { MeshMerger, MeshMergerContext, MeshMergerOptions } from '@graphql-mesh/types';
import { applySchemaTransforms, extendSchemaPreservingExtensions } from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { asArray, mapSchema } from '@graphql-tools/utils';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  private federationMerger: FederationMerger;
  constructor(private options: MeshMergerOptions) {}

  handleSingleWrappedExtendedSource(mergerCtx: MeshMergerContext) {
    // switch to federation merger (compose + in-process executors)
    this.name = 'federation';
    this.options.log.debug(
      `Switching to Federation merger due to the transforms and additional resolvers`,
    );
    this.options.log = this.options.log.child({ proxy: 'federation' });
    this.federationMerger = this.federationMerger || new FederationMerger(this.options);
    return this.federationMerger.getUnifiedSchema(mergerCtx);
  }

  handleSingleRegularSource({ rawSources: [rawSource], typeDefs, resolvers }: MeshMergerContext) {
    let schema = rawSource.schema;
    if (typeDefs.length > 0 || asArray(resolvers).length > 0) {
      for (const typeDef of typeDefs) {
        // graphql@16 extendSchema drops schema.extensions (Connectors @source/@link).
        schema = extendSchemaPreservingExtensions(schema, typeDef);
      }
      for (const resolversObj of asArray(resolvers)) {
        addResolversToSchema({
          schema,
          resolvers: resolversObj,
          updateResolversInPlace: true,
        });
      }
    }
    this.options.log.debug(`Attaching a dummy sourceMap to the final schema`);
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
    // Multi-source: federation is the only merger path.
    return this.handleSingleWrappedExtendedSource({ rawSources, typeDefs, resolvers });
  }
}
