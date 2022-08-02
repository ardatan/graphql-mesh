import { JSONSchemaObject, JSONSchema } from './types';

export interface JSONSchemaVisitorContext {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, any>;
  path: string;
}

export type JSONSchemaVisitor = (subSchema: any, context: JSONSchemaVisitorContext) => Promise<any> | any;

const identicalFn = <T>(a: T) => a;

export async function visitJSONSchema(
  schema: JSONSchema,
  {
    enter = identicalFn,
    leave = identicalFn,
  }: {
    enter?: JSONSchemaVisitor;
    leave?: JSONSchemaVisitor;
  },
  { visitedSubschemaResultMap, path }: JSONSchemaVisitorContext = {
    visitedSubschemaResultMap: new WeakMap(),
    path: '',
  }
): Promise<any> {
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const enterResult: JSONSchemaObject = await enter(schema, {
        visitedSubschemaResultMap,
        path,
      });
      visitedSubschemaResultMap.set(schema, enterResult);
      if (enterResult.additionalItems) {
        enterResult.additionalItems = await visitJSONSchema(
          enterResult.additionalItems,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/additionalItems',
          }
        );
      }
      if (enterResult.additionalProperties) {
        enterResult.additionalProperties = await visitJSONSchema(
          enterResult.additionalProperties,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/additionalProperties',
          }
        );
      }
      if (enterResult.allOf) {
        for (const subSchemaIndex in enterResult.allOf) {
          enterResult.allOf[subSchemaIndex] = await visitJSONSchema(
            enterResult.allOf[subSchemaIndex],
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/allOf/' + subSchemaIndex,
            }
          );
        }
      }
      if (enterResult.anyOf) {
        for (const subSchemaIndex in enterResult.anyOf) {
          enterResult.anyOf[subSchemaIndex] = await visitJSONSchema(
            enterResult.anyOf[subSchemaIndex],
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/anyOf/' + subSchemaIndex,
            }
          );
        }
      }
      if (enterResult.contains) {
        enterResult.contains = await visitJSONSchema(
          enterResult.contains,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/contains',
          }
        );
      }
      if (enterResult.definitions) {
        const entries = Object.entries(enterResult.definitions);
        for (const [definitionName, subSchema] of entries) {
          enterResult.definitions[definitionName] = await visitJSONSchema(
            subSchema,
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/definitions/' + definitionName,
            }
          );
        }
      }
      if (enterResult.else) {
        enterResult.else = await visitJSONSchema(
          enterResult.else,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/else',
          }
        );
      }
      if (enterResult.if) {
        enterResult.if = await visitJSONSchema(
          enterResult.if,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/if',
          }
        );
      }
      if (enterResult.items) {
        enterResult.items = await visitJSONSchema(
          enterResult.items,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/items',
          }
        );
      }
      if (enterResult.not) {
        enterResult.not = await visitJSONSchema(
          enterResult.not,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/not',
          }
        );
      }
      if (enterResult.oneOf) {
        for (const subSchemaIndex in enterResult.oneOf) {
          enterResult.oneOf[subSchemaIndex] = await visitJSONSchema(
            enterResult.oneOf[subSchemaIndex],
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/oneOf/' + subSchemaIndex,
            }
          );
        }
      }
      if (enterResult.patternProperties) {
        const entries = Object.entries(enterResult.patternProperties);
        for (const [pattern, subSchema] of entries) {
          enterResult.patternProperties[pattern] = await visitJSONSchema(
            subSchema,
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/patternProperties/' + pattern,
            }
          );
        }
      }
      if (enterResult.properties) {
        const entries = Object.entries(enterResult.properties);
        for (const [propertyName, subSchema] of entries) {
          enterResult.properties[propertyName] = await visitJSONSchema(
            subSchema,
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/properties/' + propertyName,
            }
          );
        }
      }
      if (enterResult.then) {
        enterResult.then = await visitJSONSchema(
          enterResult.then,
          { enter, leave },
          {
            visitedSubschemaResultMap,
            path: path + '/then',
          }
        );
      }

      if (enterResult.components?.schema) {
        const entries = Object.entries(enterResult.components.schemas);
        for (const [schemaName, subSchema] of entries) {
          enterResult.components.schemas[schemaName] = await visitJSONSchema(
            subSchema,
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: path + '/components/schemas/' + schemaName,
            }
          );
        }
      }

      const leaveResult = await leave(enterResult, {
        visitedSubschemaResultMap,
        path,
      });

      visitedSubschemaResultMap.set(schema, leaveResult);
      return leaveResult;
    }
    return visitedSubschemaResultMap.get(schema);
  }
  const enterResult = await enter(schema, {
    visitedSubschemaResultMap,
    path,
  });
  return leave(enterResult, {
    visitedSubschemaResultMap,
    path,
  });
}
