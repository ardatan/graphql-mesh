module.exports.fs = require('react-native-fs');
module.exports.path = require('react-native-path');
module.exports.path.join = (...args) =>
  module.exports.path.normalize(args.filter(x => !!x).join('/'));

Promise.allSettled =
  Promise.allSettled ||
  (promises =>
    Promise.all(
      promises.map(p =>
        p
          .then(value => ({
            status: 'fulfilled',
            value,
          }))
          .catch(reason => ({
            status: 'rejected',
            reason,
          })),
      ),
    ));

module.exports.process =
  typeof process !== 'undefined'
    ? process
    : {
        env: {
          NODE_ENV: 'production',
        },
        platform: 'linux',
      };

const { inspect } = require('@graphql-tools/utils');

module.exports.util = {
  promisify(oldSchoolFn) {
    return function promisifiedFn(...args) {
      return new Promise(function executor(resolve, reject) {
        oldSchoolFn(...args, function cb(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };
  },
  inspect,
};
