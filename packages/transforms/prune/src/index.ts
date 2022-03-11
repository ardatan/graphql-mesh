import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { pruneSchema } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';

export default class PruneTransform implements MeshTransform {
  noWrap = true;
  constructor(private options: MeshTransformOptions<YamlConfig.PruneTransformConfig>) {}
  transformSchema(schema: GraphQLSchema) {
    return pruneSchema(schema, {
      ...this.options.config,
      skipPruning: this.options.config.skipPruning
        ? type => this.options.config.skipPruning.includes(type.name)
        : undefined,
    });
  }
}
