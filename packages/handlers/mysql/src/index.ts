import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { composeWithMysql } from 'graphql-compose-mysql';

const handler: MeshHandlerLibrary<YamlConfig.MySQLHandler> = {
  async getMeshSource({ config }) {
    const schema = await composeWithMysql({
      mysqlConfig: config,
    });
    return {
      schema,
    };
  },
};

export default handler;
