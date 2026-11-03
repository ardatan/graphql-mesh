#!/usr/bin/env node
import { Logger } from '@graphql-hive/logger';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DEFAULT_CLI_PARAMS, graphqlMesh, handleFatalError } from '@graphql-mesh/cli';

graphqlMesh(DEFAULT_CLI_PARAMS).catch(e =>
  handleFatalError(e, new Logger({ prefix: DEFAULT_CLI_PARAMS.initialLoggerPrefix })),
);
