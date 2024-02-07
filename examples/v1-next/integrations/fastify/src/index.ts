import { app } from './app';
import { upstream } from './upstream';

app
  .listen({
    port: 4000,
  })
  .then(() => {
    console.log(`🚀 Mesh Server ready at http://localhost:4000/graphql`);
  });

upstream
  .listen({
    port: 4001,
  })
  .then(() => {
    console.log(`🚀 Upstream Server ready at http://localhost:4001`);
  });
