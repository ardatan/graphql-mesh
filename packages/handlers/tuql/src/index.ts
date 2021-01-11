import { buildSchemaFromDatabase, buildSchemaFromInfile } from 'tuql';
import { MeshHandler, MeshSource, YamlConfig } from '@graphql-mesh/utils';

export default class TuqlHandler extends MeshHandler<YamlConfig.TuqlHandler> {
  async getMeshSource(): Promise<MeshSource> {
    const schema = await (this.config.infile
      ? buildSchemaFromInfile(this.config.infile)
      : buildSchemaFromDatabase(this.config.db));

    return {
      schema,
    };
  }
}
