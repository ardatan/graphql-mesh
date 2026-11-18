/**
 * GraphQL type / field naming for loader emit. Defaults mirror MongoDB collection
 * methods (`findOne` / `find` / `insertOne` / `deleteMany` / …). Override via
 * `LoadMongoSubgraphOpts.naming`.
 *
 * Client filter args use compose-mongoose style (`filter: *FilterInput`); other
 * args mirror the driver (`sort` / `document` / `update`). Field operators use
 * Bare Mongo op names (`gte`, `in`, … → `$gte` / `$in` in the transport; `$` is GraphQL-illegal).
 *
 * @example
 * ```ts
 * naming: {
 *   findManyField: typeName => `list${typeName}s`,
 *   insertOneField: typeName => `add${typeName}`,
 * }
 * ```
 *
 * @see https://www.mongodb.com/docs/manual/reference/method/
 * @see https://www.mongodb.com/docs/manual/reference/mql/query-predicates/
 */
export interface MongoNaming {
  /** Object type name from model config `name` (default: identity). */
  typeName(modelName: string): string;
  /** Filter input type (`User` → `UserFilterInput`). */
  filterInput(typeName: string): string;
  /** Client sort enum (`UserSort` with `id_asc` / `name_desc` values). */
  sortEnum(typeName: string): string;
  /** Insert document input (`UserDocumentInput`). */
  documentInput(typeName: string): string;
  /** Update ops input (`UserUpdateInput` with `set` / `inc` / …). */
  updateInput(typeName: string): string;
  /** Mutation payload (`UserPayload`). */
  payloadType(typeName: string): string;
  connectionType(typeName: string): string;
  edgeType(typeName: string): string;
  paginationType(typeName: string): string;
  /** `findUserById` */
  findByIdField(typeName: string): string;
  /** `findUsersByIds` */
  findByIdsField(typeName: string): string;
  /** `findUsers` */
  findManyField(typeName: string): string;
  /** `findOneUser` */
  findOneField(typeName: string): string;
  /** `countDocumentsUsers` */
  countDocumentsField(typeName: string): string;
  /** `aggregateUsers` */
  aggregateField(typeName: string): string;
  /** `findUsersConnection` */
  connectionField(typeName: string): string;
  /** `findUsersPagination` */
  paginationField(typeName: string): string;
  /** `insertOneUser` */
  insertOneField(typeName: string): string;
  /** `insertManyUsers` */
  insertManyField(typeName: string): string;
  /** `updateUserById` */
  updateByIdField(typeName: string): string;
  /** `updateOneUser` */
  updateOneField(typeName: string): string;
  /** `updateManyUsers` */
  updateManyField(typeName: string): string;
  /** `deleteUserById` */
  deleteByIdField(typeName: string): string;
  /** `deleteOneUser` */
  deleteOneField(typeName: string): string;
  /** `deleteManyUsers` */
  deleteManyField(typeName: string): string;
}

function pluralType(typeName: string): string {
  if (!typeName) return typeName;
  if (/[^aeiou]y$/i.test(typeName)) {
    return `${typeName.slice(0, -1)}ies`;
  }
  if (/s$/i.test(typeName)) return typeName;
  return `${typeName}s`;
}

/** Default {@link MongoNaming} used when `opts.naming` is omitted. */
export function createDefaultNaming(): MongoNaming {
  return {
    typeName: name => name,
    filterInput: typeName => `${typeName}FilterInput`,
    sortEnum: typeName => `${typeName}Sort`,
    documentInput: typeName => `${typeName}DocumentInput`,
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
    countDocumentsField: typeName => `countDocuments${pluralType(typeName)}`,
    // db.collection.aggregate
    aggregateField: typeName => `aggregate${pluralType(typeName)}`,
    // GraphQL pagination helpers (not shell methods)
    connectionField: typeName => `find${pluralType(typeName)}Connection`,
    paginationField: typeName => `find${pluralType(typeName)}Pagination`,
    // db.collection.insertOne / insertMany
    insertOneField: typeName => `insertOne${typeName}`,
    insertManyField: typeName => `insertMany${pluralType(typeName)}`,
    // db.collection.updateOne / updateMany (+ ById convenience)
    updateOneField: typeName => `updateOne${typeName}`,
    updateManyField: typeName => `updateMany${pluralType(typeName)}`,
    updateByIdField: typeName => `update${typeName}ById`,
    // db.collection.deleteOne / deleteMany (+ ById convenience)
    deleteOneField: typeName => `deleteOne${typeName}`,
    deleteManyField: typeName => `deleteMany${pluralType(typeName)}`,
    deleteByIdField: typeName => `delete${typeName}ById`,
  };
}
