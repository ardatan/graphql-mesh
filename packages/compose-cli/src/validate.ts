import { buildSchema, isEnumType } from 'graphql';
import type { GraphQLError } from 'graphql/error';
import { suggestionList } from 'graphql/jsutils/suggestionList.js';
import { createGraphQLError, getDirectiveExtensions, inspect } from '@graphql-tools/utils';
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
  const joinGraphEnum = typeMap.join__Graph;
  if (!isEnumType(joinGraphEnum)) {
    throw new FatalCompositionError(
      `Expected join__Graph to be an enum type, but got ${inspect(joinGraphEnum)}`,
    );
  }
  const subgraphNames = new Set();
  for (const value of joinGraphEnum.getValues()) {
    subgraphNames.add(value.name);
    const directives = getDirectiveExtensions(value, schema);
    if (!directives?.join__graph) {
      throw new FatalCompositionError(
        `Expected join__Graph enum value ${value.name} to have @join__graph directive`,
      );
    }
    for (const directive of directives.join__graph) {
      if (!directive.name) {
        throw new FatalCompositionError(
          `Expected @join__graph directive on join__Graph enum value ${value.name} to have a name argument`,
        );
      }
    }
  }
  const errors: GraphQLError[] = [];
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    if (type) {
      const directives = getDirectiveExtensions(type, schema);
      if (directives?.merge) {
        for (const mergeDirective of directives.merge) {
          const subgraphName = mergeDirective.subgraph;
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
          } else if (!subgraphNames.has(subgraphName)) {
            errors.push(
              createGraphQLError(
                `@merge directive on type ${typeName} references unknown subgraph ${subgraphName}`,
                {
                  nodes: type.astNode,
                },
              ),
            );
            continue;
          }
        }
      }
      if (directives?.resolveTo) {
        for (const resolveToDirective of directives.resolveTo) {
          const subgraphName = resolveToDirective.sourceName;
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
          } else if (!subgraphNames.has(subgraphName)) {
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
            const fieldName = resolveToDirective.sourceFieldName;
            const subgraph = subgraphs.find(s => s.name === subgraphName);
            if (!subgraph) {
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
            const typeDef = subgraph.typeDefs.definitions.find(
              def => 'name' in def && def.name.value === resolveToDirective.sourceTypeName,
            );
            const fields = ('fields' in typeDef && typeDef.fields.map(f => f.name.value)) || [];
            const fieldDef = fields.find(f => f === fieldName);
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
