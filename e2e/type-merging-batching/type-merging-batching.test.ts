import { createTenv } from '../tenv';

const { compose, subgraph } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const proc = await compose({
    subgraphs: [await subgraph('authors'), await subgraph('books')],
    maskSubgraphPorts: true,
  });
  expect(proc.result).toMatchSnapshot();
});

// TODO: rest of tests
