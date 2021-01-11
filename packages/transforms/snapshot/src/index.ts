import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransform, MeshTransformOptions , extractResolvers } from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping, ResolversComposition } from '@graphql-tools/resolvers-composition';
import { isAbsolute, join } from 'path';
import { ensureFile, writeJSON, pathExists } from 'fs-extra';
import { computeSnapshotFilePath } from './compute-snapshot-file-path';


const writeFile = async (path: string, json: any): Promise<void> => {
  try {
    await ensureFile(path);
    await writeJSON(path, json, {
      spaces: 2,
    });
  } catch (e) {
    console.error(`Snapshot cannot saved to ${path}: ${e.message}`);
  }
};

export default class SnapshotTransform implements MeshTransform {
  noWrap = true;
  constructor(private options: MeshTransformOptions<YamlConfig.SnapshotTransformConfig>) {}
  transformSchema(schema: GraphQLSchema) {
    const { config } = this.options;

    // TODO: Needs to be changed!
    const configIf =
      'if' in config ? (typeof config.if === 'boolean' ? config.if : config.if && eval(config.if)) : true;

    if (configIf) {
      const resolvers = extractResolvers(schema);
      const resolversComposition: ResolversComposerMapping = {};

      const outputDir = isAbsolute(config.outputDir) ? config.outputDir : join(process.cwd(), config.outputDir);

      const snapshotComposition: ResolversComposition = next => async (root, args, context, info) => {
        const snapshotFilePath = computeSnapshotFilePath({
          info,
          args,
          outputDir,
          respectSelectionSet: config.respectSelectionSet,
        });
        if (snapshotFilePath in require.cache || (await pathExists(snapshotFilePath))) {
          return import(snapshotFilePath);
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
  }
}
