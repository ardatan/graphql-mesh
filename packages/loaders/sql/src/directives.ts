import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

export const SqlQueryKindEnum = new GraphQLEnumType({
  name: 'SqlQueryKind',
  values: {
    ROW: { value: 'ROW' },
    ROWS: { value: 'ROWS' },
    CONNECTION: { value: 'CONNECTION' },
    COUNT: { value: 'COUNT' },
  },
});

export const SqlMutationKindEnum = new GraphQLEnumType({
  name: 'SqlMutationKind',
  values: {
    INSERT: { value: 'INSERT' },
    UPDATE: { value: 'UPDATE' },
    DELETE: { value: 'DELETE' },
  },
});

export const SqlQueryDirective = new GraphQLDirective({
  name: 'sql__query',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: SqlQueryKindEnum, defaultValue: 'ROWS' },
    args: { type: GraphQLString },
    selection: { type: new GraphQLNonNull(GraphQLString) },
    entity: { type: GraphQLBoolean },
  },
});

export const SqlMutationDirective = new GraphQLDirective({
  name: 'sql__mutation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: new GraphQLNonNull(SqlMutationKindEnum) },
    args: { type: new GraphQLNonNull(GraphQLString) },
    selection: { type: GraphQLString },
  },
});

export const SqlRelationDirective = new GraphQLDirective({
  name: 'sql__relation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: SqlQueryKindEnum, defaultValue: 'ROW' },
    args: { type: new GraphQLNonNull(GraphQLString) },
    selection: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export { TransportDirective } from '@graphql-mesh/utils';
