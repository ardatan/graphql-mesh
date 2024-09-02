import path from 'path';

export function createOpt(key: string, val: string | number): string {
  if (key.includes(' ')) {
    throw new Error(`Arg key "${key}" contains spaces`);
  }
  const strVal = String(val);
  if (strVal.includes(' ')) {
    throw new Error(`Arg value "${strVal}" contains spaces`);
  }
  return `--${key}=${strVal}`;
}

export function createPortOpt(val: number): string {
  return createOpt('port', val);
}

export function createServicePortOpt(name: string, val: number): string {
  return createOpt(`${name}_port`, val);
}

export interface Opts {
  get(key: string): string | undefined;
  get(key: string, required: true): string;
  getPort(): number | undefined;
  getPort(required: true): number;
  getServicePort(name: string): number | undefined;
  getServicePort(name: string, required: true): number;
}

export function Opts(argv: string[]): Opts {
  function get(key: string, required?: true) {
    if (key.includes(' ')) {
      throw new Error(`Arg key "${key}" contains spaces`);
    }
    let val = undefined as string | undefined;
    for (const arg of argv) {
      const [, valPart] = arg.split(`--${key}=`);
      if (valPart) {
        val = valPart;
        break;
      }
    }
    if (required && !val) {
      throw new Error(`Arg "${key}" is required`);
    }
    return val;
  }
  function getPort(required?: true) {
    const strVal = get('port', required);
    if (!strVal) {
      return undefined;
    }
    const val = parseInt(strVal);
    if (isNaN(val)) {
      throw new Error(`Arg value "${strVal}" is not a number.`);
    }
    return val;
  }
  function getServicePort(name: string, required?: true) {
    const strVal = get(`${name}_port`, required);
    if (!strVal) {
      return undefined;
    }
    const val = parseInt(strVal);
    if (isNaN(val)) {
      throw new Error(`Arg value "${strVal}" is not a number.`);
    }
    return val;
  }
  return {
    get,
    getPort,
    getServicePort,
  };
}

export function getLocalHostName(): string {
  return path.sep === '\\' ? '127.0.0.1' : '0.0.0.0';
}
