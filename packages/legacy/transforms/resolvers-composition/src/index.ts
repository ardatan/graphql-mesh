import type { GraphQLSchema } from 'graphql';
import type {
  ImportFn,
  MeshTransform,
  MeshTransformOptions,
  YamlConfig,
} from '@graphql-mesh/types';
import { extractResolvers, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import type { ResolversComposerMapping } from '@graphql-tools/resolvers-composition';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { addResolversToSchema } from '@graphql-tools/schema';

export default class ResolversCompositionTransform implements MeshTransform {
  public noWrap: boolean;
  private compositions: YamlConfig.ResolversCompositionTransform['compositions'];
  private baseDir: string;
  private importFn: ImportFn;

  constructor({
    baseDir,
    config,
    importFn,
  }: MeshTransformOptions<YamlConfig.Transform['resolversComposition']>) {
    this.noWrap = config.mode ? config.mode !== 'wrap' : false; // use config.mode value or default to false
    this.compositions = Array.isArray(config) ? config : config.compositions;
    this.baseDir = baseDir;
    this.importFn = importFn;
  }

  transformSchema(schema: GraphQLSchema) {
    const resolversComposition: ResolversComposerMapping = {};

    for (const { resolver, composer } of this.compositions) {
      const composerFn$ = loadFromModuleExportExpression<any>(composer, {
        cwd: this.baseDir,
        defaultExportName: 'default',
        importFn: this.importFn,
      });
      resolversComposition[resolver] =
        next =>
        (...args) =>
          composerFn$
            .then(composerFn => (composerFn ? composerFn(next) : next))
            .then(next => next(...args));
    }

    const resolvers = extractResolvers(schema);
    const composedResolvers = composeResolvers(resolvers, resolversComposition);

    return addResolversToSchema({
      schema,
      resolvers: composedResolvers,
      updateResolversInPlace: true,
    });
  }
}

export type { ResolversComposition } from '@graphql-tools/resolvers-composition';
