const { createServer } = require('@graphql-yoga/node');
const { existsSync, mkdirSync } = require('fs');
const {
  promises: { readdir, readFile, writeFile, unlink },
} = require('fs');
const { join } = require('path');

const FILES_DIR = join(__dirname, 'files');
if (!existsSync(FILES_DIR)) {
  mkdirSync(FILES_DIR);
}

module.exports = createServer({
  schema: {
    typeDefs: /* GraphQL */ `
      scalar File
      type Query {
        files: [FileResult]
      }
      type Mutation {
        uploadFile(upload: File!): FileResult!
        deleteFile(filename: String): Boolean
      }
      type FileResult {
        filename: String
        base64: String
      }
    `,
    resolvers: {
      Query: {
        files: () => readdir(FILES_DIR).then(files => files.map(filename => ({ filename }))),
      },
      Mutation: {
        uploadFile: async (_, { upload }) => {
          const filename = upload.name;
          const arrayBuffer = await upload.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          try {
            await writeFile(join(FILES_DIR, filename), buffer);
          } catch (e) {
            console.error(`Error writing ${filename}`, e);
          }
          return { filename };
        },
        deleteFile: async (_, { filename }) => {
          await unlink(join(FILES_DIR, filename));
          return true;
        },
      },
      File: {
        base64: ({ filename }) => readFile(join(FILES_DIR, filename), 'base64'),
      },
    },
  },
  hostname: 'localhost',
  port: 3001,
  maskedErrors: false,
  logging: false,
});
