import type { TType } from '@creditkarma/thrift-server-core';

export type TypeVal =
  | BaseTypeVal
  | ListTypeVal
  | SetTypeVal
  | MapTypeVal
  | EnumTypeVal
  | StructTypeVal
  | VoidTypeVal
  | RefTypeVal;
export type BaseTypeVal = {
  id?: number;
  type: TType.BOOL | TType.BYTE | TType.DOUBLE | TType.I16 | TType.I32 | TType.I64 | TType.STRING;
};
export type ListTypeVal = { id?: number; type: TType.LIST; elementType: TypeVal };
export type SetTypeVal = { id?: number; type: TType.SET; elementType: TypeVal };
export type MapTypeVal = { id?: number; type: TType.MAP; keyType: TypeVal; valType: TypeVal };
export type EnumTypeVal = {
  id?: number;
  type: TType.ENUM;
  /**
   * Thrift enum member name → i32 wire value.
   * Survives SDL print via compact `@thrift__rpc` `->match` on `i32` args/selection
   * (same shape as TJSON `@connect`).
   */
  values?: Record<string, number>;
};
export type StructTypeVal = { id?: number; type: TType.STRUCT; name: string; fields: TypeMap };
export type VoidTypeVal = { id?: number; type: TType.VOID };
export type RefTypeVal = { id?: number; type: 'ref'; name: string };
export type TypeMap = Record<string, TypeVal>;

/**
 * `@transport(kind: "thrift")` annotations stored on the schema definition.
 * Wire protocol for this transport is always binary (`protocol: 'json'` loaders
 * use `@connect` instead and do not emit these annotations).
 *
 * @example
 * ```graphql
 * schema @transport(
 *   subgraph: "Calc"
 *   kind: "thrift"
 *   location: "http://localhost:4000/thrift"
 *   headers: [["x-api-key", "123"]]
 * ) {
 *   query: Query
 * }
 * ```
 */
export interface GraphQLThriftAnnotations {
  /**
   * Transport kind discriminator (always `"thrift"`).
   *
   * @example 'thrift'
   */
  kind: 'thrift';
  /**
   * Owning subgraph name.
   *
   * @example 'Calc'
   */
  subgraph: string;
  /**
   * HTTP base URL for the binary Thrift client (`host` / `path` / `https`).
   *
   * @example 'http://localhost:4000/thrift'
   */
  location: string;
  /**
   * Static or interpolated request headers (`[[name, value], ...]` or a record).
   *
   * @example [['x-api-key', '123']]
   * @example { Authorization: 'Bearer {context.token}' }
   */
  headers: [string, string][] | Record<string, string>;
}
