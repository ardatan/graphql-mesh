const path = require('node:path');

/**
 * Keep GraphQL 17 snapshots at the historical path so existing `.snap` files
 * stay valid. GraphQL 16 CI matrix jobs write/read sibling `*.gql16.snap` files
 * (printSchema / default-value diffs).
 */
const { version } = require('graphql');
const major = String(version).split('.')[0];
const suffix = major === '17' ? '' : `.gql${major}`;

module.exports = {
  resolveSnapshotPath(testPath, snapshotExtension) {
    return path.join(
      path.dirname(testPath),
      '__snapshots__',
      path.basename(testPath) + suffix + snapshotExtension,
    );
  },
  resolveTestPath(snapshotFilePath, snapshotExtension) {
    const dir = path.dirname(path.dirname(snapshotFilePath));
    let base = path.basename(snapshotFilePath, snapshotExtension);
    base = base.replace(/\.gql\d+$/, '');
    return path.join(dir, base);
  },
  testPathForConsistencyCheck: path.join(
    'packages',
    'loaders',
    'openapi',
    'tests',
    'calendly.test.ts',
  ),
};
