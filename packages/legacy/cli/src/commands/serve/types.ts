/* eslint-disable import/no-nodejs-modules */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MeshHTTPHandler } from '@graphql-mesh/http';
import type { MeshInstance } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';

export type MeshOrGatewayHTTPHandler =
  MeshHTTPHandler | ((req: IncomingMessage, res: ServerResponse) => void | Promise<void>);

export interface ServerStartOptions {
  meshHTTPHandler: MeshOrGatewayHTTPHandler;
  getBuiltMesh: () => Promise<MeshInstance>;
  sslCredentials: YamlConfig.ServeConfig['sslCredentials'];
  graphqlPath: string;
  hostname: string;
  port: number;
  /** When set (Hive Gateway serve), used instead of Mesh getEnveloped WS wiring. */
  graphqlWsOptions?: object;
}

export interface ServerStartResult {
  stop: () => Promise<void> | void;
}
