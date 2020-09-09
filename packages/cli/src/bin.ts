import { graphqlMesh } from '.';
import { logger } from './logger';

graphqlMesh()
  .then(() => {})
  .catch(e => {
    logger.error(e);
  });
