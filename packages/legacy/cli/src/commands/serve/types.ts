import type { MeshHTTPHandler } from '@graphql-mesh/http';
import type { MeshInstance } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';

export interface ServerStartOptions {
  meshHTTPHandler: MeshHTTPHandler;
  getBuiltMesh: () => Promise<MeshInstance>;
  sslCredentials: YamlConfig.ServeConfig['sslCredentials'];
  graphqlPath: string;
  hostname: string;
  port: number;
}

export interface ServerStartResult {
  stop: () => Promise<void> | void;
}
