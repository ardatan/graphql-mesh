const config = require('./jest.config');

let testMatch = ['**/?(*.)+(bench).[jt]s?(x)'];
if (process.env.E2E_TEST) {
  testMatch = ['**/e2e/**/?(*.)+(bench).[jt]s?(x)'];
} else {
  testMatch.push('!**/e2e/**/?(*.)+(bench).[jt]s?(x)');
}

module.exports = {
  ...config,
  testMatch,
};
