import path from 'path-browserify';
import { inspect } from '@graphql-tools/utils';

export const fs = {
  promises: {},
};

export { path };

const processObj =
  typeof process !== 'undefined'
    ? process
    : {
        get env() {
          try {
            // eslint-disable-next-line no-new-func
            return new Function('return import.meta.env')();
          } catch {
            return {
              NODE_ENV: 'production',
              platform: 'linux',
            };
          }
        },
      };

export { processObj as process };

export const util = {
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
