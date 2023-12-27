import type { Connection } from 'mysql';

export interface MySQLSSLOptions {
  rejectUnauthorized?: boolean;
  caPath?: string;
  ca?: string | Buffer;
}

export interface MySQLContext {
  mysqlConnection: Connection;
}

export interface TableFieldConfig {
  table: string;
  fields: string[];
}
