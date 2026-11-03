import { type Logger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';

export function handleFatalError(e: Error, log: Logger): any {
  log.error(e);
  if (process.env.JEST == null) {
    globalThis.process?.exit(1);
  }
}
