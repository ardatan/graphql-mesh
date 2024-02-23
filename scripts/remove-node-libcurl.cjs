const fs = require('fs');
const path = require('path');

const packageJson = fs.readFileSync(path.join(__dirname, '../packages/legacy/cli/package.json'), 'utf8');
const packageJsonParsed = JSON.parse(packageJson);
delete packageJsonParsed.dependencies['node-libcurl'];
fs.writeFileSync(
  path.join(__dirname, '../packages/legacy/cli/package.json'),
  JSON.stringify(packageJsonParsed, null, 2),
);
