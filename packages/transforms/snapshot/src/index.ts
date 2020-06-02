import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping, ResolversComposition } from '@graphql-tools/resolvers-composition';
import { isAbsolute, join } from 'path';
import { ensureFile, writeJSON, pathExists, readJSON } from 'fs-extra';
import { computeSnapshotFilePath } from './compute-snapshot-file-path';
import { extractResolvers } from '@graphql-mesh/utils';

const writeFile = async (path: string, json: any) => {
  try {
    await ensureFile(path);
    await writeJSON(path, json, {
      spaces: 2,
    });
  } catch (e) {
    console.error(`Snapshot cannot saved to ${path}: ${e.message}`);
  }
};

const snapshotTransform: TransformFn<YamlConfig.SnapshotTransformConfig> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  // TODO: Needs to be changed!
  // eslint-disable-next-line no-eval
  const configIf = 'if' in config ? (typeof config.if === 'boolean' ? config.if : config.if && eval(config.if)) : true;

  if (configIf) {
    const resolvers = extractResolvers(schema);
    const resolversComposition: ResolversComposerMapping = {};

    const outputDir = isAbsolute(config.outputDir) ? config.outputDir : join(process.cwd(), config.outputDir);

    const snapshotComposition: ResolversComposition = next => async (root, args, context, info) => {
      const snapshotFilePath = computeSnapshotFilePath({
        typeName: info.parentType.name,
        fieldName: info.fieldName,
        args,
        outputDir,
      });
      if (await pathExists(snapshotFilePath)) {
        return readJSON(snapshotFilePath);
      }
      const result = await next(root, args, context, info);
      await writeFile(snapshotFilePath, result);
      return result;
    };

    for (const field of config.apply) {
      resolversComposition[field] = snapshotComposition;
    }

    const composedResolvers = composeResolvers(resolvers, resolversComposition);
    return addResolversToSchema({
      schema,
      resolvers: composedResolvers,
      updateResolversInPlace: true,
    });
  }

  return schema;
};

export default snapshotTransform;
