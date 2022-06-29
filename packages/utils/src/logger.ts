import { LazyLoggerMessage, Logger } from '@graphql-mesh/types';
import { process, util } from '@graphql-mesh/cross-helpers';

type MessageTransformer = (msg: string) => string;

const ANSI_CODES = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  orange: '\x1b[48:5:166m',
};

export const warnColor: MessageTransformer = msg => ANSI_CODES.orange + msg + ANSI_CODES.reset;
export const infoColor: MessageTransformer = msg => ANSI_CODES.cyan + msg + ANSI_CODES.reset;
export const errorColor: MessageTransformer = msg => ANSI_CODES.red + msg + ANSI_CODES.reset;
export const debugColor: MessageTransformer = msg => ANSI_CODES.magenta + msg + ANSI_CODES.reset;
export const titleBold: MessageTransformer = msg => ANSI_CODES.bold + msg + ANSI_CODES.reset;

export class DefaultLogger implements Logger {
  constructor(public name?: string) {}

  private getLoggerMessage(...args: any[]) {
    return args
      .flat(Infinity)
      .map(arg => {
        if (typeof arg === 'string') {
          if (arg.length > 100 && !this.isDebug) {
            return arg.slice(0, 100) + '...';
          }
          return arg;
        } else if (typeof arg === 'object' && arg?.stack != null) {
          return arg.stack;
        }
        return util.inspect(arg);
      })
      .join(` `);
  }

  private handleLazyMessage(...lazyArgs: LazyLoggerMessage[]) {
    const flattenedArgs = lazyArgs.flat(Infinity).flatMap(arg => {
      if (typeof arg === 'function') {
        return arg();
      }
      return arg;
    });
    return this.getLoggerMessage(flattenedArgs);
  }

  private get isDebug() {
    return (
      process.env.DEBUG === '1' ||
      (globalThis as any).DEBUG === '1' ||
      this.name.includes(process.env.DEBUG || (globalThis as any).DEBUG)
    );
  }

  private get prefix() {
    return this.name ? titleBold(this.name) : ``;
  }

  log(...args: any[]) {
    const message = this.getLoggerMessage(...args);
    return console.log(`${this.prefix} ${message}`);
  }

  warn(...args: any[]) {
    const message = this.getLoggerMessage(...args);
    const fullMessage = `⚠️ ${this.prefix} ${warnColor(message)}`;
    if (console.warn) {
      console.warn(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  info(...args: any[]) {
    const message = this.getLoggerMessage(...args);
    const fullMessage = `💡 ${this.prefix} ${infoColor(message)}`;
    if (console.info) {
      console.info(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  error(...args: any[]) {
    const message = this.getLoggerMessage(...args);
    const fullMessage = `💥 ${this.prefix} ${errorColor(message)}`;
    console.log(fullMessage);
  }

  debug(...lazyArgs: LazyLoggerMessage[]) {
    if (this.isDebug) {
      const message = this.handleLazyMessage(lazyArgs);
      const fullMessage = `🐛 ${this.prefix} ${debugColor(message)}`;
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
