import { createTenv } from '../tenv';

const { compose, fs } = createTenv(__dirname);

// jest.change

it('should write compose output to fusiongraph.graphql', async () => {
  const target = 'fusiongraph.graphql';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchSnapshot();

  await fs.delete(target);
});

it('should write compose output to fusiongraph.json', async () => {
  const target = 'fusiongraph.json';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchSnapshot();

  await fs.delete(target);
});

it('should write compose output to fusiongraph.js', async () => {
  const target = 'fusiongraph.js';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchSnapshot();

  await fs.delete(target);
});

it('should write compose output to fusiongraph.ts', async () => {
  const target = 'fusiongraph.ts';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchSnapshot();

  await fs.delete(target);
});
