export function createArg(key: string, val: string | number): string {
  if (key.includes(' ')) {
    throw new Error(`Arg key "${key}" contains spaces`);
  }
  const strVal = String(val);
  if (strVal.includes(' ')) {
    throw new Error(`Arg value "${strVal}" contains spaces`);
  }
  return `--${key}=${strVal}`;
}

export function createPortArg(val: number): string {
  return createArg('port', val);
}

export function createSubgraphPortArg(name: string, val: number): string {
  return createArg(`${name}_port`, val);
}

export interface Args {
  get(key: string): string | undefined;
  get(key: string, required: true): string;
  getPort(): number | undefined;
  getPort(required: true): number;
  getSubgraphPort(name: string): number | undefined;
  getSubgraphPort(name: string, required: true): number;
}

export function Args(argv: string[]): Args {
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
  function getSubgraphPort(name: string, required?: true) {
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
    getSubgraphPort,
  };
}
