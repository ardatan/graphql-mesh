import { createTenv } from '@e2e/tenv';

const { compose, fs } = createTenv(__dirname);
const regExp = /@merge\(.*\)/;

it('should generate merge directives', async () => {
  const { output } = await compose({ output: 'graphql', args: ['-c', 'mesh.config.conventions-enabled.ts'] });
  await expect(fs.read(output)).resolves.toMatch(regExp);
});

it('should not generate merge directives', async () => {
  const { output } = await compose({ output: 'graphql', args: ['-c', 'mesh.config.conventions-disabled.ts'] });
  await expect(fs.read(output)).resolves.not.toMatch(regExp);
});
