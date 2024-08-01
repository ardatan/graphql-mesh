import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import { include } from '../src/index';

const fixtures = globSync(path.join(__dirname, 'fixtures', '*')).map(p => ({
  fixture: path.basename(p),
  cwd: p,
  pathToInclude: path.join(p, fs.readFileSync(path.join(p, 'include.txt'), 'utf8').trim()),
}));

it.each(fixtures)('should include in fixture $fixture', async ({ pathToInclude }) => {
  // TODO: cant test tsconfig paths because jest doesnt allow manipulating Module._resolveFilename
  // const unregister = registerTsconfigPaths({ cwd });
  // await using _ = {
  //   [Symbol.dispose]() {
  //     unregister();
  //   },
  // };
  await expect(include(pathToInclude)).resolves.toMatchSnapshot();
});
