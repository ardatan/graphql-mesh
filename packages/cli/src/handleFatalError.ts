import { Logger } from '@graphql-mesh/types';
import { process } from '@graphql-mesh/cross-helpers';

export function handleFatalError(e: Error, logger: Logger): any {
  logger.error(e);
  if (process.env.JEST == null) {
    process.exit(1);
  }
}
