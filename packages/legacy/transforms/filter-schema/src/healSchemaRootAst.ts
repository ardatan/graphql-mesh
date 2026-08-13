import type { GraphQLSchema, SchemaDefinitionNode, SchemaExtensionNode } from 'graphql';
import { GraphQLSchema as GraphQLSchemaClass } from 'graphql';

/**
 * mapSchema can leave schema.astNode.operationTypes pointing at root types that
 * were removed (e.g. empty Mutation after filterSchema). Heal those AST nodes so
 * later SDL round-trips (mergeSchemas / printSchemaWithDirectives) stay valid.
 */
export function healSchemaRootAst(schema: GraphQLSchema): GraphQLSchema {
  const config = schema.toConfig();
  const presentRootNames = new Set(
    [config.query?.name, config.mutation?.name, config.subscription?.name].filter(
      (name): name is string => Boolean(name),
    ),
  );

  const filterOperationTypes = <T extends SchemaDefinitionNode | SchemaExtensionNode>(
    node: T | null | undefined,
  ): T | undefined => {
    if (!node?.operationTypes) {
      return node ?? undefined;
    }
    const operationTypes = node.operationTypes.filter(op =>
      presentRootNames.has(op.type.name.value),
    );
    if (operationTypes.length === node.operationTypes.length) {
      return node;
    }
    return {
      ...node,
      operationTypes,
    };
  };

  const astNode = filterOperationTypes(config.astNode);
  const extensionASTNodes = (config.extensionASTNodes ?? []).map(
    node => filterOperationTypes(node)!,
  );

  return new GraphQLSchemaClass({
    ...config,
    astNode,
    extensionASTNodes,
  });
}
