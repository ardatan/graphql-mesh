import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import sharp from 'sharp';

export function startServer() {
  const yoga = createYoga({
    schema: createSchema({
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
    }),
    maskedErrors: false,
    logging: false,
  });
  const server = createServer(yoga);
  return new Promise(resolve => {
    server.listen(3002, () => {
      resolve(
        () =>
          new Promise(resolve => {
            server.close(resolve);
          }),
      );
    });
  });
}
