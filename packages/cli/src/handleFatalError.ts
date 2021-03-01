import { logger } from './logger';
import { spinner } from './spinner';

export function handleFatalError(e: Error): any {
  logger.error(
    JSON.stringify({
      ...e,
      name: e.name,
      stack: e.stack,
      message: e.message,
    })
  );
  process.exit(1);
}
