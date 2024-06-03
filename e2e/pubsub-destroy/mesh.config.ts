import { createServer } from 'http';
import { defineConfig } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';

const pubsub = new PubSub();

// start a server that doesnt close until the pubsub is destroyed
// if the pubsub doesnt get destroyed, the process will hang and not die
const server = createServer();
server.listen();
pubsub.subscribe('destroy', () => server.close());

export const serveConfig = defineConfig({
  pubsub,
});
