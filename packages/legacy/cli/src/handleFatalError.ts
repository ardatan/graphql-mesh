import { type Logger } from '@graphql-hive/logger';

export function handleFatalError(e: Error, log: Logger): any {
  log.error(e);
  if (globalThis.process?.env?.JEST == null) {
    globalThis.process?.exit(1);
  }
}
