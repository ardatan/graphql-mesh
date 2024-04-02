import { process, util } from '@graphql-mesh/cross-helpers';
import { LazyLoggerMessage, Logger } from '@graphql-mesh/types';

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

  private getLoggerMessage({ args = [], trim = !this.isDebug }: { args: any[]; trim?: boolean }) {
    return args
      .flat(Infinity)
      .map(arg => {
        if (typeof arg === 'string') {
          if (trim && arg.length > 100) {
            return (
              arg.slice(0, 100) +
              '...' +
              '<Message is too long. Enable DEBUG=1 to see the full message.>'
            );
          }
          return arg;
        } else if (typeof arg === 'object' && arg?.stack != null) {
          return arg.stack;
        }
        return util.inspect(arg);
      })
      .join(` `);
  }

  private handleLazyMessage({ lazyArgs, trim }: { lazyArgs: LazyLoggerMessage[]; trim?: boolean }) {
    const flattenedArgs = lazyArgs.flat(Infinity).flatMap(arg => {
      if (typeof arg === 'function') {
        return arg();
      }
      return arg;
    });
    return this.getLoggerMessage({
      args: flattenedArgs,
      trim,
    });
  }

  private get isDebug() {
    if (process.env.DEBUG) {
      return (
        process.env.DEBUG === '1' ||
        (globalThis as any).DEBUG === '1' ||
        this.name.includes(process.env.DEBUG || (globalThis as any).DEBUG)
      );
    }
    return false;
  }

  private get prefix() {
    return this.name ? titleBold(this.name) : ``;
  }

  log(...args: any[]) {
    const message = this.getLoggerMessage({
      args,
    });
    const fullMessage = `${this.prefix} ${message}`;
    if (typeof process === 'object') {
      process.stderr.write(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  warn(...args: any[]) {
    const message = this.getLoggerMessage({
      args,
    });
    const fullMessage = `${this.prefix} ⚠️ ${warnColor(message)}`;
    if (typeof process === 'object') {
      process.stderr.write(fullMessage);
    } else {
      console.warn(fullMessage);
    }
  }

  info(...args: any[]) {
    const message = this.getLoggerMessage({
      args,
    });
    const fullMessage = `${this.prefix} 💡 ${infoColor(message)}`;
    if (typeof process === 'object') {
      process.stderr.write(fullMessage);
    } else {
      console.info(fullMessage);
    }
  }

  error(...args: any[]) {
    const message = this.getLoggerMessage({
      args,
      trim: false,
    });
    const fullMessage = `${this.prefix} 💥 ${errorColor(message)}`;
    if (typeof process === 'object') {
      process.stderr.write(fullMessage);
    } else {
      console.error(fullMessage);
    }
  }

  debug(...lazyArgs: LazyLoggerMessage[]) {
    if (this.isDebug) {
      const message = this.handleLazyMessage({
        lazyArgs,
      });
      const fullMessage = `${this.prefix} 🐛 ${debugColor(message)}`;
      if (typeof process === 'object') {
        process.stderr.write(fullMessage);
      } else {
        console.debug(fullMessage);
      }
    }
  }

  child(name: string): Logger {
    return new DefaultLogger(this.name ? `${this.name} - ${name}` : name);
  }

  addPrefix(prefix: string): Logger {
    if (!this.name?.includes(prefix)) {
      this.name = this.name ? `${this.name} - ${prefix}` : prefix;
    }
    return this;
  }
}
