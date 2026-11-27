import { createTenv } from '@e2e/tenv';

const { compose, fs } = createTenv(__dirname);
// Federation Spec `@lookup` may be lifted into lean `@join__directive(..., name: "lookup", ...)`.
const regExp = /@(?:lookup\b|join__directive\([^)]*name:\s*"lookup")/;

it('should generate lookup directives', async () => {
  const { output } = await compose({
    output: 'graphql',
    args: ['-c', 'mesh.config.conventions-enabled.ts'],
  });
  await expect(fs.read(output)).resolves.toMatch(regExp);
});

it('should not generate lookup directives', async () => {
  const { output } = await compose({
    output: 'graphql',
    args: ['-c', 'mesh.config.conventions-disabled.ts'],
  });
  await expect(fs.read(output)).resolves.not.toMatch(regExp);
});
