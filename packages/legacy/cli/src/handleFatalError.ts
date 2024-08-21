import { process } from '@graphql-mesh/cross-helpers';
import type { Logger } from '@graphql-mesh/types';

export function handleFatalError(e: Error, logger: Logger): any {
  logger.error(e);
  if (process.env.JEST == null) {
    process.exit(1);
  }
}
