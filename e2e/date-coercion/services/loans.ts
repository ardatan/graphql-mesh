import fs from 'fs';
import path from 'path';
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { buildSchema } from 'graphql';
import { Opts } from '@e2e/opts';

const app = express();

const schemaContent = fs.readFileSync(path.join(__dirname, 'api.schema.graphql'), 'utf8');

const root = {
  hello: () => 'Hello world!',
  updatePaymentDate: ({ input }: { input: { id: string; date: string } }) => {
    console.log('Received input:', input);
    console.log('Type of date:', typeof input.date);
    return {
      success: true,
      newDate: input.date,
    };
  },
};

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema(schemaContent),
    rootValue: root,
    graphiql: true,
  }),
);

const port = Opts(process.argv).getServicePort('loans');

app.listen(port, () => {
  console.log('Server running on http://localhost:' + port + '/graphql');
});
