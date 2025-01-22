import { createTenv } from '@e2e/tenv';

const outputTypes = ['graphql', 'json', 'js', 'ts'] as const;

for (const output of outputTypes) {
  it.concurrent(`should write compose output to supergraph.${output}`, async () => {
    await using tenv = createTenv(__dirname);
    await using composition = await tenv.compose({ output });
    await expect(tenv.fs.read(composition.supergraphPath)).resolves.toMatchSnapshot();
  });
}
