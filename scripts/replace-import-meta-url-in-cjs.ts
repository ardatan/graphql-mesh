import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';
import globby from 'globby';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const __packages = path.join(__dirname, '..', 'packages');

const cjs = "require('node:url').pathToFileURL(__filename)";
const esm = 'import.meta.url';

(async () => {
  console.log(`Replacing "${esm}" in built CJS scripts`);
  const scriptPaths = await globby(['!node_modules', '**/dist/cjs/**/*.js'], {
    cwd: __packages,
  });

  for (const scriptPath of scriptPaths) {
    if (scriptPath.includes('ts-artifacts')) {
      continue;
    }
    const script = path.join(__packages, scriptPath);
    const content = await fs.readFile(script, 'utf8');
    if (!content.includes(esm)) {
      continue;
    }

    await fs.writeFile(
      script,
      content
        // @ts-expect-error we're using modern node
        .replaceAll(esm, cjs),
    );
    console.log(`Replaced all "${esm}" with "${cjs}" packages/${scriptPath}`);
  }
  console.log('Done');
})();
