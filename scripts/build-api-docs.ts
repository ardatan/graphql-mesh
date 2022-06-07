import fs, { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import * as TypeDoc from 'typedoc';
import globby from 'globby';
import chalk from 'chalk';
import workspacePackageJson from '../package.json';

const MONOREPO = workspacePackageJson.name.replace('-monorepo', '');
const CWD = process.cwd();
// Where to generate the API docs
const OUTPUT_PATH = path.join(CWD, 'website/docs/api');
const SIDEBAR_PATH = path.join(CWD, 'website/api-sidebar.json');

async function buildApiDocs(): Promise<void> {
  // An array of tuples where the first element is the package's name and the
  // the second element is the relative path to the package's entry point
  const packageJsonFiles = globby.sync(workspacePackageJson.workspaces.packages.map(f => `${f}/package.json`));
  const modules = [];

  for (const packageJsonPath of packageJsonFiles) {
    const packageJsonContent = require(path.join(CWD, packageJsonPath));
    // Do not include private and large npm package that contains rest
    if (
      !packageJsonPath.includes('./website/') &&
      !packageJsonContent.private &&
      packageJsonContent.name !== MONOREPO &&
      !packageJsonContent.name.endsWith('/container') &&
      !packageJsonContent.name.endsWith('/cross-helpers')
    ) {
      modules.push([
        packageJsonContent.name,
        packageJsonPath.replace('./', '').replace('package.json', 'src/index.ts'),
      ]);
    }
  }

  // Delete existing docs directory
  await fsPromises.rm(OUTPUT_PATH, { recursive: true }).catch(() => null);

  // Initialize TypeDoc
  const typeDoc = new TypeDoc.Application();

  typeDoc.options.addReader(new TypeDoc.TSConfigReader());

  typeDoc.bootstrap({
    excludePrivate: true,
    excludeProtected: true,
    readme: 'none',
    hideGenerator: true,
    gitRevision: 'master',
    tsconfig: path.join(CWD, 'tsconfig.build.json'),
    entryPoints: modules.map(([_name, filePath]) => filePath),
    // @ts-ignore -- typedoc-plugin-markdown option
    hideBreadcrumbs: true,
  });

  // Generate the API docs
  const project = typeDoc.convert();
  await typeDoc.generateDocs(project, OUTPUT_PATH);

  async function patchMarkdownFile(filePath: string): Promise<void> {
    const contents = await fsPromises.readFile(filePath, 'utf-8');
    const contentsTrimmed = contents
      // Escape `<` because MDX2 parse him as JSX tags
      .replace(/</g, '\\<')
      // Escape `>` is unnecessary
      .replace(/\\>/g, '>')
      // Escape `{` because MDX2 parse him as expressions
      // (\\)? is need because some `{` already escaped
      .replace(/(\\)?{/g, '\\{')
      // Fix title
      .replace(/^# .+/g, match => {
        const title = match
          .replace('# ', '')
          .replace(/(Class|Interface|Enumeration): /, '')
          .replace(/(\\)?<.+/, '');
        return ['---', `title: '${title}'`, '---', '', match].join('\n');
      })
      // Fix links
      .replace(/\.md/g, '')
      .replace(/\[([^\]]+)]\((\.\.\/(classes|interfaces|enums)\/([^)]+))\)/g, '[$1](/docs/api/$3/$4)');

    await fsPromises.writeFile(filePath, contentsTrimmed);
    console.log('✅ ', chalk.green(path.relative(CWD, filePath)));
  }

  async function visitMarkdownFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.warn(`${filePath} doesn't exist! Ignoring.`);
      return;
    }
    const lsStat = await fsPromises.lstat(filePath);
    if (lsStat.isFile()) {
      await patchMarkdownFile(filePath);
    } else {
      const filesInDirectory = await fsPromises.readdir(filePath);
      await Promise.all(filesInDirectory.map(fileName => visitMarkdownFile(path.join(filePath, fileName))));
    }
  }

  // Patch the generated markdown
  // See https://github.com/tgreyuk/typedoc-plugin-markdown/pull/128
  await Promise.all(
    ['classes', 'enums', 'interfaces', 'modules'].map(async dirName => {
      const subDirName = path.join(OUTPUT_PATH, dirName);
      await visitMarkdownFile(subDirName);
    })
  );

  // Remove the generated "README.md" file
  await fsPromises.unlink(path.join(OUTPUT_PATH, 'README.md'));

  // Update each module 's frontmatter and title
  await Promise.all(
    modules.map(async ([name, originalFilePath]) => {
      const filePath = path.join(OUTPUT_PATH, 'modules', convertEntryFilePath(originalFilePath));

      const isExists = await fsPromises
        .stat(filePath)
        .then(() => true)
        .catch(() => false);

      if (!isExists) {
        console.warn(`Module ${name} not found!`);
        return;
      }

      const id = convertNameToId(name);
      const oldContent = await fsPromises.readFile(filePath, 'utf-8');
      const necessaryPart = oldContent.split('\n').slice(5).join('\n');
      const finalContent = `---
id: "${id}"
title: "${name}"
sidebar_label: "${id}"
---
${necessaryPart}`;

      await fsPromises.writeFile(filePath, finalContent);
    })
  );

  await fsPromises.writeFile(
    SIDEBAR_PATH,
    JSON.stringify(
      {
        $name: 'API Reference',
        _: Object.fromEntries(
          ['modules', 'classes', 'interfaces', 'enums'].map(key => [
            key,
            {
              $name: key[0].toUpperCase() + key.slice(1),
              $routes: getSidebarItemsByDirectory(key),
            },
          ])
        ),
      },
      null,
      2
    )
  );

  function convertEntryFilePath(filePath: string): string {
    const { dir, name } = path.parse(filePath);
    return `_${dir.replace(/[-/]/g, '_')}_${name}_.md`.replace(/_index_|_packages_/g, '');
  }

  function convertNameToId(name: string): string {
    return name.replace(`@${MONOREPO}/`, '').replace('/', '_');
  }

  function getSidebarItemsByDirectory(dirName: string): string[] {
    const dirPath = path.join(OUTPUT_PATH, dirName);

    if (!fs.existsSync(dirPath)) {
      console.warn(`${dirPath} doesn't exist! Ignoring.`);
      return [];
    }

    const filesInDirectory = fs.readdirSync(dirPath);

    return filesInDirectory
      .flatMap(fileName => {
        const absoluteFilePath = path.join(dirPath, fileName);
        return fs.lstatSync(absoluteFilePath).isFile()
          ? path.parse(fileName).name
          : getSidebarItemsByDirectory(absoluteFilePath);
      })
      .sort((a, b) => a.split('.').pop().localeCompare(b.split('.').pop()));
  }
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
