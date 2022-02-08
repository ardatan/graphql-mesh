const { unlinkSync } = require('fs');
const { readdirSync, lstatSync, ensureSymlinkSync, chmodSync, writeFileSync } = require('fs-extra');
const { resolve, join } = require('path');

const absoluteExamplesDirPath = resolve(__dirname, '../examples');
const absoluteGraphqlMeshBinPath = resolve(__dirname, '../packages/cli/dist/bin.mjs');
const dir = readdirSync(absoluteExamplesDirPath);
for (const path of dir) {
    const absolutePath = join(absoluteExamplesDirPath, path);
    if (lstatSync(absolutePath).isDirectory()) {
        const execNames = ['mesh', 'gql-mesh', 'graphql-mesh'];
        for (const execName of execNames) {
            const targetPath = join(absolutePath, 'node_modules', '.bin', execName);
            unlinkSync(targetPath);
            ensureSymlinkSync(absoluteGraphqlMeshBinPath, targetPath);
            chmodSync(targetPath, '755');
            const targetCmdPath = targetPath + '.cmd';
            writeFileSync(
              targetCmdPath,
              `
@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "${absoluteGraphqlMeshBinPath}" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "${absoluteGraphqlMeshBinPath}" %*
)
            `
            );
            chmodSync(targetCmdPath, '755');
        }
    }
}
