module.exports.fs = require('react-native-fs');
module.exports.path = require('react-native-path');
module.exports.path.join = (...args) => module.exports.path.normalize(args.filter(x => !!x).join('/'));

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
          }))
      )
    ));
