const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { createWriteStream, existsSync, mkdirSync } = require('fs');
const { readdir, readFile, unlink } = require('fs/promises');
const { GraphQLUpload, graphqlUploadExpress } = require('graphql-upload');
const { join } = require('path');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const promisifiedPipe = require('./promisifiedPipe');
const mime = require('mime');

const FILES_DIR = join(__dirname, 'files');
if (!existsSync(FILES_DIR)) {
  mkdirSync(FILES_DIR);
}

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    scalar Upload
    type Query {
      files: [File]
    }
    type Mutation {
      uploadFile(upload: Upload!): File!
      deleteFile(filename: String): Boolean
    }
    type File {
      filename: String
      base64: String
    }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Query: {
      files: () => readdir(FILES_DIR).then(files => files.map(filename => ({ filename }))),
    },
    Mutation: {
      uploadFile: async (_, { upload }) => {
        const { filename, createReadStream } = await upload;
        const readStream = createReadStream();
        const writeStream = createWriteStream(join(FILES_DIR, filename));
        await promisifiedPipe(readStream, writeStream);
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
});

module.exports = express().use(
  '/graphql',
  graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
  graphqlHTTP({ schema })
);
