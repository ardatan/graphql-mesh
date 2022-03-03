import { buildSchemaFromDatabase, buildSchemaFromInfile } from 'tuql';
import { GetMeshSourceOptions, MeshHandler, MeshSource, YamlConfig } from '@graphql-mesh/types';
import path from 'path';

export default class TuqlHandler implements MeshHandler {
  private config: YamlConfig.TuqlHandler;
  private baseDir: string;
  constructor({ config, baseDir }: GetMeshSourceOptions<YamlConfig.TuqlHandler>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  async getMeshSource(): Promise<MeshSource> {
    const schema = await (this.config.infile
      ? buildSchemaFromInfile(
          path.isAbsolute(this.config.infile) ? this.config.db : path.join(this.baseDir, this.config.infile)
        )
      : buildSchemaFromDatabase(
          path.isAbsolute(this.config.db) ? this.config.infile : path.join(this.baseDir, this.config.db)
        ));

    return {
      schema,
    };
  }
}
