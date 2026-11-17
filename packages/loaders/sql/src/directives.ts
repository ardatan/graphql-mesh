import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Single kind enum for `@sql` (reads, writes, and relation fields via `$this`).
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

/** @deprecated use SqlKindEnum */
export const SqlQueryKindEnum = SqlKindEnum;
/** @deprecated use SqlKindEnum */
export const SqlMutationKindEnum = SqlKindEnum;

export const SqlDirective = new GraphQLDirective({
  name: 'sql',
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
/** @deprecated relations also use `@sql` */
export const SqlRelationDirective = SqlDirective;

export { TransportDirective } from '@graphql-mesh/utils';
