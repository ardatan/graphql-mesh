const config = require('./jest.config');

let testMatch = ['**/?(*.)+(loadtest).[jt]s?(x)'];
if (process.env.E2E_TEST) {
  testMatch = ['**/e2e/**/?(*.)+(loadtest).[jt]s?(x)'];
} else {
  testMatch.push('!**/e2e/**/?(*.)+(loadtest).[jt]s?(x)');
}

module.exports = {
  ...config,
  testMatch,
};
