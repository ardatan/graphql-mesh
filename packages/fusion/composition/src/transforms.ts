import type { DocumentNode, GraphQLOutputType, GraphQLSchema, GraphQLType } from 'graphql';
import { extendSchema, isOutputType, parse, parseType, typeFromAST } from 'graphql';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import type { SubgraphTransform } from './compose.js';
import { TransformValidationError } from './transforms/utils.js';

export function createTypeReplaceTransform(
  replacerFn: (
    typeName: string,
    fieldName: string,
    existingType: GraphQLType,
  ) => string | GraphQLOutputType | void,
): SubgraphTransform {
  return function typeReplaceTransform(schema: GraphQLSchema) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
        const newTypeName = replacerFn(typeName, fieldName, fieldConfig.type);
        if (typeof newTypeName === 'string' && newTypeName !== fieldConfig.type.toString()) {
          const newType = typeFromAST(schema, parseType(newTypeName)) as any;
          if (!newType) {
            throw new TransformValidationError(
              `No type found for ${newTypeName} in the schema, use a type instance instead such as GraphQLString from 'graphql'`,
            );
          }
          return [fieldName, { ...fieldConfig, type: newType }];
        }
        if (isOutputType(newTypeName)) {
          return [fieldName, { ...fieldConfig, type: newTypeName }];
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
export * from './transforms/federation.js';
