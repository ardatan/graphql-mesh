import { DefaultLogger } from '@graphql-mesh/utils';
import { graphqlMesh, GraphQLMeshCLIParams } from '.';
import { handleFatalError } from './handleFatalError';

const DEFAULT_CLI_PARAMS: GraphQLMeshCLIParams = {
  commandName: 'mesh',
  initialLoggerPrefix: '🕸️',
  configName: 'mesh',
  artifactsDir: '.mesh',
  serveMessage: 'Serving GraphQL Mesh',
  playgroundTitle: 'GraphiQL Mesh',
  builtMeshFactoryName: 'getBuiltMesh',
  builtMeshSDKFactoryName: 'getMeshSDK',
  devServerCommand: 'dev',
  prodServerCommand: 'start',
  buildArtifactsCommand: 'build',
  sourceServerCommand: 'serve-source',
  validateCommand: 'validate',
};

graphqlMesh(DEFAULT_CLI_PARAMS)
  .then(() => {})
  .catch(e => handleFatalError(e, new DefaultLogger(DEFAULT_CLI_PARAMS.initialLoggerPrefix)));
