import { process } from '@graphql-mesh/cross-helpers';
import { Logger } from '@graphql-hive/logger';

export function handleFatalError(e: Error, log: Logger): any {
  log.error(e);
  if (process.env.JEST == null) {
    process.exit(1);
  }
}
