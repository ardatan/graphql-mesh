let fs;
let path;

try {
  fs = require('react-native-fs');
  path = require('react-native-path');
} catch (e) {
  console.error('react-native-fs and react-native-path are required for react-native');
}

if (path) {
  path.join = (...args) => path.normalize(args.filter(x => !!x).join('/'));
} else {
  path = {
    normalize(value) {
      return value;
    },
    join(...args) {
      return args.filter(x => !!x).join('/');
    },
  };
}

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

const processPolyfill =
  typeof process !== 'undefined'
    ? process
    : {
        env: {
          NODE_ENV: 'production',
        },
        platform: 'linux',
      };

const { inspect } = require('@graphql-tools/utils');

const util = {
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

module.exports = {
  fs,
  path,
  process: processPolyfill,
  util,
};
