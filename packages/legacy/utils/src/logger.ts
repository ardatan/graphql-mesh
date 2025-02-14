import { process } from '@graphql-mesh/cross-helpers';
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

function truthy(val: unknown) {
  return val === true || val === 1 || ['1', 't', 'true', 'y', 'yes'].includes(String(val));
}

function getTimestamp() {
  return new Date().toISOString();
}

function handleLazyMessage(lazyArgs: LazyLoggerMessage[]) {
  return lazyArgs.flat(Infinity).flatMap(arg => {
    if (typeof arg === 'function') {
      return arg();
    }
    return arg;
  });
}

export class DefaultLogger implements Logger {
  constructor(
    public name?: string,
    public logLevel = truthy(process.env.DEBUG) ||
    truthy(globalThis.DEBUG) ||
    (this.name && String(process.env.DEBUG || globalThis.DEBUG || '').includes(this.name))
      ? LogLevel.debug
      : LogLevel.info,
    /** @deprecated Trimming messages is no longer supported. This argument is unused and will be removed in future versions. */
    _trim?: number | undefined,
    private console = globalThis.console,
  ) {}

  private get prefix() {
    return this.name
      ? `[${titleBold(this.name.toString().trim())}] ` /* trailing space because prefix is directly used in logged message */
      : ``;
  }

  /** Logs a message at {@link LogLevel.info} but without the "INFO" prefix. */
  log(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    this.console.log(
      `[${getTimestamp()}] ${this.prefix}`.trim() /* trim in case prefix is empty */,
      ...args,
    );
  }

  warn(...args: any[]) {
    if (this.logLevel > LogLevel.warn) {
      return noop;
    }
    this.console.warn(
      `[${getTimestamp()}] WARN  ${this.prefix}${ANSI_CODES.orange}`,
      ...args,
      ANSI_CODES.reset,
    );
  }

  info(...args: any[]) {
    if (this.logLevel > LogLevel.info) {
      return noop;
    }
    this.console.info(
      `[${getTimestamp()}] INFO  ${this.prefix}${ANSI_CODES.cyan}`,
      ...args,
      ANSI_CODES.reset,
    );
  }

  error(...args: any[]) {
    if (this.logLevel > LogLevel.error) {
      return noop;
    }
    this.console.error(
      `[${getTimestamp()}] ERROR ${this.prefix}${ANSI_CODES.red}`,
      ...args,
      ANSI_CODES.reset,
    );
  }

  debug(...lazyArgs: LazyLoggerMessage[]) {
    if (this.logLevel > LogLevel.debug) {
      return noop;
    }
    const flattenedArgs = handleLazyMessage(lazyArgs);
    this.console.debug(
      `[${getTimestamp()}] DEBUG ${this.prefix}${ANSI_CODES.magenta}`,
      ...flattenedArgs,
      ANSI_CODES.reset,
    );
  }

  child(name: string | Record<string, string | number>): Logger {
    name = stringifyName(name);
    if (this.name?.includes(name)) {
      return this;
    }
    return new DefaultLogger(
      this.name ? `${this.name}, ${name}` : name,
      this.logLevel,
      undefined,
      this.console,
    );
  }

  addPrefix(prefix: string | Record<string, string | number>): Logger {
    prefix = stringifyName(prefix);
    if (!this.name?.includes(prefix)) {
      this.name = this.name ? `${this.name}, ${prefix}` : prefix;
    }
    return this;
  }

  toJSON() {
    return undefined;
  }
}

function stringifyName(name: string | Record<string, string | number>) {
  if (typeof name === 'string' || typeof name === 'number') {
    return `${name}`;
  }
  const names: string[] = [];
  for (const [key, value] of Object.entries(name)) {
    names.push(`${key}=${value}`);
  }
  return `${names.join(', ')}`;
}
