import { JSONSchemaObject, JSONSchema } from '@json-schema-tools/meta-schema';

export interface JSONSchemaVisitorContext<T> {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, T>;
  path: string;
  keepObjectRef: boolean;
}

export async function visitJSONSchema<T>(
  schema: JSONSchema,
  visitorFn: (subSchema: JSONSchema, context: JSONSchemaVisitorContext<T>) => Promise<T> | T,
  { visitedSubschemaResultMap, path, keepObjectRef }: JSONSchemaVisitorContext<T> = {
    visitedSubschemaResultMap: new WeakMap(),
    path: '',
    keepObjectRef: false,
  }
) {
  const context = {
    visitedSubschemaResultMap,
    path,
    keepObjectRef,
  };
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const result: any = keepObjectRef ? schema : {};
      const visitedSchema: any = keepObjectRef ? schema : { ...schema };
      visitedSubschemaResultMap.set(schema, result);
      if (schema.additionalItems) {
        visitedSchema.additionalItems = await visitJSONSchema(schema.additionalItems, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalItems',
          keepObjectRef,
        });
      }
      if (schema.additionalProperties) {
        visitedSchema.additionalProperties = await visitJSONSchema(schema.additionalProperties, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalProperties',
          keepObjectRef,
        });
      }
      if (schema.allOf) {
        visitedSchema.allOf = keepObjectRef ? visitedSchema.allOf : [];
        for (const subSchemaIndex in schema.allOf) {
          visitedSchema.allOf[subSchemaIndex] = await visitJSONSchema(schema.allOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/allOf/' + subSchemaIndex,
            keepObjectRef,
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
          });
        }
      }
      if (schema.contains) {
        visitedSchema.contains = await visitJSONSchema(schema.contains, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/contains',
          keepObjectRef,
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
          });
        }
      }
      if (schema.else) {
        visitedSchema.else = await visitJSONSchema(schema.else, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/else',
          keepObjectRef,
        });
      }
      if (schema.if) {
        visitedSchema.if = await visitJSONSchema(schema.if, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/if',
          keepObjectRef,
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
            });
          }
        } else {
          visitedSchema.items = await visitJSONSchema(schema.items, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/items',
            keepObjectRef,
          });
        }
      }
      if (schema.not) {
        visitedSchema.not = await visitJSONSchema(schema.not, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/not',
          keepObjectRef,
        });
      }
      if (schema.oneOf) {
        visitedSchema.oneOf = keepObjectRef ? visitedSchema.oneOf : [];
        for (const subSchemaIndex in schema.oneOf) {
          visitedSchema.oneOf[subSchemaIndex] = await visitJSONSchema(schema.oneOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/oneOf/' + subSchemaIndex,
            keepObjectRef,
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
          });
        }
      }
      if (schema.then) {
        visitedSchema.then = await visitJSONSchema(schema.then, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/then',
          keepObjectRef,
        });
      }

      const visitorResult = await visitorFn(visitedSchema, context);
      Object.assign(result, visitorResult);
      return result;
    }
    return visitedSubschemaResultMap.get(schema);
  }
  return visitorFn(schema, context);
}
