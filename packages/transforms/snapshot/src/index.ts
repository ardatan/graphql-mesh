import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransform, MeshTransformOptions } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping, ResolversComposition } from '@graphql-tools/resolvers-composition';
import { isAbsolute, join } from 'path';
import { computeSnapshotFilePath } from './compute-snapshot-file-path';
import { extractResolvers, writeJSON, pathExists } from '@graphql-mesh/utils';

const writeFile = async (path: string, json: any): Promise<void> => {
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

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.SnapshotTransformConfig>) {
    this.config = config;
    this.baseDir = baseDir;
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

      const outputDir = isAbsolute(this.config.outputDir)
        ? this.config.outputDir
        : join(this.baseDir, this.config.outputDir);

      const snapshotComposition: ResolversComposition = next => async (root, args, context, info) => {
        const snapshotFilePath = computeSnapshotFilePath({
          info,
          args,
          outputDir,
          respectSelectionSet: this.config.respectSelectionSet,
        });
        if (snapshotFilePath in require.cache || (await pathExists(snapshotFilePath))) {
          return import(snapshotFilePath);
        }
        const result = await next(root, args, context, info);
        await writeFile(snapshotFilePath, result);
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
