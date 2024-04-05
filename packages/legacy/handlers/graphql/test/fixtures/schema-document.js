const { parse } = require('graphql');

module.exports = parse(/* GraphQL */ `
  type Query {
    certificates: [Certificate!]!
  }

  type Certificate {
    id: ID!
    name: String!
  }
`);
