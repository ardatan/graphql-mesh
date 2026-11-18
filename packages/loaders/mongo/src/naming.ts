export interface MongoNaming {
  typeName(modelName: string): string;
  filterInput(typeName: string): string;
  sortInput(typeName: string): string;
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
  dataLoaderField(typeName: string): string;
  dataLoaderManyField(typeName: string): string;
  createOneField(typeName: string): string;
  createManyField(typeName: string): string;
  updateByIdField(typeName: string): string;
  updateOneField(typeName: string): string;
  updateManyField(typeName: string): string;
  removeByIdField(typeName: string): string;
  removeOneField(typeName: string): string;
  removeManyField(typeName: string): string;
}

export function createDefaultNaming(): MongoNaming {
  return {
    typeName: name => name,
    filterInput: typeName => `${typeName}Filter`,
    sortInput: typeName => `${typeName}Sort`,
    createInput: typeName => `CreateOne${typeName}Input`,
    updateInput: typeName => `UpdateById${typeName}Input`,
    payloadType: typeName => `${typeName}Payload`,
    connectionType: typeName => `${typeName}Connection`,
    edgeType: typeName => `${typeName}Edge`,
    paginationType: typeName => `${typeName}Pagination`,
    findByIdField: typeName => `${typeName}_findById`,
    findByIdsField: typeName => `${typeName}_findByIds`,
    findManyField: typeName => `${typeName}_findMany`,
    findOneField: typeName => `${typeName}_findOne`,
    countField: typeName => `${typeName}_count`,
    connectionField: typeName => `${typeName}_connection`,
    paginationField: typeName => `${typeName}_pagination`,
    dataLoaderField: typeName => `${typeName}_dataLoader`,
    dataLoaderManyField: typeName => `${typeName}_dataLoaderMany`,
    createOneField: typeName => `${typeName}_createOne`,
    createManyField: typeName => `${typeName}_createMany`,
    updateByIdField: typeName => `${typeName}_updateById`,
    updateOneField: typeName => `${typeName}_updateOne`,
    updateManyField: typeName => `${typeName}_updateMany`,
    removeByIdField: typeName => `${typeName}_removeById`,
    removeOneField: typeName => `${typeName}_removeOne`,
    removeManyField: typeName => `${typeName}_removeMany`,
  };
}
