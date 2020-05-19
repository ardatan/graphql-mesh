const { readdirSync, lstatSync, ensureSymlinkSync, chmodSync } = require('fs-extra');
const { resolve, join } = require('path');

const absoluteExamplesDirPath = resolve(__dirname, '../examples');
const absoluteGraphqlMeshBinPath = resolve(__dirname, '../packages/cli/dist/bin.js');
const dir = readdirSync(absoluteExamplesDirPath);
for (const path of dir) {
    const absolutePath = join(absoluteExamplesDirPath, path);
    if (lstatSync(absolutePath).isDirectory()) {
        const targetPath = join(absolutePath, 'node_modules', '.bin', 'graphql-mesh');
        ensureSymlinkSync(absoluteGraphqlMeshBinPath, targetPath);
        chmodSync(targetPath, '755');
    }
}