import { JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';
import { DefaultLogger } from '@graphql-mesh/utils';

export async function referenceJSONSchema(schema: JSONSchemaObject, logger = new DefaultLogger('referenceJSONSchema')) {
  const initialDefinitions: Record<string, JSONSchemaObject> = {};
  const { $ref: initialRef } = await visitJSONSchema(schema, {
    enter: (subSchema, { path }) => {
      if (typeof subSchema === 'object') {
        // Remove $id refs
        delete subSchema.$id;
        if (subSchema.$ref) {
          return subSchema;
        } else if (subSchema.title) {
          logger.debug(`Referencing ${path}`);
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
          logger.debug(`${path} cannot be referenced because it has no title`);
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
      enter: subSchema => {
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
