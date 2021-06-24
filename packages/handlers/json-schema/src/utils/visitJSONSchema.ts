import { JSONSchemaObject, JSONSchema } from '@json-schema-tools/meta-schema';

export interface JSONSchemaVisitorContext<T> {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, T>;
  path: string;
  keepObjectRef: boolean;
  reverse: boolean;
}

export async function visitJSONSchema<T>(
  schema: JSONSchema,
  visitorFn: (subSchema: JSONSchema, context: JSONSchemaVisitorContext<T>) => Promise<T> | T,
  { visitedSubschemaResultMap, path, keepObjectRef, reverse }: JSONSchemaVisitorContext<T> = {
    visitedSubschemaResultMap: new WeakMap(),
    path: '',
    keepObjectRef: false,
    reverse: false,
  }
) {
  const context = {
    visitedSubschemaResultMap,
    path,
    keepObjectRef,
    reverse,
  };
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const result: any = keepObjectRef ? schema : {};
      const visitedSchema: any = keepObjectRef ? schema : { ...schema };
      visitedSubschemaResultMap.set(schema, result);
      const visitAndSet = async () => {
        const visitorResult = await visitorFn(visitedSchema, context);
        if (!keepObjectRef) {
          Object.assign(result, visitorResult);
          visitedSubschemaResultMap.set(schema, result);
        } else {
          visitedSubschemaResultMap.set(schema, visitorResult);
        }
      };
      if (reverse) {
        await visitAndSet();
      }
      if (schema.additionalItems) {
        visitedSchema.additionalItems = await visitJSONSchema(schema.additionalItems, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalItems',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.additionalProperties) {
        visitedSchema.additionalProperties = await visitJSONSchema(schema.additionalProperties, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalProperties',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.allOf) {
        visitedSchema.allOf = keepObjectRef ? visitedSchema.allOf : [];
        for (const subSchemaIndex in schema.allOf) {
          visitedSchema.allOf[subSchemaIndex] = await visitJSONSchema(schema.allOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/allOf/' + subSchemaIndex,
            keepObjectRef,
            reverse,
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
            reverse,
          });
        }
      }
      if (schema.contains) {
        visitedSchema.contains = await visitJSONSchema(schema.contains, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/contains',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.definitions) {
        visitedSchema.definitions = keepObjectRef ? visitedSchema.definitions : {};
        for (const definitionName in schema.definitions) {
          visitedSchema.definitions[definitionName] = await visitJSONSchema(
            schema.definitions[definitionName],
            visitorFn,
            {
              visitedSubschemaResultMap,
              path: path + '/definitions/' + definitionName,
              keepObjectRef,
              reverse,
            }
          );
        }
      }
      if (schema.else) {
        visitedSchema.else = await visitJSONSchema(schema.else, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/else',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.if) {
        visitedSchema.if = await visitJSONSchema(schema.if, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/if',
          keepObjectRef,
          reverse,
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
              reverse,
            });
          }
        } else {
          visitedSchema.items = await visitJSONSchema(schema.items, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/items',
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.not) {
        visitedSchema.not = await visitJSONSchema(schema.not, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/not',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.oneOf) {
        visitedSchema.oneOf = keepObjectRef ? visitedSchema.oneOf : [];
        for (const subSchemaIndex in schema.oneOf) {
          visitedSchema.oneOf[subSchemaIndex] = await visitJSONSchema(schema.oneOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/oneOf/' + subSchemaIndex,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.patternProperties) {
        visitedSchema.patternProperties = keepObjectRef ? visitedSchema.patternProperties : {};
        for (const pattern in schema.patternProperties) {
          visitedSchema.patternProperties[pattern] = await visitJSONSchema(
            schema.patternProperties[pattern],
            visitorFn,
            {
              visitedSubschemaResultMap,
              path: path + '/patternProperties/' + pattern,
              keepObjectRef,
              reverse,
            }
          );
        }
      }
      if (schema.properties) {
        visitedSchema.properties = keepObjectRef ? visitedSchema.properties : {};
        for (const property in schema.properties) {
          visitedSchema.properties[property] = await visitJSONSchema(schema.properties[property], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/properties/' + property,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.then) {
        visitedSchema.then = await visitJSONSchema(schema.then, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/then',
          keepObjectRef,
          reverse,
        });
      }

      if (!reverse) {
        await visitAndSet();
      }
    }
    return visitedSubschemaResultMap.get(schema);
  }
  return visitorFn(schema, context);
}
