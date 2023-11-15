import type { MeshServeCLIConfig } from '@graphql-mesh/serve-cli';

export const serveConfig: MeshServeCLIConfig = {
  supergraph: './supergraph.graphql',
  spec: 'federation',
};
