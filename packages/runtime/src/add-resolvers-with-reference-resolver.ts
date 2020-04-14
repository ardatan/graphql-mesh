import { IAddResolversToSchemaOptions, addResolveFunctionsToSchema } from 'graphql-tools';
import { isObjectType } from 'graphql';

export function addResolversWithReferenceResolver(options: IAddResolversToSchemaOptions) {
  const schema = addResolveFunctionsToSchema(options);
  for (const typeName in options.resolvers) {
    for (const fieldName in options.resolvers[typeName]) {
      if (fieldName === '__resolveReference') {
        const type = schema.getType(typeName);
        if (isObjectType(type)) {
          (type as any).resolveReference = (options.resolvers[typeName] as any).__resolveReference;
        }
      }
    }
  }
  return schema;
}
