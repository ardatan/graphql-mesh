import { buildSchemaFromDatabase, buildSchemaFromInfile } from 'tuql';
import { path } from '@graphql-mesh/cross-helpers';
import { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';

export default class TuqlHandler implements MeshHandler {
  private config: YamlConfig.TuqlHandler;
  private baseDir: string;
  constructor({ config, baseDir }: MeshHandlerOptions<YamlConfig.TuqlHandler>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  async getMeshSource(): Promise<MeshSource> {
    const schema = await (this.config.infile
      ? buildSchemaFromInfile(
          path.isAbsolute(this.config.infile)
            ? this.config.db
            : path.join(this.baseDir, this.config.infile),
        )
      : buildSchemaFromDatabase(
          path.isAbsolute(this.config.db)
            ? this.config.infile
            : path.join(this.baseDir, this.config.db),
        ));

    return {
      schema,
    };
  }
}
