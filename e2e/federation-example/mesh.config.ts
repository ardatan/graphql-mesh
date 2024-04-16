import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/serve-cli';

const args = Args(process.argv);

export const serveConfig = defineConfig({
  port: args.getPort(),
  supergraph: args.get('supergraph'),
});
