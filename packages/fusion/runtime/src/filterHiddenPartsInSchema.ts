import type { GraphQLSchema } from 'graphql';
import { isNamedType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import type { DirectableGraphQLObject } from '@graphql-tools/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';

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
    [MapperKind.ROOT_OBJECT](type) {
      const fields = Object.values(type.getFields());
      const availableFields = fields.filter(field => !isHidden(field));
      if (!availableFields.length) {
        return null;
      }
    },
    [MapperKind.ROOT_FIELD](fieldConfig) {
      if (isHidden(fieldConfig)) {
        return null;
      }
    },
    [MapperKind.FIELD](fieldConfig) {
      if (isHidden(fieldConfig)) {
        return null;
      }
    },
    [MapperKind.ARGUMENT](argConfig) {
      if (isHidden(argConfig)) {
        return null;
      }
    },
  });
}
