import {
  buildASTSchema,
  Kind,
  visit,
  type DocumentNode,
  type FieldDefinitionNode,
  type ObjectTypeDefinitionNode,
  type ObjectTypeExtensionNode,
} from 'graphql';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import { getArgsFromKeysForFederation, getCacheKeyFnFromKey } from '@graphql-tools/federation';
import { mergeTypeDefs } from '@graphql-tools/merge';

const getKeyForFederation = <T>(root: T) => root;
const SubgraphBaseSDL = /* GraphQL */ `
  scalar _Any
  scalar _FieldSet
  scalar link__Import
  enum link__Purpose {
    SECURITY
    EXECUTION
  }
  type _Service {
    sdl: String!
  }
  type Query {
    _service: _Service!
  }
  directive @external on FIELD_DEFINITION | OBJECT
  directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
  directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
  directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @link(
    url: String!
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA
  directive @shareable repeatable on OBJECT | FIELD_DEFINITION
  directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @tag(
    name: String!
  ) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @override(from: String!) on FIELD_DEFINITION
  directive @composeDirective(name: String!) repeatable on SCHEMA
  directive @extends on OBJECT | INTERFACE
`;

export const SubgraphSDLQuery = /* GraphQL */ `
  query SubgraphSDL {
    _service {
      sdl
    }
  }
`;

export function getSubschemaForFederationWithTypeDefs(typeDefs: DocumentNode): SubschemaConfig {
  const subschemaConfig = {} as SubschemaConfig;
  const typeMergingConfig = (subschemaConfig.merge = subschemaConfig.merge || {});
  const entityTypes: string[] = [];
  const visitor = (node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode) => {
    if (node.directives) {
      const typeName = node.name.value;
      const selections: string[] = [];
      for (const directive of node.directives) {
        const directiveArgs = directive.arguments || [];
        switch (directive.name.value) {
          case 'key': {
            if (
              directiveArgs.some(
                arg =>
                  arg.name.value === 'resolvable' &&
                  arg.value.kind === Kind.BOOLEAN &&
                  arg.value.value === false,
              )
            ) {
              continue;
            }
            const selectionValueNode = directiveArgs.find(
              arg => arg.name.value === 'fields',
            )?.value;
            if (selectionValueNode?.kind === Kind.STRING) {
              selections.push(selectionValueNode.value);
            }
            break;
          }
          case 'inaccessible':
            return null;
        }
      }
      // If it is not an entity, continue
      if (selections.length === 0) {
        return node;
      }
      const typeMergingTypeConfig = (typeMergingConfig[typeName] =
        typeMergingConfig[typeName] || {});
      if (
        node.kind === Kind.OBJECT_TYPE_DEFINITION &&
        !node.directives?.some(d => d.name.value === 'extends')
      ) {
        typeMergingTypeConfig.canonical = true;
      }
      entityTypes.push(typeName);
      const selectionsStr = selections.join(' ');
      typeMergingTypeConfig.selectionSet = `{ ${selectionsStr} }`;
      typeMergingTypeConfig.dataLoaderOptions = {
        cacheKeyFn: getCacheKeyFnFromKey(selectionsStr),
      };
      typeMergingTypeConfig.argsFromKeys = getArgsFromKeysForFederation;
      typeMergingTypeConfig.fieldName = `_entities`;
      typeMergingTypeConfig.key = getKeyForFederation;
      const fields = [];
      if (node.fields) {
        for (const fieldNode of node.fields) {
          let removed = false;
          if (fieldNode.directives) {
            const fieldName = fieldNode.name.value;
            for (const directive of fieldNode.directives) {
              const directiveArgs = directive.arguments || [];
              switch (directive.name.value) {
                case 'requires': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields =
                    typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  if (
                    directiveArgs.some(
                      arg =>
                        arg.name.value === 'resolvable' &&
                        arg.value.kind === Kind.BOOLEAN &&
                        arg.value.value === false,
                    )
                  ) {
                    continue;
                  }
                  const selectionValueNode = directiveArgs.find(
                    arg => arg.name.value === 'fields',
                  )?.value;
                  if (selectionValueNode?.kind === Kind.STRING) {
                    typeMergingFieldsConfig[fieldName].selectionSet =
                      `{ ${selectionValueNode.value} }`;
                    typeMergingFieldsConfig[fieldName].computed = true;
                  }
                  break;
                }
                case 'external':
                case 'inaccessible': {
                  removed = !typeMergingTypeConfig.selectionSet?.includes(` ${fieldName} `);
                  break;
                }
                case 'override': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields =
                    typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  typeMergingFieldsConfig[fieldName].canonical = true;
                  break;
                }
              }
            }
          }
          if (!removed) {
            fields.push(fieldNode);
          }
        }
        (node.fields as FieldDefinitionNode[]) = fields;
      }
    }
    return {
      ...node,
      kind: Kind.OBJECT_TYPE_DEFINITION,
    };
  };
  const parsedSDL = visit(typeDefs, {
    ObjectTypeExtension: visitor,
    ObjectTypeDefinition: visitor,
  });
  let extraSdl = SubgraphBaseSDL;
  if (entityTypes.length > 0) {
    extraSdl += `\nunion _Entity = ${entityTypes.join(' | ')}`;
    extraSdl += `\nextend type Query { _entities(representations: [_Any!]!): [_Entity]! }`;
  }
  subschemaConfig.schema = buildASTSchema(mergeTypeDefs([extraSdl, parsedSDL]), {
    assumeValidSDL: true,
    assumeValid: true,
  });
  return subschemaConfig;
}
