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
    const unifiedSchema = stitchSchemas({
      subschemas: rawSources,
      typeDefs,
      resolvers,
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
    this.log.debug(`sourceMap is being generated and attached to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
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
