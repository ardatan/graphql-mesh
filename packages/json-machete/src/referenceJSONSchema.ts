import { JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';

export async function referenceJSONSchema(schema: JSONSchemaObject) {
  const definitions: Record<string, JSONSchemaObject> = {};
  const finalSchema = await visitJSONSchema<any>(schema, (subSchema, { path }) => {
    if (typeof subSchema === 'object') {
      if (process.env.DEBUG) {
        console.log(`Referencing ${path}`);
      }
      // Remove $id refs
      delete subSchema.$id;
      if (subSchema.$ref) {
        throw new Error('Input schema should be fully resolved! It cannot have $refs in it!');
      } else if (subSchema.title) {
        if (subSchema.title in definitions) {
          let cnt = 2;
          while (`${subSchema.title}${cnt}` in definitions) {
            cnt++;
          }
          const definitionProp = `${subSchema.title}${cnt}`.split(' ').join('_SPACE_');
          definitions[definitionProp] = subSchema;
          const $ref = `#/definitions/${definitionProp}`;
          return {
            $ref,
          };
        } else {
          const definitionProp = subSchema.title.split(' ').join('_SPACE_');
          definitions[definitionProp] = subSchema;
          const $ref = `#/definitions/${definitionProp}`;
          return {
            $ref,
          };
        }
      } else if (subSchema.type === 'object') {
        console.warn(`${path} cannot be referenced because it has no title`);
      }
    }
    return subSchema;
  });
  finalSchema.definitions = definitions;
  return finalSchema;
}
