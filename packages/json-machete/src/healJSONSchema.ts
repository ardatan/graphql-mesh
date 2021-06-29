import { JSONSchema } from '@json-schema-tools/meta-schema';
import { visitJSONSchema } from './visitJSONSchema';

const reservedTypeNames = ['Query', 'Mutation', 'Subscription'];

export async function healJSONSchema(schema: JSONSchema) {
  return visitJSONSchema<JSONSchema>(
    schema,
    (subSchema, { path }) => {
      if (typeof subSchema === 'object') {
        if (!subSchema.title && !subSchema.$ref) {
          // Try to get definition name
          const maybeDefinitionBasedPath = path.includes('/definitions/') ? path.split('/definitions/')[1] : path;
          let pathBasedName = maybeDefinitionBasedPath.split('/properties').join('').split('/').join('_');
          switch (subSchema.type) {
            case 'string':
              if (subSchema.pattern || subSchema.maxLength || subSchema.minLength || subSchema.enum) {
                subSchema.title = pathBasedName;
              } else if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
            case 'integer':
              if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
          }
          if (reservedTypeNames.includes(pathBasedName)) {
            pathBasedName += '_';
          }
          subSchema.title = subSchema.title || pathBasedName;
        }
        if (!subSchema.type) {
          if (subSchema.properties) {
            subSchema.type = 'object';
          }
          if (subSchema.items) {
            subSchema.type = 'array';
          }
        }
      }
      return subSchema;
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
      keepObjectRef: true,
    }
  );
}
