import { createTenv } from '@e2e/tenv';

const { compose, fs } = createTenv(__dirname);

it('should write compose output to fusiongraph.graphql', async () => {
  const { output } = await compose({ output: 'graphql' });
  await expect(fs.read(output)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.json', async () => {
  const { output } = await compose({ output: 'json' });
  await expect(fs.read(output)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.js', async () => {
  const { output } = await compose({ output: 'js' });
  await expect(fs.read(output)).resolves.toMatchSnapshot();
});

it('should write compose output to fusiongraph.ts', async () => {
  const { output } = await compose({ output: 'ts' });
  await expect(fs.read(output)).resolves.toMatchSnapshot();
});
