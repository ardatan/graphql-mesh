import { process } from '@graphql-mesh/cross-helpers';
import type { Logger } from '@graphql-mesh/types';
import { LogLevel } from '@graphql-mesh/utils';

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

export const warnColor = (msg: string) => ANSI_CODES.orange + msg + ANSI_CODES.reset;
export const infoColor = (msg: string) => ANSI_CODES.cyan + msg + ANSI_CODES.reset;
export const errorColor = (msg: string) => ANSI_CODES.red + msg + ANSI_CODES.reset;
export const debugColor = (msg: string) => ANSI_CODES.magenta + msg + ANSI_CODES.reset;
export const titleBold = (msg: string) => ANSI_CODES.bold + msg + ANSI_CODES.reset;

const noop: VoidFunction = () => {};

function truthy(val: unknown) {
  return val === true || val === 1 || ['1', 't', 'true', 'y', 'yes'].includes(String(val));
}

function getTimestamp() {
  return new Date().toISOString();
}

export class DefaultLogger implements Logger {
  constructor(
    public name?: string,
    public logLevel = truthy(process.env.DEBUG) ||
    truthy(globalThis.DEBUG) ||
    (this.name && String(process.env.DEBUG || globalThis.DEBUG || '').includes(this.name))
      ? LogLevel.debug
      : LogLevel.info,
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
              '<Message is trimmed. Set DEBUG=1 to see the full message.>'
            );
          }
          return arg;
        } else if (typeof arg === 'object' && arg?.stack != null) {
          return arg.stack;
        }
        return JSON.stringify(arg);
      })
      .join(' ');
  }

  private get prefix() {
    return this.name
      ? `${titleBold(this.name.trim())} ` /* trailing space because prefix is directly used in logged message */
      : ``;
  }

  log(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    process.stderr.write(`[${getTimestamp()}]${this.prefix}${message}\n`);
  }

  warn(...args: any[]) {
    if (this.logLevel > LogLevel.warn) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    process.stderr.write(`[${getTimestamp()}] WARN  ${this.prefix}${warnColor(message)}\n`);
  }

  info(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    process.stderr.write(`[${getTimestamp()}] INFO  ${this.prefix}${infoColor(message)}\n`);
  }

  error(...args: any[]) {
    if (this.logLevel > LogLevel.error) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    process.stderr.write(`[${getTimestamp()}] ERROR ${this.prefix}${errorColor(message)}\n`);
  }

  debug(...args: any[]) {
    if (this.logLevel > LogLevel.debug) {
      return noop;
    }
    const message = this.getLoggerMessage({ args });
    process.stderr.write(`[${getTimestamp()}] DEBUG ${this.prefix}${debugColor(message)}\n`);
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
