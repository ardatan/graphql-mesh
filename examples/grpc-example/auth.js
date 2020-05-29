const { credentials } = require('@grpc/grpc-js');
const { readFileSync } = require('fs');

module.exports = function () {
  const rootCA = readFileSync('./certs/ca.crt');
  const certChain = readFileSync('./certs/server.crt');
  const privateKey = readFileSync('./certs/server.key');

  return credentials.createSsl(rootCA, privateKey, certChain);
};
