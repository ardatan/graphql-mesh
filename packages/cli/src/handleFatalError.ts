import { Logger } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';

export function handleFatalError(e: Error, logger: Logger = new DefaultLogger('🕸️')): any {
  logger.error(e.stack || e.message);
  if (process.env.JEST == null) {
    process.exit(1);
  }
}
