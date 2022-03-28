import { promises as fs } from 'fs';
import path from 'path';
import globby from 'globby';

const CWD = process.cwd();

const escapeGeneratedMarkdown = async () => {
  const filepaths = globby.sync(path.join(CWD, 'website/docs/generated-markdown/*.md'));
  await Promise.all(
    filepaths.map(async filepath => {
      const content = await fs.readFile(filepath, 'utf8');
      const newContent = content
        // Escape `{` because MDX2 parse him as expressions
        .replace(/{/g, '\\{')
        // Escape `<` because MDX2 parse him as JSX tags
        .replace(/</g, '\\<');
      await fs.writeFile(filepath, newContent);
    })
  );
};

escapeGeneratedMarkdown().catch(e => {
  console.error(e);
  process.exit(1);
});
