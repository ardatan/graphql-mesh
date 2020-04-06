import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType } from 'graphql';

import { inputTypeDefinitionCache, outputTypeDefinitionCache } from './types';
import { IField, IType } from 'protobufjs';

interface FieldWithComment extends IField {
  comment?: string | null | undefined;
}

interface TypeWithComment extends IType {
  fields: { [k: string]: FieldWithComment };
  comment?: string | null | undefined;
}

interface ProtoDefinitionInput {
  definition: TypeWithComment;
  typeName: string;
}

export function getGraphqlTypeFromProtoDefinition(
  { definition, typeName }: ProtoDefinitionInput,
  isInput: boolean
): GraphQLInputObjectType | GraphQLObjectType {
  const { fields, comment } = definition;
  const typeDefinitionCache = isInput ? inputTypeDefinitionCache : outputTypeDefinitionCache;

  // TODO: need to set up for either input type or object type
  const fieldsFunction = () =>
    Object.keys(fields).reduce<any>((result, fieldName) => {
      const { rule, type, comment } = fields[fieldName];

      const gqlType = typeDefinitionCache[type];

      // eslint-disable-next-line no-param-reassign
      result[fieldName] = {
        type: rule === 'repeated' ? GraphQLList(gqlType) : gqlType,
        description: comment,
      };

      return result;
    }, {});

  const graphqlTypeName = isInput ? typeName + 'Input' : typeName;

  const typeDef = {
    name: graphqlTypeName,
    fields: fieldsFunction,
    description: comment,
  };

  // CONVENTION - types that end with `Input` are GraphQL input types
  const type = isInput ? new GraphQLInputObjectType(typeDef) : new GraphQLObjectType(typeDef);

  typeDefinitionCache[typeName] = type;
  return type;
}
