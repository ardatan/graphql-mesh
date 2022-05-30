import { LazyLoggerMessage, Logger } from '@graphql-mesh/types';
import chalk from 'chalk';
import { process, util } from '@graphql-mesh/cross-helpers';

type MessageTransformer = (msg: string) => string;

const warnColor: MessageTransformer = chalk.keyword(`orange`);
const infoColor: MessageTransformer = chalk.cyan;
const errorColor: MessageTransformer = chalk.red;
const debugColor: MessageTransformer = chalk.magenta;
const titleBold: MessageTransformer = chalk.bold;

function handleLazyMessage(...lazyArgs: LazyLoggerMessage[]) {
  const flattenedArgs = lazyArgs.flat(Infinity).flatMap(arg => {
    if (typeof arg === 'function') {
      return arg();
    }
    return arg;
  });
  return getLoggerMessage(flattenedArgs);
}

function getLoggerMessage(...args: any[]) {
  return args
    .flat(Infinity)
    .map(arg => {
      if (typeof arg === 'string') {
        if (arg.length > 100) {
          return arg.slice(0, 100) + '...';
        }
        return arg;
      } else if (arg.stack != null) {
        return arg.stack;
      }
      return util.inspect(arg);
    })
    .join(` `);
}

export class DefaultLogger implements Logger {
  constructor(public name?: string) {}

  private getPrefix() {
    return this.name ? titleBold(this.name) : ``;
  }

  log(...args: any[]) {
    const message = getLoggerMessage(...args);
    return console.log(`${this.getPrefix()} ${message}`);
  }

  warn(...args: any[]) {
    const message = getLoggerMessage(...args);
    const fullMessage = `⚠️ ${this.getPrefix()} ${warnColor(message)}`;
    if (console.warn) {
      console.warn(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  info(...args: any[]) {
    const message = getLoggerMessage(...args);
    const fullMessage = `💡 ${this.getPrefix()} ${infoColor(message)}`;
    if (console.info) {
      console.info(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  error(...args: any[]) {
    const message = getLoggerMessage(...args);
    const fullMessage = `💥 ${this.getPrefix()} ${errorColor(message)}`;
    if (console.error) {
      console.error(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  debug(...lazyArgs: LazyLoggerMessage[]) {
    if ((process.env.DEBUG && process.env.DEBUG === '1') || this.name.includes(process.env.DEBUG)) {
      const message = handleLazyMessage(lazyArgs);
      const fullMessage = `🐛 ${this.getPrefix()} ${debugColor(message)}`;
      if (console.debug) {
        console.debug(fullMessage);
      } else {
        console.log(fullMessage);
      }
    }
  }

  child(name: string): Logger {
    return new DefaultLogger(this.name ? `${this.name} - ${name}` : name);
  }
}
