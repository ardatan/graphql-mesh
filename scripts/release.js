const { argv } = require('yargs');
const { sync: glob } = require('globby');
const { writeFileSync } = require('fs');
const { resolve, dirname, join } = require('path');
const semver = require('semver');
const cp = require('child_process');
const rootPackageJson = require('../package.json');

async function release() {

    let version = argv.version || rootPackageJson.version;
    let tag = argv.tag || 'latest';
    if (argv.canary) {
        const gitHash = cp.spawnSync('git', ['rev-parse', '--short', 'HEAD']).stdout.toString().trim();
        version = semver.inc(version, 'prerelease', true, 'alpha-' + gitHash);
        tag = 'canary';
    }
    
    const workspaceGlobs = rootPackageJson.workspaces.map(workspace => workspace + '/package.json');
    
    const packageJsonPaths = glob(workspaceGlobs).map(packageJsonPath => resolve(process.cwd(), packageJsonPath));
    
    const packageNames = packageJsonPaths.map(packageJsonPath => require(packageJsonPath).name);
    
    rootPackageJson.version = version;
    writeFileSync(resolve(__dirname, '../package.json'), JSON.stringify(rootPackageJson, null, 2));
    await Promise.all(packageJsonPaths.map(async packageJsonPath => {
        const packageJson = require(packageJsonPath);
        packageJson.version = version;
        for (const dependency in packageJson.dependencies) {
            if (packageNames.includes(dependency)) {
                packageJson.dependencies[dependency] = version;
            }
        }
        for (const dependency in packageJson.devDependencies) {
            if (packageNames.includes(dependency)) {
                packageJson.devDependencies[dependency] = version;
            }
        }
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        if (!packageJson.private) {
            const distDirName = (packageJson.publishConfig && packageJson.publishConfig.directory) || '';
            const distPath = join(dirname(packageJsonPath), distDirName);

            //Fix package.json in dist directory
            const distPackageJsonPath = join(distPath, 'package.json');
            const distPackageJson = require(distPackageJsonPath);
            distPackageJson.name = packageJson.name;
            distPackageJson.version = packageJson.version;
            distPackageJson.dependencies = packageJson.dependencies;
            distPackageJson.devDependencies = packageJson.devDependencies;
            distPackageJson.publishConfig = {
                access: packageJson.publishConfig.access || 'public'
            }
            writeFileSync(distPackageJsonPath, JSON.stringify(distPackageJson, null, 2));

            console.info(`Releasing ${packageJson.name}@${packageJson.version} as ${tag} tag`)
            const result = cp.spawnSync('npm', ['publish', '--tag', tag, '--access', packageJson.publishConfig.access], {
                cwd: distPath,
            }).stdout.toString().trim();
            console.info(result);
        }
    }))
    
}

release().catch(err => {
    console.error(err);
    process.exit(1);
});
