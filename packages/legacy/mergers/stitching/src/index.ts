import { GraphQLSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type {
  MeshMerger,
  MeshMergerContext,
  MeshMergerOptions,
  RawSourceOutput,
} from '@graphql-mesh/types';
import type { StitchingInfo } from '@graphql-tools/delegate';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';

export default class StitchingMerger implements MeshMerger {
  name = 'stitching';
  private log: Logger;
  constructor(options: MeshMergerOptions) {
    this.log = options.log;
  }

  getUnifiedSchema(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers } = context;
    this.log.debug(`Stitching the source schemas`);
    // Third-party schemas (e.g. GitHub) can violate GraphQL 17 rules such as
    // interface/implementation deprecation consistency. Handlers already load
    // with assumeValid; stitchSchemas' extendSchema path drops that flag, so
    // re-mark the unified schema (same approach as the bare merger).
    const stitchedSchema = stitchSchemas({
      subschemas: rawSources,
      typeDefs,
      resolvers,
      assumeValid: true,
      resolverValidationOptions: {
        requireResolversForAllFields: 'ignore',
        requireResolversForArgs: 'ignore',
        requireResolversForNonScalar: 'ignore',
        requireResolversForResolveType: 'ignore',
        requireResolversToMatchSchema: 'ignore',
      },
      typeMergingOptions: {
        validationSettings: {
          validationLevel: ValidationLevel.Off,
        },
      },
      mergeDirectives: true,
    });
    const unifiedSchema = new GraphQLSchema({
      ...stitchedSchema.toConfig(),
      assumeValid: true,
    });
    // stitchSchemas replaces extensions with stitchingInfo only — restore schema
    // directive apps (Connectors `@source` / `@link`) from subschemas.
    const mergedSchemaDirectives: Record<string, unknown[]> = {
      ...(((unifiedSchema.extensions as any)?.directives as Record<string, unknown[]>) || {}),
    };
    for (const rawSource of rawSources) {
      const fromSub = (rawSource.schema.extensions as any)?.directives as
        Record<string, unknown[]> | undefined;
      if (!fromSub) continue;
      for (const [name, vals] of Object.entries(fromSub)) {
        const list = Array.isArray(vals) ? vals : [vals];
        mergedSchemaDirectives[name] = [...(mergedSchemaDirectives[name] || []), ...list];
      }
    }
    this.log.debug(`sourceMap is being generated and attached to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    if (Object.keys(mergedSchemaDirectives).length) {
      (unifiedSchema.extensions as any).directives = mergedSchemaDirectives;
    }
    Object.assign(unifiedSchema.extensions, {
      sourceMap: new Proxy({} as any, {
        get: (_, pKey) => {
          if (pKey === 'get') {
            return (rawSource: RawSourceOutput) => {
              const stitchingInfo = unifiedSchema.extensions.stitchingInfo as StitchingInfo;
              for (const [subschemaConfig, subschema] of stitchingInfo.subschemaMap) {
                if ((subschemaConfig as RawSourceOutput).name === rawSource.name) {
                  return subschema.transformedSchema;
                }
              }
              return undefined;
            };
          }
          return () => {
            throw new Error('Not Implemented');
          };
        },
      }),
    });
    return {
      schema: unifiedSchema,
    };
  }
}
