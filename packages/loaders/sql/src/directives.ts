import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Single kind enum for `@sql__` (reads + writes). Mirrors Connectors' one-directive
 * style instead of splitting query/mutation directive names.
 */
export const SqlKindEnum = new GraphQLEnumType({
  name: 'SqlKind',
  values: {
    ROW: { value: 'ROW' },
    ROWS: { value: 'ROWS' },
    CONNECTION: { value: 'CONNECTION' },
    COUNT: { value: 'COUNT' },
    INSERT: { value: 'INSERT' },
    UPDATE: { value: 'UPDATE' },
    DELETE: { value: 'DELETE' },
  },
});

/** @deprecated use SqlKindEnum — kept as alias during rename */
export const SqlQueryKindEnum = SqlKindEnum;
/** @deprecated use SqlKindEnum */
export const SqlMutationKindEnum = SqlKindEnum;

export const SqlDirective = new GraphQLDirective({
  name: 'sql__',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: new GraphQLNonNull(SqlKindEnum) },
    args: { type: GraphQLString },
    selection: { type: GraphQLString },
    entity: { type: GraphQLBoolean },
  },
});

/** @deprecated use SqlDirective */
export const SqlQueryDirective = SqlDirective;
/** @deprecated use SqlDirective */
export const SqlMutationDirective = SqlDirective;

export const SqlRelationDirective = new GraphQLDirective({
  name: 'sql__relation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: SqlKindEnum, defaultValue: 'ROW' },
    args: { type: new GraphQLNonNull(GraphQLString) },
    selection: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export { TransportDirective } from '@graphql-mesh/utils';
