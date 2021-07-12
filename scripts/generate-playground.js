const { join } = require('path');
const { readFileSync, writeFileSync } = require('fs');

const builtPlaygroundJsPath = join(__dirname, '../packages/playground/dist/main.js');
const builtPlaygroundContent = readFileSync(builtPlaygroundJsPath, 'utf8');
const destinationFileContent = `
/* eslint-disable */
// @ts-ignore
export const playgroundContent = ${JSON.stringify(builtPlaygroundContent)};
`;
const destinationPlaygroundTsPath = join(__dirname, '../packages/cli/src/commands/serve/playground-content.js');
writeFileSync(destinationPlaygroundTsPath, destinationFileContent);
