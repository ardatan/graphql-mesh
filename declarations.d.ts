declare interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
}
declare module 'ajv-formats';
declare module 'dnscache';

declare module 'ioredis-mock' {
  // eslint-disable-next-line import/no-extraneous-dependencies
  import Redis from 'ioredis';
  export default Redis;
}
