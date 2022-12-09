#!/usr/bin/env node
import { DefaultLogger } from '@graphql-mesh/utils';
import { graphqlMesh, DEFAULT_CLI_PARAMS } from './index.js';
import { handleFatalError } from './handleFatalError.js';

graphqlMesh(DEFAULT_CLI_PARAMS).catch(e =>
  handleFatalError(e, new DefaultLogger(DEFAULT_CLI_PARAMS.initialLoggerPrefix)),
);
