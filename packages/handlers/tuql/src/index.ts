import { buildSchemaFromDatabase, buildSchemaFromInfile } from 'tuql';
import { GetMeshSourceOptions, MeshHandler, MeshSource, YamlConfig } from '@graphql-mesh/types';

export default class TuqlHandler implements MeshHandler {
  private config: YamlConfig.TuqlHandler;
  constructor({ config }: GetMeshSourceOptions<YamlConfig.TuqlHandler>) {
    this.config = config;
  }

  async getMeshSource(): Promise<MeshSource> {
    const schema = await (this.config.infile
      ? buildSchemaFromInfile(this.config.infile)
      : buildSchemaFromDatabase(this.config.db));

    return {
      schema,
    };
  }
}
