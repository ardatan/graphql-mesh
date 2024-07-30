import { DirectiveLocation, GraphQLDirective, GraphQLList, GraphQLString } from 'graphql';

export const MySQLCountDirective = new GraphQLDirective({
  name: 'mysqlCount',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    table: {
      type: GraphQLString,
    },
  },
});

export const MySQLSelectDirective = new GraphQLDirective({
  name: 'mysqlSelect',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    table: {
      type: GraphQLString,
    },
    columnMap: {
      type: new GraphQLList(new GraphQLList(GraphQLString)),
    },
  },
});

export const MySQLInsertDirective = new GraphQLDirective({
  name: 'mysqlInsert',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    table: {
      type: GraphQLString,
    },
    primaryKeys: {
      type: new GraphQLList(GraphQLString),
    },
  },
});

export const MySQLUpdateDirective = new GraphQLDirective({
  name: 'mysqlUpdate',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    table: {
      type: GraphQLString,
    },
    columnMap: {
      type: new GraphQLList(new GraphQLList(GraphQLString)),
    },
  },
});

export const MySQLDeleteDirective = new GraphQLDirective({
  name: 'mysqlDelete',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    table: {
      type: GraphQLString,
    },
  },
});

export const MySQLTableForeignDirective = new GraphQLDirective({
  name: 'mysqlTableForeign',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    columnName: {
      type: GraphQLString,
    },
  },
});

export const TransportDirective = new GraphQLDirective({
  name: 'transport',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    kind: {
      type: GraphQLString,
    },
    location: {
      type: GraphQLString,
    },
  },
  isRepeatable: true,
});
