import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// pins graphql to the given version through the root resolutions so that the
// whole repo can be tested against another graphql version (like v16 in ci)
const version = process.argv[2];
if (!version) {
  throw new Error('Usage: node scripts/match-graphql.mjs <version>');
}

const packageJsonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'package.json',
);
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

if (packageJson.resolutions.graphql === version) {
  console.log(`graphql@${version} is already used`);
} else {
  packageJson.resolutions.graphql = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Using graphql@${version}, run "yarn install" to apply`);
}
