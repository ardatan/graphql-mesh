import { GraphQLSchema, isNamedType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import { DirectableGraphQLObject, MapperKind, mapSchema } from '@graphql-tools/utils';

function isHidden(directableObj: DirectableGraphQLObject) {
  const directiveExtensions = getDirectiveExtensions(directableObj);
  const hiddenDirectives = directiveExtensions?.hidden;
  return hiddenDirectives?.length;
}

export function filterHiddenPartsInSchema(schema: GraphQLSchema) {
  return mapSchema(schema, {
    [MapperKind.TYPE](type) {
      if (isNamedType(type) && isHidden(type)) {
        return null;
      }
    },
    [MapperKind.FIELD](fieldConfig) {
      if (isHidden(fieldConfig)) {
        return null;
      }
      if ('args' in fieldConfig && fieldConfig.args) {
        for (const argName in fieldConfig.args) {
          if (isHidden(fieldConfig.args[argName])) {
            delete fieldConfig.args[argName];
          }
        }
        return fieldConfig;
      }
    },
  });
}
