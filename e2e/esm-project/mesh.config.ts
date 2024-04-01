import { GraphQLSchema } from 'graphql';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineServeConfig({
  port: parseInt(process.argv[2]), // test provides the port
  fusiongraph: '',
});

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'test',
        schema$: new GraphQLSchema({}),
      }),
    },
  ],
});
