import { createTenv } from '@e2e/tenv';

const { compose, fs } = createTenv(__dirname);

it('should write compose output to fusiongraph.graphql', async () => {
  const { target } = await compose({ target: 'graphql' });
  await expect(fs.read(target)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.json', async () => {
  const { target } = await compose({ target: 'json' });
  await expect(fs.read(target)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.js', async () => {
  const { target } = await compose({ target: 'js' });
  await expect(fs.read(target)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.ts', async () => {
  const { target } = await compose({ target: 'ts' });
  await expect(fs.read(target)).resolves.toMatchSnapshot();
});
