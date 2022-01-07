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
import { StitchingInfo, SubschemaConfig } from '@graphql-tools/delegate';
import {
  stitchingDirectives,
  federationToStitchingSDL,
  StitchingDirectivesResult,
} from '@graphql-tools/stitching-directives';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema, ExecutionResult, GraphQLSchema, parse } from 'graphql';
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

  private isFederatedSchema(schema: GraphQLSchema) {
    const queryType = schema.getQueryType();
    if (queryType) {
      const queryFields = queryType.getFields();
      return '_service' in queryFields;
    }
    return false;
  }

  private async replaceFederationSDLWithStitchingSDL(
    name: string,
    oldSchema: GraphQLSchema,
    executor: Executor,
    stitchingDirectives: StitchingDirectivesResult
  ) {
    const rawSourceLogger = this.logger.child(name);

    rawSourceLogger.debug(() => `Extracting existing resolvers if available`);
    const resolvers = extractResolvers(oldSchema);

    let newSchema = await this.store
      .proxy(`${name}_stitching`, PredefinedProxyOptions.GraphQLSchemaWithDiffing)
      .getWithSet(async () => {
        this.logger.debug(() => `Fetching Apollo Federated Service SDL for ${name}`);
        const sdlQueryResult: any = (await executor({
          document: parse(APOLLO_GET_SERVICE_DEFINITION_QUERY),
        })) as ExecutionResult;
        if (sdlQueryResult.errors?.length) {
          throw new AggregateError(sdlQueryResult.errors, `Failed on fetching Federated SDL for ${name}`);
        }
        const federationSdl = sdlQueryResult.data._service.sdl;
        this.logger.debug(() => `Generating Stitching SDL for ${name}`);
        const stitchingSdl = federationToStitchingSDL(federationSdl, stitchingDirectives);
        return buildSchema(stitchingSdl);
      });

    rawSourceLogger.debug(() => `Adding existing resolvers back to the schema`);
    newSchema = addResolversToSchema({
      schema: newSchema,
      resolvers,
      updateResolversInPlace: true,
      resolverValidationOptions: {
        requireResolversToMatchSchema: 'ignore',
      },
    });

    return newSchema;
  }

  async getUnifiedSchema(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers, transforms } = context;
    this.logger.debug(() => `Stitching directives are being generated`);
    const defaultStitchingDirectives = stitchingDirectives({
      pathToDirectivesInExtensions: ['directives'],
    });
    this.logger.debug(() => `Checking if any of sources has federation metadata`);
    const subschemas = (await Promise.all(
      rawSources.map(async rawSource => {
        let newExecutor = rawSource.executor;
        if (!newExecutor) {
          newExecutor = jitExecutorFactory(
            rawSource.schema,
            rawSource.name,
            this.logger.child(`${rawSource.name} - JIT Executor`)
          );
        }
        let newSchema = rawSource.schema;
        if (this.isFederatedSchema(newSchema)) {
          this.logger.debug(() => `${rawSource.name} has federated schema.`);
          newSchema = await this.replaceFederationSDLWithStitchingSDL(
            rawSource.name,
            newSchema,
            newExecutor,
            defaultStitchingDirectives
          );
        }
        return {
          batch: true,
          ...rawSource,
          schema: newSchema,
          executor: newExecutor,
        };
      })
    )) as SubschemaConfig[];
    this.logger.debug(() => `Stitching the source schemas`);
    let unifiedSchema = stitchSchemas({
      subschemas,
      typeDefs,
      resolvers,
      subschemaConfigTransforms: [defaultStitchingDirectives.stitchingDirectivesTransformer],
      typeMergingOptions: {
        validationSettings: {
          validationLevel: ValidationLevel.Off,
        },
      },
    });
    this.logger.debug(() => `sourceMap is being generated and attached to the unified schema`);
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
    if (transforms?.length) {
      this.logger.debug(() => `Root level transformations are being applied`);
      const { noWrapTransforms, wrapTransforms } = groupTransforms(transforms);
      if (wrapTransforms.length) {
        unifiedSchema = wrapSchema({
          schema: unifiedSchema,
          transforms: wrapTransforms,
          batch: true,
          executor: jitExecutorFactory(unifiedSchema, 'root-wrapped', this.logger.child('JIT Executor')) as any,
        });
      }
      if (noWrapTransforms.length) {
        unifiedSchema = applySchemaTransforms(unifiedSchema, { schema: unifiedSchema }, null, noWrapTransforms);
      }
    }
    return unifiedSchema;
  }
}
