import { graphqlMesh } from '.';
import { handleFatalError } from './handleFatalError';

graphqlMesh()
  .then(() => {})
  .catch(handleFatalError);
