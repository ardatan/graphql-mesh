import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema } from 'soap-graphql';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ handler }) {
    const schema = await soapGraphqlSchema(handler.source);

    return {
      schema
    };
  }
};

export default handler;
