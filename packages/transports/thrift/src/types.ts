import type {
  IMethodAnnotations,
  IThriftAnnotations,
  TType,
} from '@creditkarma/thrift-server-core';

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
export type EnumTypeVal = { id?: number; type: TType.ENUM };
export type StructTypeVal = { id?: number; type: TType.STRUCT; name: string; fields: TypeMap };
export type VoidTypeVal = { id?: number; type: TType.VOID };
export type RefTypeVal = { id?: number; type: 'ref'; name: string };
export type TypeMap = Record<string, TypeVal>;

export interface GraphQLThriftAnnotations {
  kind: 'thrift';
  subgraph: string;
  location: string;
  headers: Record<string, string>;
  options: {
    clientAnnotations: {
      serviceName: string;
      annotations: IThriftAnnotations;
      methodNames: string[];
      methodAnnotations: IMethodAnnotations;
      methodParameters: Record<string, number>;
    };
    topTypeMap: TypeMap;
  };
}
