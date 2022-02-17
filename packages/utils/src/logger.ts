import { LazyLoggerMessage, Logger } from '@graphql-mesh/types';
import { env } from 'process';
import chalk from 'chalk';

type MessageTransformer = (msg: string) => string;

const warnColor: MessageTransformer = chalk.keyword(`orange`);
const infoColor: MessageTransformer = chalk.cyan;
const errorColor: MessageTransformer = chalk.red;
const debugColor: MessageTransformer = chalk.magenta;
const titleBold: MessageTransformer = chalk.bold;

function handleLazyMessage(lazyMessage: LazyLoggerMessage) {
  if (typeof lazyMessage === 'function') {
    return lazyMessage();
  }
  return lazyMessage;
}

export class DefaultLogger implements Logger {
  constructor(public name?: string) {}
  log(message: string) {
    const finalMessage = this.name ? `${titleBold(this.name)}: ${message}` : message;
    return console.log(finalMessage);
  }

  warn(message: string) {
    return this.log(warnColor(message));
  }

  info(message: string) {
    return this.log(infoColor(message));
  }

  error(message: string) {
    return this.log(errorColor(message));
  }

  debug(lazyMessage: LazyLoggerMessage) {
    if ((env.DEBUG && env.DEBUG === '1') || this.name.includes(env.DEBUG)) {
      const message = handleLazyMessage(lazyMessage);
      return this.log(debugColor(message));
    }
  }

  child(name: string): Logger {
    return new DefaultLogger(this.name ? `${this.name} - ${name}` : name);
  }
}
