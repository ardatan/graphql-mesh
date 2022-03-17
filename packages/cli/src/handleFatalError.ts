import { Logger } from '@graphql-mesh/types';
import { exit } from 'process';
import { DefaultLogger } from '@graphql-mesh/utils';

export function handleFatalError(e: Error, logger: Logger = new DefaultLogger('🕸️')): any {
  logger.error(e.stack || e.message);
  console.log(e);
  if (process.env.JEST == null) {
    exit(1);
  }
}
