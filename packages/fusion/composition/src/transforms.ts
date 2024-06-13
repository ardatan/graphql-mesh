import {
  DocumentNode,
  extendSchema,
  GraphQLSchema,
  GraphQLType,
  parse,
  parseType,
  typeFromAST,
} from 'graphql';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { SubgraphTransform } from './compose.js';

export function createTypeReplaceTransform(
  replacerFn: (typeName: string, fieldName: string, existingType: GraphQLType) => string | void,
): SubgraphTransform {
  return function typeReplaceTransform(schema: GraphQLSchema) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
        const newTypeName = replacerFn(typeName, fieldName, fieldConfig.type);
        if (newTypeName) {
          const newType = typeFromAST(schema, parseType(newTypeName)) as any;
          if (!newType) {
            throw new Error(`No type found for ${newTypeName}`);
          }
          return [fieldName, { ...fieldConfig, type: newType }];
        }
        return undefined;
      },
    });
  };
}

export function createExtendTransform(typeDefs: string | DocumentNode) {
  const typeDefsDoc =
    typeof typeDefs === 'string' ? parse(typeDefs, { noLocation: true }) : typeDefs;
  return function extendTransform(schema: GraphQLSchema) {
    return extendSchema(schema, typeDefsDoc, {
      assumeValid: true,
      assumeValidSDL: true,
    });
  };
}

export * from './transforms/filter-schema.js';
export * from './transforms/naming-convention.js';
export * from './transforms/prefix.js';
export * from './transforms/rename.js';
export * from './transforms/encapsulate.js';
export * from './transforms/prune.js';
export * from './transforms/hoist-field.js';
