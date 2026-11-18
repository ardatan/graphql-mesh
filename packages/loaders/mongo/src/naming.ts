export interface MongoNaming {
  typeName(modelName: string): string;
  whereInput(typeName: string): string;
  sortInput(typeName: string): string;
  findByIdField(typeName: string): string;
  findManyField(typeName: string): string;
  findOneField(typeName: string): string;
  countField(typeName: string): string;
}

export function createDefaultNaming(): MongoNaming {
  return {
    typeName: name => name,
    whereInput: typeName => `${typeName}Where`,
    sortInput: typeName => `${typeName}Sort`,
    findByIdField: typeName => `${typeName}_findById`,
    findManyField: typeName => `${typeName}_findMany`,
    findOneField: typeName => `${typeName}_findOne`,
    countField: typeName => `${typeName}_count`,
  };
}
