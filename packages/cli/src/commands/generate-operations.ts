import type { YamlConfig } from '@graphql-mesh/types';
import { buildOperationNodeForField, getRootTypeMap, parseGraphQLSDL, Source } from '@graphql-tools/utils';
import { GraphQLSchema, print } from 'graphql';

export function generateOperations(schema: GraphQLSchema, options: YamlConfig.GenerateOperationsConfig): Source[] {
  const sources: Source[] = [];
  const rootTypeMap = getRootTypeMap(schema);
  for (const [operationType, rootType] of rootTypeMap) {
    const fieldMap = rootType.getFields();
    for (const fieldName in fieldMap) {
      const operationNode = buildOperationNodeForField({
        schema,
        kind: operationType,
        field: fieldName,
        depthLimit: options.selectionSetDepth,
      });
      const defaultName = `operation_${sources.length}`;
      const virtualFileName = operationNode.name?.value || defaultName;
      const rawSDL = print(operationNode);
      const source = parseGraphQLSDL(`${virtualFileName}.graphql`, rawSDL);
      sources.push(source);
    }
  }
  return sources;
}
