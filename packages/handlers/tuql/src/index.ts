import {
    buildSchemaFromDatabase,
    buildSchemaFromInfile,
  } from 'tuql';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.TuqlHandler> = {
  async getMeshSource({ config }) {

    const schema = await (config.infile
    ? buildSchemaFromInfile(config.infile)
    : buildSchemaFromDatabase(config.db));

    return {
      schema,
    };
  },
};

export default handler;
