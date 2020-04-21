declare module 'mysql-utilities' {
  import { Connection } from 'mysql';
  export function upgrade(connection: Connection): void;
  export function introspection(connection: Connection): void;
}
