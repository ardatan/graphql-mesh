declare interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
}
declare module 'ajv-formats';
declare module 'undici' {
  export const fetch: typeof import('cross-fetch').fetch;
  export const Request: typeof import('cross-fetch').Request;
  export const Response: typeof import('cross-fetch').Response;
}
