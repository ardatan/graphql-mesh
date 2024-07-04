declare module 'mysql-utilities' {
  import type { Connection } from 'mysql';
  export function upgrade(connection: Connection): void;
  export function introspection(connection: Connection): void;
}
