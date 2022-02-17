import { Logger } from '@graphql-mesh/types';
import { env, exit } from 'process';
import { inspect } from '@graphql-tools/utils';
import { DefaultLogger } from '@graphql-mesh/utils';

export function handleFatalError(e: Error, logger: Logger = new DefaultLogger('🕸️')): any {
  const errorText = e.message;
  logger.error(errorText);
  if (env.DEBUG) {
    logger.error(
      inspect({
        ...e,
        name: e.name,
        stack: e.stack,
        message: e.message,
      })
    );
  }
  exit(1);
}
