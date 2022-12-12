#!/usr/bin/env node
import { DefaultLogger } from '@graphql-mesh/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import { graphqlMesh, DEFAULT_CLI_PARAMS, handleFatalError } from '@graphql-mesh/cli';

graphqlMesh(DEFAULT_CLI_PARAMS).catch(e =>
  handleFatalError(e, new DefaultLogger(DEFAULT_CLI_PARAMS.initialLoggerPrefix)),
);
