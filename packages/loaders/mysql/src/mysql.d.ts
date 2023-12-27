/* eslint-disable camelcase */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as mysql from 'mysql';

declare module 'mysql' {
  export interface DatabaseTable {
    TABLE_NAME: string;
    TABLE_TYPE: string;
    ENGINE: string;
    VERSION: number;
    ROW_FORMAT: string;
    TABLE_ROWS: number;
    AVG_ROW_LENGTH: number;
    DATA_LENGTH: number;
    MAX_DATA_LENGTH: number;
    INDEX_LENGTH: number;
    DATA_FREE: number;
    AUTO_INCREMENT: number;
    CREATE_TIME: Date;
    UPDATE_TIME: Date;
    CHECK_TIME: Date;
    TABLE_COLLATION: string;
    CHECKSUM?: any;
    CREATE_OPTIONS: string;
    TABLE_COMMENT: string;
  }

  export interface TableField {
    Field: string;
    Type: string;
    Collation: string;
    Null: string;
    Key: string;
    Default?: any;
    Extra: string;
    Privileges: string;
    Comment: string;
  }

  export interface TableForeign {
    CONSTRAINT_NAME: string;
    COLUMN_NAME: string;
    ORDINAL_POSITION: number;
    POSITION_IN_UNIQUE_CONSTRAINT: number;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
  }

  export interface TablePrimaryKey {
    Table: string;
    Non_unique: number;
    Key_name: string;
    Seq_in_index: number;
    Column_name: string;
    Collation: string;
    Cardinality: number;
    Sub_part?: any;
    Packed?: any;
    Null: string;
    Index_type: string;
    Comment: string;
    Index_comment: string;
  }
  type Callback<T> = (err: Error, data: T) => void;
  export interface Connection {
    databaseTables(databaseName: string, callback: Callback<Record<string, DatabaseTable>>);
    fields(tableName: string, callback: Callback<Record<string, TableField>>);
    foreign(tableName: string, callback: Callback<Record<string, TableForeign>>);
    primary(tableName: string, callback: Callback<TablePrimaryKey>);
    selectLimit(
      tableName: string,
      fields: string[],
      limit: number[],
      where: any,
      orderBy: any,
      callback: Callback<any[]>,
    );
    select(
      tableName: string,
      fields: string[],
      where: any,
      orderBy: any,
      callback: Callback<any[]>,
    );
    insert(
      tableName: string,
      record: Record<string, any>,
      callback: Callback<{ recordId: string | number }>,
    );
    update(tableName: string, input: any, where: any, callback: Callback<{ affectedRows: any }>);
    delete(tableName: string, where: any, callback: Callback<{ affectedRows: any }>);
    count(tableName: string, where: any, callback: Callback<number>);
    queryKeyValue(query: string, field: string[], callback: Callback<Record<string, any>>);
  }
}
