const { version } = require('../packages/serve-cli/package.json');
const { readFileSync, writeFileSync } = require('fs-extra');

const { join } = require('path');

const runFilePaths = [
  join(__dirname, '../packages/serve-cli/dist/cjs/run.js'),
  join(__dirname, '../packages/serve-cli/dist/esm/run.js'),
];

for (const runFilePath of runFilePaths) {
  const runFileContent = readFileSync(runFilePath, 'utf-8');
  const newRunFileContent = runFileContent.replace('MESH_VERSION', version);
  writeFileSync(runFilePath, newRunFileContent);
}
