import { Logger, MeshMerger, MeshMergerContext, MeshMergerOptions, RawSourceOutput } from '@graphql-mesh/types';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { wrapSchema } from '@graphql-tools/wrap';
import {
  groupTransforms,
  applySchemaTransforms,
  extractResolvers,
  AggregateError,
  jitExecutorFactory,
} from '@graphql-mesh/utils';
import { StitchingInfo } from '@graphql-tools/delegate';
import { stitchingDirectives, federationToStitchingSDL } from '@graphql-tools/stitching-directives';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema, ExecutionResult, parse } from 'graphql';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';
import { Executor } from '@graphql-tools/utils';

const APOLLO_GET_SERVICE_DEFINITION_QUERY = /* GraphQL */ `
  query __ApolloGetServiceDefinition__ {
    _service {
      sdl
    }
  }
`;

export default class StitchingMerger implements MeshMerger {
  name = 'stitching';
  private logger: Logger;
  private store: MeshStore;
  constructor(options: MeshMergerOptions) {
    this.logger = options.logger;
    this.store = options.store;
  }

  async getUnifiedSchema(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers, transforms } = context;
    this.logger.debug(`Stitching directives are being generated`);
    const defaultStitchingDirectives = stitchingDirectives({
      pathToDirectivesInExtensions: ['directives'],
    });
    await Promise.all(
      rawSources.map(async rawSource => {
        const rawSourceQueryType = rawSource.schema.getQueryType();
        const queryTypeFields = rawSourceQueryType.getFields();
        if ('_service' in queryTypeFields) {
          const oldSchema = rawSource.schema;
          const resolvers = extractResolvers(oldSchema);
          rawSource.executor =
            rawSource.executor ||
            (jitExecutorFactory(
              oldSchema,
              rawSource.name,
              this.logger.child(`${rawSource.name} - JIT Executor`)
            ) as Executor);
          rawSource.schema = await this.store
            .proxy(`${rawSource.name}_stitching`, PredefinedProxyOptions.GraphQLSchemaWithDiffing)
            .getWithSet(async () => {
              this.logger.debug(`Fetching Apollo Federated Service SDL for ${rawSource.name}`);
              const sdlQueryResult = (await rawSource.executor({
                document: parse(APOLLO_GET_SERVICE_DEFINITION_QUERY),
                operationType: 'query',
              })) as ExecutionResult;
              if (sdlQueryResult.errors?.length) {
                throw new AggregateError(
                  sdlQueryResult.errors,
                  `Failed on fetching Federated SDL for ${rawSource.name}`
                );
              }
              const federationSdl = sdlQueryResult.data._service.sdl;
              this.logger.debug(`Generating Stitching SDL for ${rawSource.name}`);
              const stitchingSdl = federationToStitchingSDL(federationSdl, defaultStitchingDirectives);
              return buildSchema(stitchingSdl);
            });
          addResolversToSchema({
            schema: rawSource.schema,
            resolvers,
            updateResolversInPlace: true,
            resolverValidationOptions: {
              requireResolversToMatchSchema: 'ignore',
            },
          });
        }
      })
    );
    /*
    rawSources.forEach(rawSource => {
      if (!rawSource.executor) {
        rawSource.executor = jitExecutorFactory(
          rawSource.schema,
          rawSource.name,
          logger.child(`${rawSource.name} - JIT Executor`)
        );
      }
    });
    */
    this.logger.debug(`Stitching the source schemas`);
    let unifiedSchema = stitchSchemas({
      subschemas: rawSources,
      typeDefs,
      resolvers,
      subschemaConfigTransforms: [defaultStitchingDirectives.stitchingDirectivesTransformer],
      typeMergingOptions: {
        validationSettings: {
          validationLevel: ValidationLevel.Off,
        },
      },
    });
    this.logger.debug(`sourceMap is being generated and attached to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    Object.assign(unifiedSchema.extensions, {
      sourceMap: new Proxy({} as any, {
        get: (_, pKey) => {
          if (pKey === 'get') {
            return (rawSource: RawSourceOutput) => {
              const stitchingInfo: StitchingInfo = unifiedSchema.extensions.stitchingInfo;
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
    if (transforms?.length) {
      this.logger.debug(`Root level transformations are being applied`);
      const { noWrapTransforms, wrapTransforms } = groupTransforms(transforms);
      if (wrapTransforms.length) {
        unifiedSchema = wrapSchema({
          schema: unifiedSchema,
          transforms: wrapTransforms,
          batch: true,
          // executor: jitExecutorFactory(unifiedSchema, 'wrapped', logger.child('JIT Executor')),
        });
      }
      if (noWrapTransforms.length) {
        unifiedSchema = applySchemaTransforms(unifiedSchema, { schema: unifiedSchema }, null, noWrapTransforms);
      }
    }
    return unifiedSchema;
  }
}
