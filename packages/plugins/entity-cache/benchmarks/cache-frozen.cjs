// #9658: legacy is frozen, candidate comes from this built upstream package.
module.exports = {
  ...require('./.build/benchmarks/legacy-cache.js'),
  ...require('../dist/cjs/index.js'),
  ...require('../dist/cjs/redis-store.js'),
  ...require('./.build/benchmarks/catalog-policy.js'),
};
