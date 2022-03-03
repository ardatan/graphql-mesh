const { createServer } = require('@graphql-yoga/node');
const sharp = require('sharp');

module.exports = createServer({
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
  maskedErrors: false,
  logging: false,
  port: 3002,
});
