import { DefaultLogger } from '@graphql-mesh/runtime';
import { graphqlMesh } from '.';
import { handleFatalError } from './handleFatalError';

graphqlMesh()
  .then(() => {})
  .catch(e => handleFatalError(e, new DefaultLogger('Mesh')));
