/**
 * Default GraphQL naming aligned with MongoDB collection methods
 * (`findOne` / `find` / `insertOne` / `updateMany` / …).
 *
 * Client args mirror shell/driver: `query` / `sort` / `document` / `update`.
 * Query operators use Mongo names without `$` (`gte`, `in`, …) for GraphQL
 * legality + type safety; transport maps them to `$gte` / `$in`.
 *
 * @see https://www.mongodb.com/docs/manual/reference/method/
 * @see https://www.mongodb.com/docs/manual/reference/mql/query-predicates/
 */
export interface MongoNaming {
  typeName(modelName: string): string;
  queryInput(typeName: string): string;
  /** Client sort enum (`UserSort` with `id_asc` / `name_desc` values). */
  sortEnum(typeName: string): string;
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
  aggregateField(typeName: string): string;
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
    queryInput: typeName => `${typeName}QueryInput`,
    sortEnum: typeName => `${typeName}Sort`,
    createInput: typeName => `${typeName}DocumentInput`,
    updateInput: typeName => `${typeName}UpdateInput`,
    payloadType: typeName => `${typeName}Payload`,
    connectionType: typeName => `${typeName}Connection`,
    edgeType: typeName => `${typeName}Edge`,
    paginationType: typeName => `${typeName}Pagination`,
    // db.collection.findOne / find / find({ _id }) convenience
    findOneField: typeName => `findOne${typeName}`,
    findManyField: typeName => `find${pluralType(typeName)}`,
    findByIdField: typeName => `find${typeName}ById`,
    findByIdsField: typeName => `find${pluralType(typeName)}ByIds`,
    // db.collection.countDocuments
    countField: typeName => `countDocuments${pluralType(typeName)}`,
    // db.collection.aggregate
    aggregateField: typeName => `aggregate${pluralType(typeName)}`,
    // GraphQL pagination helpers (not shell methods)
    connectionField: typeName => `find${pluralType(typeName)}Connection`,
    paginationField: typeName => `find${pluralType(typeName)}Pagination`,
    // db.collection.insertOne / insertMany
    createOneField: typeName => `insertOne${typeName}`,
    createManyField: typeName => `insertMany${pluralType(typeName)}`,
    // db.collection.updateOne / updateMany (+ ById convenience)
    updateOneField: typeName => `updateOne${typeName}`,
    updateManyField: typeName => `updateMany${pluralType(typeName)}`,
    updateByIdField: typeName => `update${typeName}ById`,
    // db.collection.deleteOne / deleteMany (+ ById convenience)
    removeOneField: typeName => `deleteOne${typeName}`,
    removeManyField: typeName => `deleteMany${pluralType(typeName)}`,
    removeByIdField: typeName => `delete${typeName}ById`,
  };
}
