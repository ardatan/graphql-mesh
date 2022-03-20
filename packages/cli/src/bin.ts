import { DefaultLogger } from '@graphql-mesh/utils';
import { graphqlMesh, DEFAULT_CLI_PARAMS } from '.';
import { handleFatalError } from './handleFatalError';

graphqlMesh(DEFAULT_CLI_PARAMS).catch(e =>
  handleFatalError(e, new DefaultLogger(DEFAULT_CLI_PARAMS.initialLoggerPrefix))
);
