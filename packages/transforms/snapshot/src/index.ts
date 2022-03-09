import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransform, MeshTransformOptions, ImportFn } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping, ResolversComposition } from '@graphql-tools/resolvers-composition';
import path from 'path';
import { computeSnapshotFilePath } from './compute-snapshot-file-path';
import { extractResolvers, writeJSON, pathExists } from '@graphql-mesh/utils';

const writeSnapshotFile = async (path: string, json: any): Promise<void> => {
  try {
    await writeJSON(path, json, null, 2);
  } catch (e) {
    console.error(`Snapshot cannot saved to ${path}: ${e.message}`);
  }
};

export default class SnapshotTransform implements MeshTransform {
  noWrap = true;
  private config: YamlConfig.SnapshotTransformConfig;
  private baseDir: string;
  private importFn: ImportFn;

  constructor({ baseDir, config, importFn }: MeshTransformOptions<YamlConfig.SnapshotTransformConfig>) {
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
  }

  transformSchema(schema: GraphQLSchema) {
    // TODO: Needs to be changed!
    const configIf =
      'if' in this.config
        ? typeof this.config.if === 'boolean'
          ? this.config.if
          : this.config.if && eval(this.config.if)
        : true;

    if (configIf) {
      const resolvers = extractResolvers(schema);
      const resolversComposition: ResolversComposerMapping = {};

      const outputDir = path.isAbsolute(this.config.outputDir)
        ? this.config.outputDir
        : path.join(this.baseDir, this.config.outputDir);

      const snapshotComposition: ResolversComposition = next => async (root, args, context, info) => {
        const snapshotFilePath = computeSnapshotFilePath({
          info,
          args,
          outputDir,
          respectSelectionSet: this.config.respectSelectionSet,
        });
        if (snapshotFilePath in require.cache || (await pathExists(snapshotFilePath))) {
          return this.importFn(snapshotFilePath);
        }
        const result = await next(root, args, context, info);
        await writeSnapshotFile(snapshotFilePath, result);
        return result;
      };

      for (const field of this.config.apply) {
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
