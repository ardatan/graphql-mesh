declare interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
}
declare module 'ajv-formats';
declare module 'dnscache';
declare module 'json-bigint-patch';

declare module 'newrelic' {
  const shim: any;
  function startWebTransaction(url: string, callback: () => Promise<void>): void;
}

declare module 'newrelic/*' {
  export = shim;
}

declare module '@newrelic/test-utilities' {
  export const TestAgent: any;
}
