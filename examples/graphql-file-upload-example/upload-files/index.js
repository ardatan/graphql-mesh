const startServer = require('./server');

startServer().then(() => {
  console.info(`UploadFiles GraphQL API listening on 3001`);
});
