import { DefaultLogger } from '@graphql-mesh/utils';
import { graphqlMesh } from '.';
import { handleFatalError } from './handleFatalError';

graphqlMesh()
  .then(() => {})
  .catch(e => handleFatalError(e, new DefaultLogger('🕸️')));
