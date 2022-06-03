module.exports.promisify = function promisify(oldSchoolFn, thisContext) {
  return function promisifiedFn(...args) {
    return new Promise(function executor(resolve, reject) {
      oldSchoolFn.call(thisContext, ...args, function cb(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
};
