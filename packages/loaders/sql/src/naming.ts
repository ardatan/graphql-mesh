import { camelCase, constantCase, pascalCase } from 'change-case';
import pluralize from 'pluralize';

export interface SqlNaming {
  typeName(table: string): string;
  fieldName(column: string): string;
  pluralField(typeName: string): string;
  singularField(typeName: string): string;
  connectionField(typeName: string): string;
  countField(typeName: string): string;
  orderByEnum(typeName: string): string;
  filterInput(typeName: string): string;
  createInput(typeName: string): string;
  updateInput(typeName: string): string;
  payloadType(typeName: string): string;
  deletePayloadType(typeName: string): string;
  orderValue(fieldName: string, dir: 'ASC' | 'DESC'): string;
  pkFieldName(column: string, isSolePk: boolean): string;
}

export function createDefaultNaming(): SqlNaming {
  return {
    typeName(table) {
      return pascalCase(pluralize.singular(table));
    },
    fieldName(column) {
      return camelCase(column);
    },
    pluralField(typeName) {
      return camelCase(pluralize.plural(typeName));
    },
    singularField(typeName) {
      return camelCase(typeName);
    },
    connectionField(typeName) {
      return `all${pascalCase(pluralize.plural(typeName))}`;
    },
    countField(typeName) {
      return `${camelCase(pluralize.plural(typeName))}Count`;
    },
    orderByEnum(typeName) {
      return `${typeName}OrderBy`;
    },
    filterInput(typeName) {
      return `${typeName}Filter`;
    },
    createInput(typeName) {
      return `Create${typeName}Input`;
    },
    updateInput(typeName) {
      return `Update${typeName}Input`;
    },
    payloadType(typeName) {
      return `${typeName}Payload`;
    },
    deletePayloadType(typeName) {
      return `Delete${typeName}Payload`;
    },
    orderValue(fieldName, dir) {
      return `${constantCase(fieldName)}_${dir}`;
    },
    pkFieldName(column, isSolePk) {
      if (isSolePk) return 'id';
      return camelCase(column);
    },
  };
}
