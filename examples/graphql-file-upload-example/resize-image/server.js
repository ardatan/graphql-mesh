const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const sharp = require('sharp');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      resizeImage(image: String, width: Int, height: Int): String
    }
  `,
  resolvers: {
    Query: {
      resizeImage: async (_, { image, width, height }) => {
        const inputBuffer = Buffer.from(image, 'base64');
        const buffer = await sharp(inputBuffer).resize(width, height).toBuffer();
        const base64 = buffer.toString('base64');
        return base64;
      },
    },
  },
});

module.exports = express()
  .use(require('body-parser')({ limit: '10mb' }))
  .use('/graphql', graphqlHTTP({ schema }));
