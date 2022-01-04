import { JSONSchemaObject, JSONSchema } from './types';

export enum OnCircularReference {
  WARN = 'WARN',
  ERROR = 'ERROR',
  IGNORE = 'IGNORE',
}

export interface JSONSchemaVisitorContext<T> {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, T>;
  path: string;
  keepObjectRef: boolean;
  onCircularReference: OnCircularReference;
}

export const FIRST_VISITED_PATH = Symbol('FIRST_VISITED_PATH');

export async function visitJSONSchema<T>(
  schema: JSONSchema,
  visitorFn: (subSchema: JSONSchema, context: JSONSchemaVisitorContext<T>) => Promise<T> | T,
  { visitedSubschemaResultMap, path, keepObjectRef, onCircularReference }: JSONSchemaVisitorContext<T> = {
    visitedSubschemaResultMap: new WeakMap(),
    path: '',
    keepObjectRef: false,
    onCircularReference: OnCircularReference.IGNORE,
  }
) {
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const result: any = keepObjectRef ? schema : {};
      const visitedSchema: any = keepObjectRef ? schema : { ...schema };
      result[FIRST_VISITED_PATH] = path;
      visitedSubschemaResultMap.set(schema, result);
      if (schema.additionalItems) {
        visitedSchema.additionalItems = await visitJSONSchema(schema.additionalItems, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalItems',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.additionalProperties) {
        visitedSchema.additionalProperties = await visitJSONSchema(schema.additionalProperties, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalProperties',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.allOf) {
        visitedSchema.allOf = keepObjectRef ? visitedSchema.allOf : [];
        for (const subSchemaIndex in schema.allOf) {
          visitedSchema.allOf[subSchemaIndex] = await visitJSONSchema(schema.allOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/allOf/' + subSchemaIndex,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.anyOf) {
        visitedSchema.anyOf = keepObjectRef ? visitedSchema.anyOf : [];
        for (const subSchemaIndex in schema.anyOf) {
          visitedSchema.anyOf[subSchemaIndex] = await visitJSONSchema(schema.anyOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/anyOf/' + subSchemaIndex,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.contains) {
        visitedSchema.contains = await visitJSONSchema(schema.contains, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/contains',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.definitions) {
        visitedSchema.definitions = keepObjectRef ? visitedSchema.definitions : {};
        const entries = Object.entries(schema.definitions);
        for (const [definitionName, subSchema] of entries) {
          visitedSchema.definitions[definitionName] = await visitJSONSchema(subSchema, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/definitions/' + definitionName,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.else) {
        visitedSchema.else = await visitJSONSchema(schema.else, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/else',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.if) {
        visitedSchema.if = await visitJSONSchema(schema.if, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/if',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          visitedSchema.items = keepObjectRef ? visitedSchema.items : [];
          for (const subSchemaIndex in schema.items) {
            visitedSchema.items[subSchemaIndex] = await visitJSONSchema(schema.items[subSchemaIndex], visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/items/' + subSchemaIndex,
              keepObjectRef,
              onCircularReference,
            });
          }
        } else {
          visitedSchema.items = await visitJSONSchema(schema.items, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/items',
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.not) {
        visitedSchema.not = await visitJSONSchema(schema.not, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/not',
          keepObjectRef,
          onCircularReference,
        });
      }
      if (schema.oneOf) {
        visitedSchema.oneOf = keepObjectRef ? visitedSchema.oneOf : [];
        for (const subSchemaIndex in schema.oneOf) {
          visitedSchema.oneOf[subSchemaIndex] = await visitJSONSchema(schema.oneOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/oneOf/' + subSchemaIndex,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.patternProperties) {
        visitedSchema.patternProperties = keepObjectRef ? visitedSchema.patternProperties : {};
        const entries = Object.entries(schema.patternProperties);
        for (const [pattern, subSchema] of entries) {
          visitedSchema.patternProperties[pattern] = await visitJSONSchema(subSchema, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/patternProperties/' + pattern,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.properties) {
        visitedSchema.properties = keepObjectRef ? visitedSchema.properties : {};
        const entries = Object.entries(schema.properties);
        for (const [propertyName, subSchema] of entries) {
          visitedSchema.properties[propertyName] = await visitJSONSchema(subSchema, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/properties/' + propertyName,
            keepObjectRef,
            onCircularReference,
          });
        }
      }
      if (schema.then) {
        visitedSchema.then = await visitJSONSchema(schema.then, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/then',
          keepObjectRef,
          onCircularReference,
        });
      }

      if (schema.components) {
        visitedSchema.components = keepObjectRef ? visitedSchema.components : {};
        visitedSchema.components.schemas = keepObjectRef ? visitedSchema.components.schemas : {};
        const entries = Object.entries(schema.components.schemas);
        for (const [schemaName, subSchema] of entries) {
          visitedSchema.components.schemas[schemaName] = await visitJSONSchema(subSchema, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/components/schemas/' + schemaName,
            keepObjectRef,
            onCircularReference,
          });
        }
      }

      const visitorResult = await visitorFn(visitedSchema, {
        visitedSubschemaResultMap,
        path,
        keepObjectRef,
        onCircularReference,
      });
      delete result[FIRST_VISITED_PATH];
      Object.assign(result, visitorResult);
      return result;
    }
    const result = visitedSubschemaResultMap.get(schema);
    if (onCircularReference !== OnCircularReference.IGNORE && result[FIRST_VISITED_PATH]) {
      const message = `Circular reference detected on ${path} to ${result[FIRST_VISITED_PATH]}`;
      if (onCircularReference === OnCircularReference.ERROR) {
        throw new Error(message);
      } else if (onCircularReference === OnCircularReference.WARN) {
        console.warn(message);
      }
    }
    return result;
  }
  return visitorFn(schema, {
    visitedSubschemaResultMap,
    path,
    keepObjectRef,
    onCircularReference,
  });
}
