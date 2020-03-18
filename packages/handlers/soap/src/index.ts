import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { soapGraphqlSchema } from 'soap-graphql';

const handler: MeshHandlerLibrary<{}> = {
  async getMeshSource({ filePathOrUrl }) {
    const schema = await soapGraphqlSchema(filePathOrUrl);

    return {
      schema
    };
  }
};

export default handler;
