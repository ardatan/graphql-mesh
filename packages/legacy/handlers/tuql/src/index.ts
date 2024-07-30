import type { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { loadGraphQLSchemaFromOptions } from '@omnigraph/sqlite';

export default class TuqlHandler implements MeshHandler {
  private config: YamlConfig.TuqlHandler;
  private baseDir: string;
  constructor({ config, baseDir }: MeshHandlerOptions<YamlConfig.TuqlHandler>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  async getMeshSource(): Promise<MeshSource> {
    const schema = await loadGraphQLSchemaFromOptions({
      ...this.config,
      cwd: this.baseDir,
    });
    return {
      schema,
    };
  }
}
