import { Logger } from '@graphql-mesh/types';
import { spinner } from './spinner';
import { env, exit } from 'process';

export function handleFatalError(e: Error, logger: Logger): any {
  const errorText = e.message;
  if (spinner.isSpinning) {
    spinner.fail(errorText);
  } else {
    logger.error(errorText);
  }
  if (env.DEBUG) {
    logger.error(
      JSON.stringify({
        ...e,
        name: e.name,
        stack: e.stack,
        message: e.message,
      })
    );
  }
  exit(1);
}
