import {
  ASTNode,
  BREAK,
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLSchema,
  GraphQLType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
  OperationDefinitionNode,
  visit,
} from 'graphql';
import slowJsonStringify from 'slow-json-stringify';
import {
  collectFields,
  getDefinedRootType,
  isPromise,
  memoize1,
  memoize2of4,
} from '@graphql-tools/utils';

export function iterateAsync<TInput, TOutput>(
  iterable: Iterable<TInput>,
  callback: (input: TInput) => Promise<TOutput> | TOutput,
  results?: TOutput[],
): Promise<void> | void {
  const iterator = iterable[Symbol.iterator]();
  function iterate(): Promise<void> | void {
    const { done: endOfIterator, value } = iterator.next();
    if (endOfIterator) {
      return;
    }
    const result$ = callback(value);
    if (isPromise(result$)) {
      return result$.then(result => {
        if (result) {
          results?.push(result);
        }
        return iterate();
      });
    }
    if (result$) {
      results?.push(result$);
    }
    return iterate();
  }
  return iterate();
}

export const isStreamOperation = memoize1(function isStreamOperation(astNode: ASTNode): boolean {
  let isStream = false;
  visit(astNode, {
    Field: {
      enter(node): typeof BREAK {
        if (node.directives?.some(d => d.name.value === 'stream')) {
          isStream = true;
          return BREAK;
        }
        return undefined;
      },
    },
  });
  return isStream;
});

const getSjsType = memoize1(function getSjsType(
  type: GraphQLType,
): slowJsonStringify.SjsSchema | slowJsonStringify.AttrExecutable {
  if (isListType(type)) {
    return slowJsonStringify.attr(
      'array',
      slowJsonStringify.sjs(getSjsType(type.ofType) as slowJsonStringify.SjsSchema),
    );
  }
  if (isNonNullType(type)) {
    return getSjsType(type.ofType);
  }
  switch (type.name) {
    case 'String':
      return slowJsonStringify.attr('string');
    case 'Int':
    case 'Float':
      return slowJsonStringify.attr('number');
    case 'Boolean':
      return slowJsonStringify.attr('boolean');
    case 'ID':
      return slowJsonStringify.attr('string');
  }
  if (isEnumType(type)) {
    return slowJsonStringify.attr('string');
  }
  if (isObjectType(type) || isInterfaceType(type)) {
    const schema: slowJsonStringify.SjsSchema = {};
    const fields = type.getFields();
    for (const fieldName in fields) {
      schema[fieldName] = getSjsType(fields[fieldName].type);
    }
    return schema;
  }
  if (isUnionType(type)) {
    const schema: slowJsonStringify.SjsSchema = {};
    const types = type.getTypes();
    for (const type of types) {
      const fields = type.getFields();
      for (const fieldName in fields) {
        schema[fieldName] = getSjsType(fields[fieldName].type);
      }
    }
  }
});

export const getStringifier = memoize2of4(function generateStringifier(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string,
  variableValues: Record<string, any>,
) {
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  let operation: OperationDefinitionNode | undefined;
  for (const definition of document.definitions) {
    if (definition.kind === 'FragmentDefinition') {
      fragments[definition.name.value] = definition;
    }
    if (
      definition.kind === 'OperationDefinition' &&
      (operationName ? definition.name?.value === operationName : !operation)
    ) {
      operation = definition;
    }
  }
  const type = getDefinedRootType(schema, operation.operation);
  const fields = collectFields(schema, fragments, variableValues, type, operation.selectionSet);
  const rootFields = type.getFields();
  const fieldProperties = Object.create(null);
  for (const responseName of Object.keys(fields)) {
    const rootField = rootFields[responseName];
    const fieldType = rootField?.type;
    if (!fieldType) {
      // if field does not exist, it should be ignored for compatibility concerns.
      // Usually, validation would stop it before getting here but this could be an old query
      continue;
    }
    fieldProperties[responseName] = getSjsType(fieldType);
  }
  const sjsSchema: slowJsonStringify.SjsSchema = {
    data: fieldProperties,
    errors: slowJsonStringify.attr(
      'array',
      slowJsonStringify.sjs({
        message: slowJsonStringify.attr('string'),
        path: slowJsonStringify.attr('array'),
        locations: slowJsonStringify.attr(
          'array',
          slowJsonStringify.sjs({
            line: slowJsonStringify.attr('number'),
            column: slowJsonStringify.attr('number'),
          }),
        ),
      }),
    ),
  };
  return slowJsonStringify.sjs(sjsSchema);
});
