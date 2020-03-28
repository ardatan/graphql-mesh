import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { getGraphqlSchemaFromGrpc } from './get-graphql-schema-from-grpc';
import { isAbsolute, join } from 'path';

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ config }) {
    if (!config) {
      throw new Error('Config not specified!');
    }

    config.protoFilePath = isAbsolute(config.protoFilePath)
      ? config.protoFilePath
      : join(process.cwd(), config.protoFilePath);

    const schema = await getGraphqlSchemaFromGrpc(config);

    return {
      schema
    };
  }
};

export default handler;
