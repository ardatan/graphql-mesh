import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isEnumType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  Kind,
  OperationDefinitionNode,
} from 'graphql';
import { getFieldDef } from 'graphql/execution/execute';
import SJS from 'slow-json-stringify';
import { ExecutionArgs } from '@envelop/core';
import { MeshPlugin } from '@graphql-mesh/types';
import {
  collectFields,
  collectSubFields,
  getDefinedRootType,
  memoize1,
  memoize2of4,
} from '@graphql-tools/utils';

export const getOperationsAndFragments = memoize1(function getOperationsAndFragments(
  document: DocumentNode,
): {
  operations: Record<string, OperationDefinitionNode>;
  fragments: Record<string, FragmentDefinitionNode>;
} {
  const operations: Record<string, OperationDefinitionNode> = {};
  const fragments: Record<string, FragmentDefinitionNode> = {};
  let anonymousCnt = 0;
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      const operationName = definition.name?.value || `Anonymous_${anonymousCnt++}`;
      operations[operationName] = definition;
    }
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      const fragmentName = definition.name.value;
      fragments[fragmentName] = definition;
    }
  }
  return {
    operations,
    fragments,
  };
});

export function useSJS(): MeshPlugin<any> {
  return {
    onExecute() {
      return {
        onExecuteDone({ args, result }: { args: ExecutionArgs; result: any }) {
          const { operations, fragments } = getOperationsAndFragments(args.document);
          const operation = args.operationName
            ? operations[args.operationName]
            : operations[Object.keys(operations)[0]];
          result.stringify = getOperationSerializer(
            args.schema,
            operation,
            fragments,
            args.variableValues,
          );
        },
      };
    },
  };
}

export const getOperationSerializer = memoize2of4(function getOperationSerializer(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: any,
) {
  const rootType = getDefinedRootType(schema, operation.operation);
  const rootFieldProperties = Object.create(null);
  const { fields } = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet,
  );
  for (const [responseName, rootFieldNodes] of fields) {
    for (const rootFieldNode of rootFieldNodes) {
      const rootField = getFieldDef(schema, rootType, rootFieldNode);
      const rootFieldType = rootField.type;
      rootFieldProperties[responseName] = getFieldPropertySchema(
        schema,
        fragments,
        variableValues,
        rootFieldType,
        rootFieldNodes,
      );
    }
  }
  return SJS.sjs({
    data: rootFieldProperties,
    errors: SJS.attr(
      'array',
      SJS.sjs({
        message: SJS.attr('string'),
        path: SJS.attr('array'),
        locations: SJS.attr(
          'array',
          SJS.sjs({
            line: SJS.attr('number'),
            column: SJS.attr('number'),
          }),
        ),
      }),
    ),
  });
});

function getFieldPropertySchema(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: any,
  fieldType: GraphQLOutputType,
  fieldNodes: FieldNode[],
): any {
  if (isNonNullType(fieldType)) {
    return getFieldPropertySchema(schema, fragments, variableValues, fieldType.ofType, fieldNodes);
  }
  if (isListType(fieldType)) {
    return SJS.attr(
      'array',
      SJS.sjs(
        getFieldPropertySchema(schema, fragments, variableValues, fieldType.ofType, fieldNodes),
      ),
    );
  }
  if (isAbstractType(fieldType)) {
    const fieldProperties = Object.create(null);
    for (const possibleFieldType of schema.getPossibleTypes(fieldType)) {
      const { fields: subFields } = collectSubFields(
        schema,
        fragments,
        variableValues,
        possibleFieldType,
        fieldNodes,
      );
      for (const [subResponseName, subSubFields] of subFields) {
        for (const subSubField of subSubFields) {
          const subSubFieldDef = getFieldDef(schema, possibleFieldType, subSubField);
          const subFieldType = subSubFieldDef.type;
          fieldProperties[subResponseName] = getFieldPropertySchema(
            schema,
            fragments,
            variableValues,
            subFieldType,
            subSubFields,
          );
        }
      }
    }
    return fieldProperties;
  }
  if (isObjectType(fieldType)) {
    const fieldProperties = Object.create(null);
    const { fields: subFields } = collectSubFields(
      schema,
      fragments,
      variableValues,
      fieldType,
      fieldNodes,
    );
    for (const [subResponseName, subSubFields] of subFields) {
      const subFieldType = getFieldDef(schema, fieldType, subSubFields[0]).type;
      fieldProperties[subResponseName] = getFieldPropertySchema(
        schema,
        fragments,
        variableValues,
        subFieldType,
        subSubFields,
      );
    }
    return fieldProperties;
  }
  if (isEnumType(fieldType)) {
    return SJS.attr('string');
  }
  if (isScalarType(fieldType)) {
    switch (fieldType.name) {
      case 'Int':
      case 'Float':
        return SJS.attr('number');
      case 'Boolean':
        return SJS.attr('boolean');
      default:
        return SJS.attr('string');
    }
  }
}
