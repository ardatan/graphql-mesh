import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';
import globby from 'globby';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const __packages = path.join(__dirname, '..', 'packages');

const cjs = 'pathToFileURL(__filename)';
const esm = 'import.meta.url';

(async () => {
  console.log(`Fixing ${cjs} in built ESM scripts`);
  const scriptPaths = await globby(['!node_modules', '**/dist/esm/**/*.js'], {
    cwd: __packages,
  });

  for (const scriptPath of scriptPaths) {
    const script = path.join(__packages, scriptPath);
    const content = await fs.readFile(script, 'utf8');
    if (!content.includes(cjs)) {
      continue;
    }

    await fs.writeFile(
      script,
      content
        // @ts-expect-error we're using modern node
        .replaceAll(cjs, esm),
    );
    console.log(`Replaced all "${cjs}" with "${esm}" packages/${scriptPath}`);
  }
  console.log('Done');
})();
