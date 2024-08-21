import type { Connection } from 'mysql';

export interface MySQLContext {
  mysqlConnection: Connection;
}
export interface MySQLSSLOptions {
  rejectUnauthorized?: boolean;
  caPath?: string;
  ca?: string | Buffer;
}
