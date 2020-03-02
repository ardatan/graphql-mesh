import { MeshHandlerLibrary } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<{}> = {
  async getMeshSource({ filePathOrUrl, name, config }) {
    return {
      schema: null as any,
      name,
      source: filePathOrUrl
    };
  }
};

export default handler;
