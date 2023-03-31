#!/usr/bin/env node
// eslint-disable-next-line import/no-extraneous-dependencies
import { DEFAULT_CLI_PARAMS, graphqlMesh, handleFatalError } from '@graphql-mesh/cli';
import { DefaultLogger } from '@graphql-mesh/utils';

graphqlMesh(DEFAULT_CLI_PARAMS).catch(e =>
  handleFatalError(e, new DefaultLogger(DEFAULT_CLI_PARAMS.initialLoggerPrefix)),
);
