import type { JSONSchema, JSONSchemaObject } from './types.js';

export interface JSONSchemaVisitorContext {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, any>;
  path: string;
}

export type JSONSchemaVisitor = (
  subSchema: any,
  context: JSONSchemaVisitorContext,
) => Promise<any> | any;

const identicalFn = <T>(a: T) => a;

const objectFields = [
  'additionalProperties',
  'additionalItems',
  'contains',
  'else',
  'if',
  'items',
  'not',
  'then',
] as const;

const dictFields = [
  'anyOf',
  'allOf',
  'oneOf',
  'definitions',
  'properties',
  'patternProperties',
  'discriminatorMapping',
] as const;

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
  },
): Promise<any> {
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const enterResult: JSONSchemaObject = await enter(schema, {
        visitedSubschemaResultMap,
        path,
      });
      visitedSubschemaResultMap.set(schema, enterResult);
      for (const key of objectFields) {
        if (enterResult[key]) {
          enterResult[key] = await visitJSONSchema(
            enterResult[key],
            { enter, leave },
            {
              visitedSubschemaResultMap,
              path: `${path}/${key}`,
            },
          );
        }
      }
      for (const key of dictFields) {
        if (enterResult[key]) {
          const entries = Object.entries(enterResult[key]);
          for (const [itemKey, itemValue] of entries) {
            (enterResult as any)[key][itemKey] = await visitJSONSchema(
              itemValue,
              { enter, leave },
              { visitedSubschemaResultMap, path: `${path}/${key}/${itemKey}` },
            );
          }
        }
      }

      if (enterResult.components?.schemas) {
        const entries = Object.entries(enterResult.components.schemas);
        for (const [schemaName, subSchema] of entries) {
          enterResult.components.schemas[schemaName] = await visitJSONSchema(
            subSchema,
            { enter, leave },
            { visitedSubschemaResultMap, path: `${path}/components/schemas/${schemaName}` },
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
