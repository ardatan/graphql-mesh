import { Logger } from '@graphql-mesh/types';
import { env, exit } from 'process';
import { inspect } from 'util';

export function handleFatalError(e: Error, logger: Logger): any {
  const errorText = e.message;
  logger.error(errorText);
  if (env.DEBUG) {
    logger.error(
      inspect(
        {
          ...e,
          name: e.name,
          stack: e.stack,
          message: e.message,
        },
        true,
        Infinity,
        true
      )
    );
  }
  exit(1);
}
