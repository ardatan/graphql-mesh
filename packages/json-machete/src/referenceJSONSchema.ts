import { JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';
import { process } from '@graphql-mesh/cross-helpers';

export async function referenceJSONSchema(schema: JSONSchemaObject) {
  const initialDefinitions: Record<string, JSONSchemaObject> = {};
  const { $ref: initialRef } = await visitJSONSchema(schema, {
    enter: (subSchema, { path }) => {
      if (typeof subSchema === 'object') {
        if (process.env.DEBUG) {
          console.log(`Referencing ${path}`);
        }
        // Remove $id refs
        delete subSchema.$id;
        if (subSchema.$ref) {
          return subSchema;
        } else if (subSchema.title) {
          if (subSchema.title in initialDefinitions) {
            let cnt = 2;
            while (`${subSchema.title}${cnt}` in initialDefinitions) {
              cnt++;
            }
            const definitionProp = `${subSchema.title}${cnt}`.split(' ').join('_SPACE_');
            initialDefinitions[definitionProp] = subSchema;
            return {
              $ref: `#/definitions/${definitionProp}`,
              ...subSchema,
            };
          } else {
            const definitionProp = subSchema.title.split(' ').join('_SPACE_');
            initialDefinitions[definitionProp] = subSchema;
            return {
              $ref: `#/definitions/${definitionProp}`,
              ...subSchema,
            };
          }
        } else if (subSchema.type === 'object') {
          console.warn(`${path} cannot be referenced because it has no title`);
        }
      }
      return subSchema;
    },
  });
  const { definitions: finalDefinitions } = await visitJSONSchema(
    {
      definitions: initialDefinitions,
    },
    {
      leave: (subSchema, { path }) => {
        if (typeof subSchema === 'object') {
          if (subSchema.$ref) {
            return {
              $ref: subSchema.$ref,
            };
          }
        }
        return subSchema;
      },
    }
  );
  return {
    $ref: initialRef,
    definitions: finalDefinitions,
  };
}
