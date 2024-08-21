import type {
  ConstObjectValueNode,
  ConstValueNode,
  DocumentNode,
  FieldDefinitionNode,
} from 'graphql';
import { Kind, visit } from 'graphql';
import type { resolveAdditionalResolvers } from './resolve-additional-resolvers.js';

function parseObject(ast: ConstObjectValueNode): any {
  const value = Object.create(null);
  ast.fields.forEach(field => {
    // eslint-disable-next-line no-use-before-define
    value[field.name.value] = parseLiteral(field.value);
  });

  return value;
}

function parseLiteral(ast: ConstValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map(n => parseLiteral(n));
    case Kind.NULL:
      return null;
  }
}

export function getAdditionalResolversFromTypeDefs(additionalTypeDefs: DocumentNode[]) {
  const additionalResolversFromTypeDefs: Parameters<typeof resolveAdditionalResolvers>[1] = [];
  function handleFieldNode(targetTypeName: string, fieldNode: FieldDefinitionNode) {
    if (fieldNode.directives?.length) {
      const resolveToDef = fieldNode.directives.find(d => d.name.value === 'resolveTo');
      if (resolveToDef != null) {
        const resolveToArgumentMap: any = {};
        for (const resolveToArg of resolveToDef.arguments) {
          const resolveToArgName = resolveToArg.name.value;
          resolveToArgumentMap[resolveToArgName] = parseLiteral(resolveToArg.value);
        }
        additionalResolversFromTypeDefs.push({
          targetTypeName,
          targetFieldName: fieldNode.name.value,
          ...resolveToArgumentMap,
        });
      }
    }
  }
  additionalTypeDefs?.forEach(typeDefs => {
    visit(typeDefs, {
      ObjectTypeDefinition(objectNode) {
        objectNode.fields?.forEach(fieldNode => handleFieldNode(objectNode.name.value, fieldNode));
      },
      ObjectTypeExtension(objectNode) {
        objectNode.fields?.forEach(fieldNode => handleFieldNode(objectNode.name.value, fieldNode));
      },
      InterfaceTypeDefinition(interfaceNode) {
        interfaceNode.fields?.forEach(fieldNode =>
          handleFieldNode(interfaceNode.name.value, fieldNode),
        );
      },
      InterfaceTypeExtension(interfaceNode) {
        interfaceNode.fields?.forEach(fieldNode =>
          handleFieldNode(interfaceNode.name.value, fieldNode),
        );
      },
    });
  });
  return additionalResolversFromTypeDefs;
}
