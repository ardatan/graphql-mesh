import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyT } from 'html-minifier-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function minify(str) {
  return (
    await minifyT(str, {
      minifyJS: true,
      useShortDoctype: false,
      removeAttributeQuotes: true,
      collapseWhitespace: true,
      minifyCSS: true,
    })
  ).toString('utf-8');
}

async function minifyLandingPageHTML() {
  const minified = await minify(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'landing-page.html'), 'utf-8'),
  );

  await fs.promises.writeFile(
    path.join(__dirname, '../src/landing-page-html.ts'),
    `export default ${JSON.stringify(minified)}`,
  );
}

minifyLandingPageHTML().catch(err => {
  console.error(err);
  process.exit(1);
});
