import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema } from 'soap-graphql';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config }) {
    const schema = await soapGraphqlSchema(config.wsdl);

    return {
      schema
    };
  }
};

export default handler;
