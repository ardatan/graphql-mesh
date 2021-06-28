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
        await Promise.all(
          schema.allOf.map(async (subSchema, subSchemaIndex) => {
            visitedSchema.allOf[subSchemaIndex] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/allOf/' + subSchemaIndex,
              keepObjectRef,
              reverse,
            });
          })
        );
      }
      if (schema.anyOf) {
        visitedSchema.anyOf = keepObjectRef ? visitedSchema.anyOf : [];
        await Promise.all(
          schema.anyOf.map(async (subSchema, subSchemaIndex) => {
            visitedSchema.anyOf[subSchemaIndex] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/anyOf/' + subSchemaIndex,
              keepObjectRef,
              reverse,
            });
          })
        );
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
        await Promise.all(
          Object.entries(schema.definitions).map(async ([definitionName, subSchema]) => {
            visitedSchema.definitions[definitionName] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/definitions/' + definitionName,
              keepObjectRef,
              reverse,
            });
          })
        );
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
          await Promise.all(
            schema.items.map(async (subSchema, subSchemaIndex) => {
              visitedSchema.items[subSchemaIndex] = await visitJSONSchema(subSchema, visitorFn, {
                visitedSubschemaResultMap,
                path: path + '/items/' + subSchemaIndex,
                keepObjectRef,
                reverse,
              });
            })
          );
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
        await Promise.all(
          schema.oneOf.map(async (subSchema, subSchemaIndex) => {
            visitedSchema.oneOf[subSchemaIndex] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/oneOf/' + subSchemaIndex,
              keepObjectRef,
              reverse,
            });
          })
        );
      }
      if (schema.patternProperties) {
        visitedSchema.patternProperties = keepObjectRef ? visitedSchema.patternProperties : {};
        await Promise.all(
          Object.entries(schema.patternProperties).map(async ([pattern, subSchema]) => {
            visitedSchema.patternProperties[pattern] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/patternProperties/' + pattern,
              keepObjectRef,
              reverse,
            });
          })
        );
      }
      if (schema.properties) {
        visitedSchema.properties = keepObjectRef ? visitedSchema.properties : {};
        await Promise.all(
          Object.entries(schema.properties).map(async ([propertyName, subSchema]) => {
            visitedSchema.properties[propertyName] = await visitJSONSchema(subSchema, visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/properties/' + propertyName,
              keepObjectRef,
              reverse,
            });
          })
        );
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
