import { camelCase, constantCase, pascalCase } from 'change-case';
import pluralize from 'pluralize';

/**
 * Hooks that turn SQL table/column names into GraphQL type and field names.
 * Pass a `Partial<SqlNaming>` on {@link LoadSqlSubgraphOpts.naming} to override.
 *
 * @example
 * ```ts
 * loadSqlSubgraph('shop', {
 *   endpoint: 'postgres://localhost/shop',
 *   naming: {
 *     typeName: table => table.replace(/_+/g, ' '), // custom
 *   },
 * })
 * ```
 */
export interface SqlNaming {
  /**
   * Object type for a table (`albums` → `Album`).
   *
   * @example (table) => pascalCase(pluralize.singular(table))
   */
  typeName(table: string): string;
  /**
   * Field for a column (`AlbumId` → `albumId`, sole PK → `id` via {@link pkFieldName}).
   *
   * @example (column) => camelCase(column)
   */
  fieldName(column: string): string;
  /**
   * Plural root field (`Album` → `albums`).
   *
   * @example (typeName) => camelCase(pluralize.plural(typeName))
   */
  pluralField(typeName: string): string;
  /**
   * Singular root field (`Album` → `album`).
   *
   * @example (typeName) => camelCase(typeName)
   */
  singularField(typeName: string): string;
  /**
   * Connection root field (`Album` → `allAlbums`).
   *
   * @example (typeName) => `all${pascalCase(pluralize.plural(typeName))}`
   */
  connectionField(typeName: string): string;
  /**
   * Count root field (`Album` → `albumsCount`).
   *
   * @example (typeName) => `${camelCase(pluralize.plural(typeName))}Count`
   */
  countField(typeName: string): string;
  /**
   * Order-by enum name (`Album` → `AlbumOrderBy`).
   *
   * @example (typeName) => `${typeName}OrderBy`
   */
  orderByEnum(typeName: string): string;
  /**
   * Filter input name (`Album` → `AlbumFilter`).
   *
   * @example (typeName) => `${typeName}Filter`
   */
  filterInput(typeName: string): string;
  /**
   * Create input name (`Album` → `CreateAlbumInput`).
   *
   * @example (typeName) => `Create${typeName}Input`
   */
  createInput(typeName: string): string;
  /**
   * Update input name (`Album` → `UpdateAlbumInput`).
   *
   * @example (typeName) => `Update${typeName}Input`
   */
  updateInput(typeName: string): string;
  /**
   * Mutation payload type (`Album` → `AlbumPayload`).
   *
   * @example (typeName) => `${typeName}Payload`
   */
  payloadType(typeName: string): string;
  /**
   * Delete payload type (`Album` → `DeleteAlbumPayload`).
   *
   * @example (typeName) => `Delete${typeName}Payload`
   */
  deletePayloadType(typeName: string): string;
  /**
   * Order enum value (`title` + `ASC` → `TITLE_ASC`).
   *
   * @example (fieldName, dir) => `${constantCase(fieldName)}_${dir}`
   */
  orderValue(fieldName: string, dir: 'ASC' | 'DESC'): string;
  /**
   * Primary-key GraphQL field (`sole` PK → `id`, else camelCase column).
   *
   * @example (column, isSolePk) => (isSolePk ? 'id' : camelCase(column))
   */
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
