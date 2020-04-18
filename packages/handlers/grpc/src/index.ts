import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GrpcGraphQLSchemaFactory } from './grpc-graphql-schema-factory';

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ config }) {
    if (!config) {
      throw new Error('Config not specified!');
    }

    const schemaFactory = new GrpcGraphQLSchemaFactory(config);
    await schemaFactory.init();

    const schema = schemaFactory.buildSchema();

    return {
      schema,
    };
  },
};

export default handler;
