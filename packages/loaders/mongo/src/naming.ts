/**
 * Default GraphQL naming aligned with the SQL / PostGraphile-ish Mesh stack
 * (`user` / `users` / `allUsers` / `createUser`, client args `where` / `orderBy`).
 */
export interface MongoNaming {
  typeName(modelName: string): string;
  whereInput(typeName: string): string;
  orderByInput(typeName: string): string;
  createInput(typeName: string): string;
  updateInput(typeName: string): string;
  payloadType(typeName: string): string;
  connectionType(typeName: string): string;
  edgeType(typeName: string): string;
  paginationType(typeName: string): string;
  findByIdField(typeName: string): string;
  findByIdsField(typeName: string): string;
  findManyField(typeName: string): string;
  findOneField(typeName: string): string;
  countField(typeName: string): string;
  connectionField(typeName: string): string;
  paginationField(typeName: string): string;
  createOneField(typeName: string): string;
  createManyField(typeName: string): string;
  updateByIdField(typeName: string): string;
  updateOneField(typeName: string): string;
  updateManyField(typeName: string): string;
  removeByIdField(typeName: string): string;
  removeOneField(typeName: string): string;
  removeManyField(typeName: string): string;
}

function camel(typeName: string): string {
  if (!typeName) return typeName;
  return typeName.charAt(0).toLowerCase() + typeName.slice(1);
}

function pluralType(typeName: string): string {
  if (!typeName) return typeName;
  if (/[^aeiou]y$/i.test(typeName)) {
    return `${typeName.slice(0, -1)}ies`;
  }
  if (/s$/i.test(typeName)) return typeName;
  return `${typeName}s`;
}

function pluralCamel(typeName: string): string {
  return camel(pluralType(typeName));
}

export function createDefaultNaming(): MongoNaming {
  return {
    typeName: name => name,
    whereInput: typeName => `${typeName}WhereInput`,
    orderByInput: typeName => `${typeName}OrderByInput`,
    createInput: typeName => `Create${typeName}Input`,
    updateInput: typeName => `Update${typeName}Input`,
    payloadType: typeName => `${typeName}Payload`,
    connectionType: typeName => `${typeName}Connection`,
    edgeType: typeName => `${typeName}Edge`,
    paginationType: typeName => `${typeName}Pagination`,
    findByIdField: typeName => camel(typeName),
    findByIdsField: typeName => `${pluralCamel(typeName)}ByIds`,
    findManyField: typeName => pluralCamel(typeName),
    findOneField: typeName => `find${typeName}`,
    countField: typeName => `${pluralCamel(typeName)}Count`,
    connectionField: typeName => `all${pluralType(typeName)}`,
    paginationField: typeName => `${pluralCamel(typeName)}Pagination`,
    createOneField: typeName => `create${typeName}`,
    createManyField: typeName => `create${pluralType(typeName)}`,
    updateByIdField: typeName => `update${typeName}`,
    updateOneField: typeName => `update${typeName}Where`,
    updateManyField: typeName => `update${pluralType(typeName)}`,
    removeByIdField: typeName => `delete${typeName}`,
    removeOneField: typeName => `delete${typeName}Where`,
    removeManyField: typeName => `delete${pluralType(typeName)}`,
  };
}
