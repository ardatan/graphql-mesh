const {
  normalizePrintedSchema,
  looksLikePrintedSchema,
} = require('./packages/testing/normalizePrintedSchema.cjs');

/**
 * Jest snapshot serializer: store a GraphQL-version-stable form of printed SDL
 * so the dual GraphQL 16/17 CI matrix can share one snap file.
 */
module.exports = {
  test(val) {
    return looksLikePrintedSchema(val);
  },
  serialize(val) {
    return normalizePrintedSchema(val);
  },
};
