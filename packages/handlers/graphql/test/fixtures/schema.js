const { buildSchema } = require('graphql');

module.exports = buildSchema(/* GraphQL */ `
  type Query {
    certificates: [Certificate!]!
  }

  type Certificate {
    id: ID!
    name: String!
  }
`);
