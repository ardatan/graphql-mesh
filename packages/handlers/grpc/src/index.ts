import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { getGraphqlSchemaFromGrpc } from 'grpc-graphql-schema';
import { isAbsolute, join } from 'path';

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ handler }) {
    if (!handler.config) {
      throw new Error('Config not specified!');
    }

    handler.config.protoFilePath = isAbsolute(handler.config.protoFilePath)
      ? handler.config.protoFilePath
      : join(process.cwd(), handler.config.protoFilePath);

    const schema = await getGraphqlSchemaFromGrpc(handler.config);

    return {
      schema
    };
  }
};

export default handler;
