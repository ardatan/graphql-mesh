/* eslint-disable @typescript-eslint/no-unused-expressions -- simply more convenient to do `this.stderr(m) || console.log(m)` */
import { process, util } from '@graphql-mesh/cross-helpers';
import type { LazyLoggerMessage, Logger } from '@graphql-mesh/types';

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

export enum LogLevel {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3,
  silent = 4,
}

const noop: VoidFunction = () => {};

function truthy(str: unknown) {
  return str === true || str === 1 || ['1', 't', 'true', 'y', 'yes'].includes(String(str));
}

function getTimestamp() {
  return new Date().toISOString();
}

export class DefaultLogger implements Logger {
  constructor(
    public name?: string,
    public logLevel = truthy(process.env.DEBUG) ? LogLevel.debug : LogLevel.info,
    private trim?: number,
  ) {}

  private getLoggerMessage({ args = [] }: { args: any[] }) {
    return args
      .flat(Infinity)
      .map(arg => {
        if (typeof arg === 'string') {
          if (this.trim && arg.length > this.trim) {
            return (
              arg.slice(0, this.trim) +
              '...' +
              '<Message is trimmed. Enable DEBUG=1 to see the full message.>'
            );
          }
          return arg;
        } else if (typeof arg === 'object' && arg?.stack != null) {
          return arg.stack;
        }
        return util.inspect(arg);
      })
      .join(' ');
  }

  private handleLazyMessage({ lazyArgs }: { lazyArgs: LazyLoggerMessage[] }) {
    const flattenedArgs = lazyArgs.flat(Infinity).flatMap(arg => {
      if (typeof arg === 'function') {
        return arg();
      }
      return arg;
    });
    return this.getLoggerMessage({ args: flattenedArgs });
  }

  /**
   * Tries writing to the process stderr. If unable, will return
   * false so that the logger falls back to using the console.
   *
   * If process stderr is used, a new line is automatically appended
   * after the {@link msg}.
   */
  private stderr(msg: string) {
    if (typeof process?.stderr?.write === 'function') {
      process.stderr.write(msg + '\n');
      return true;
    }
    return false;
  }

  private get isDebug() {
    return (
      this.logLevel <= LogLevel.debug ||
      truthy(process.env.DEBUG) ||
      truthy((globalThis as any).DEBUG) ||
      this.name.includes(process.env.DEBUG || (globalThis as any).DEBUG)
    );
  }

  private get prefix() {
    return this.name ? titleBold(this.name) : ``;
  }

  log(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    const fullMessage = `[${getTimestamp()}] ${this.prefix} ${message}`;
    this.stderr(fullMessage) || console.log(fullMessage);
  }

  warn(...args: any[]) {
    if (this.logLevel > LogLevel.warn) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    const fullMessage = `[${getTimestamp()}] WARN  ${this.prefix} ${warnColor(message)}`;
    this.stderr(fullMessage) || console.warn(fullMessage);
  }

  info(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    const message = this.getLoggerMessage({
      args,
    });
    const fullMessage = `[${getTimestamp()}] INFO  ${this.prefix} ${infoColor(message)}`;
    this.stderr(fullMessage) || console.info(fullMessage);
  }

  error(...args: any[]) {
    if (this.logLevel > LogLevel.error) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    const fullMessage = `[${getTimestamp()}] ERROR ${this.prefix} ${errorColor(message)}`;
    this.stderr(fullMessage) || console.error(fullMessage);
  }

  debug(...lazyArgs: LazyLoggerMessage[]) {
    if (!this.isDebug /** also checks whether the loglevel is at least debug */) {
      return noop;
    }
    const message = this.handleLazyMessage({
      lazyArgs,
    });
    const fullMessage = `[${getTimestamp()}] DEBUG ${this.prefix} ${debugColor(message)}`;
    this.stderr(fullMessage) || console.debug(fullMessage);
  }

  child(name: string): Logger {
    if (this.name?.includes(name)) {
      return this;
    }
    return new DefaultLogger(this.name ? `${this.name} - ${name}` : name, this.logLevel);
  }

  addPrefix(prefix: string): Logger {
    if (!this.name?.includes(prefix)) {
      this.name = this.name ? `${this.name} - ${prefix}` : prefix;
    }
    return this;
  }

  toJSON() {
    return undefined;
  }
}
