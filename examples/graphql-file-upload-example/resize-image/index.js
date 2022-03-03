require('./server')
  .start()
  .then(() => {
    console.info(`ResizeImage GraphQL API listening on 3002`);
  });
