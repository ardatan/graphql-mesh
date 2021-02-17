declare module 'mysql-utilities' {
  import { Connection , Connection } from 'mysql';
  export function upgrade(connection: Connection): void;
  export function introspection(connection: Connection): void;
}
declare module 'mariadb-utilities' {
  
  export function upgrade(connection: Connection): void;
  export function introspection(connection: Connection): void;
}
