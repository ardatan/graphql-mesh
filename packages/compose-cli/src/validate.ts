import { buildSchema, type FieldDefinitionNode } from 'graphql';
import type { GraphQLError } from 'graphql/error';
import { suggestionList } from 'graphql/jsutils/suggestionList.js';
import { createGraphQLError, getDirectiveExtensions } from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';

export class FatalCompositionError extends Error {
  constructor(message: string) {
    super(`Fatal composition error: ${message}`);
    this.name = 'FatalCompositionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function validateSupergraphSdl(supergraphSdl: string, subgraphs: ServiceDefinition[]) {
  const schema = buildSchema(supergraphSdl, {
    assumeValid: true,
    assumeValidSDL: true,
    noLocation: true,
  });
  const typeMap = schema.getTypeMap();
  const errors: GraphQLError[] = [];
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    if (type) {
      const directives = getDirectiveExtensions(type, schema);
      if (directives?.merge) {
        for (const mergeDirective of directives.merge) {
          const subgraphName = mergeDirective.subgraph;
          const subgraph = subgraphs.find(s => s.name === subgraphName);
          if (!subgraphName) {
            errors.push(
              createGraphQLError(
                `Expected @merge directive on type ${typeName} to have a subgraph argument`,
                {
                  nodes: type.astNode,
                },
              ),
            );
            continue;
          } else if (!subgraph) {
            errors.push(
              createGraphQLError(
                `@merge directive on type ${typeName} references unknown subgraph ${subgraphName}`,
                {
                  nodes: type.astNode,
                },
              ),
            );
          }
          continue;
        }
      }
      if (directives?.resolveTo) {
        for (const resolveToDirective of directives.resolveTo) {
          const subgraphName = resolveToDirective.sourceName as string;
          const subgraph = subgraphs.find(s => s.name === subgraphName);
          if (!subgraphName) {
            errors.push(
              createGraphQLError(
                `Expected @resolveTo directive on type ${typeName} to have a sourceName argument`,
                {
                  nodes: type.astNode,
                },
              ),
            );
            continue;
          } else if (!subgraph) {
            errors.push(
              createGraphQLError(
                `@resolveTo directive on type ${typeName} references unknown subgraph ${subgraphName}`,
                {
                  nodes: type.astNode,
                },
              ),
            );
            continue;
          }
          if (resolveToDirective.sourceFieldName && resolveToDirective.sourceTypeName) {
            const typeDef = subgraph.typeDefs.definitions.find(
              def => 'name' in def && def.name.value === resolveToDirective.sourceTypeName,
            );
            if (!typeDef) {
              errors.push(
                createGraphQLError(
                  `@resolveTo directive on type ${typeName} references unknown type ${resolveToDirective.sourceTypeName} in subgraph ${subgraphName}`,
                  {
                    nodes: type.astNode,
                  },
                ),
              );
              continue;
            }
            const fields = ('fields' in typeDef && typeDef.fields) || ([] as FieldDefinitionNode[]);
            const fieldName = resolveToDirective.sourceFieldName as string;
            const fieldDef = fields.find(f => f.name.value === fieldName);
            if (!fieldDef) {
              const suggestions = suggestionList(
                fieldName,
                fields.map(f => f.name.value),
              );
              const suggestionStr = suggestions.length
                ? ` Did you mean "${suggestions.join(' or ')}"?`
                : '';
              errors.push(
                createGraphQLError(
                  `@resolveTo directive on type ${typeName} references unknown field ${fieldName} in subgraph ${subgraphName} ${suggestionStr}`,
                  {
                    nodes: type.astNode,
                  },
                ),
              );
              continue;
            }
            // Args validation
            if (resolveToDirective.sourceArgs) {
              const argOfFields =
                'arguments' in fieldDef && fieldDef.arguments
                  ? fieldDef.arguments.map(arg => arg.name.value)
                  : [];
              for (const argName in resolveToDirective.sourceArgs) {
                const argNameInField = argOfFields.find(arg => arg === argName);
                if (!argNameInField) {
                  const suggestions = suggestionList(argName, argOfFields);
                  const suggestionStr = suggestions.length
                    ? ` Did you mean "${suggestions.join(' or ')}"?`
                    : '';
                  errors.push(
                    createGraphQLError(
                      `@resolveTo directive on type ${typeName} references unknown argument ${argName} in field ${fieldName} of subgraph ${subgraphName} ${suggestionStr}`,
                      {
                        nodes: type.astNode,
                      },
                    ),
                  );
                }
              }
            }
          }
        }
      }
    }
  }
  return errors;
}
