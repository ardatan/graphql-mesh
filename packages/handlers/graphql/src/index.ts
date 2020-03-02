import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { loadSchema, LoadSchemaOptions } from '@graphql-toolkit/core';

const loaders = [new UrlLoader()];

const handler: MeshHandlerLibrary<LoadSchemaOptions> = {
  async getMeshSource({ filePathOrUrl, config }) {
    const remoteSchema = await loadSchema(filePathOrUrl, {
      assumeValidSDL: true,
      loaders,
      sort: true,
      convertExtensions: true,
      commentDescriptions: true,
      ...config
    });

    return {
      schema: remoteSchema
    };
  }
};

export default handler;
