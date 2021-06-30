import { JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';

export async function referenceJSONSchema(schema: JSONSchemaObject) {
  const definitions: Record<string, JSONSchemaObject> = {};
  const finalSchema = await visitJSONSchema<any>(schema, subSchema => {
    if (typeof subSchema === 'object') {
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
          const definitionProp = `${subSchema.title}${cnt}`;
          definitions[definitionProp] = subSchema;
          const $ref = `#/definitions/${definitionProp}`;
          return {
            $ref,
          };
        } else {
          definitions[subSchema.title] = subSchema;
          const $ref = `#/definitions/${subSchema.title}`;
          return {
            $ref,
          };
        }
      }
    }
    return subSchema;
  });
  finalSchema.definitions = definitions;
  return finalSchema;
}
