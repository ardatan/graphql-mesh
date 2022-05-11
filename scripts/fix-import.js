const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const filePath = join(__dirname, '../packages/utils/dist/index.js')
const fileContent = readFileSync(filePath, 'utf-8');
const fileContentReplaced = fileContent.replace(
  `new Promise(function (resolve) { resolve(_interopNamespace(require(path))); })`,
  `new Promise(function (resolve) { resolve(_interopNamespace(require(path))); }).catch(e => {
    if (e.message.includes('Must use import to load ES Module')) {
      return import(path);
    }
    throw e;
  })`
);
writeFileSync(filePath, fileContentReplaced);
