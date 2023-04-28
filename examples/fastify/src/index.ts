import { app } from './app';

app
  .listen({
    port: 4000,
  })
  .then(() => {
    console.log(`🚀 Server ready at http://localhost:4000/graphql`);
  });
