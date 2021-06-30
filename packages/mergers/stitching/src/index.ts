import { MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { wrapSchema } from '@graphql-tools/wrap';
import { mergeSingleSchema } from './mergeSingleSchema';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { StitchingInfo } from '@graphql-tools/delegate';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';

const mergeUsingStitching: MergerFn = async function (options) {
  if (options.rawSources.length === 1) {
    options.logger.debug(`Stitching is not necessary for a single schema`);
    return mergeSingleSchema(options);
  }
  const { rawSources, typeDefs, resolvers, transforms, logger } = options;
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
  logger.debug(`Stitching directives are being generated`);
  const defaultStitchingDirectives = stitchingDirectives({
    pathToDirectivesInExtensions: ['directives'],
  });
  logger.debug(`Stitching the source schemas`);
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
  logger.debug(`sourceMap is being generated and attached to the unified schema`);
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
    logger.debug(`Root level transformations are being applied`);
    const { noWrapTransforms, wrapTransforms } = groupTransforms(transforms);
    if (wrapTransforms.length) {
      unifiedSchema = wrapSchema({
        schema: unifiedSchema,
        batch: true,
        transforms: wrapTransforms,
        // executor: jitExecutorFactory(unifiedSchema, 'wrapped', logger.child('JIT Executor')),
      });
    }
    if (noWrapTransforms.length) {
      unifiedSchema = applySchemaTransforms(unifiedSchema, { schema: unifiedSchema }, null, noWrapTransforms);
    }
  }
  return unifiedSchema;
};

export default mergeUsingStitching;
