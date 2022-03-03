require('./server')
  .start()
  .then(() => {
    console.info(`UploadFiles GraphQL API listening on 3001`);
  });
