import { createTenv } from '../tenv';

const { serve, compose } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  const proc = await serve(55001);
  proc.kill();
  await proc.waitForExit;

  expect(proc.getStd('out')).toBeFalsy();
  expect(proc.getStd('err')).toMatchInlineSnapshot(
    `"[1m🕸️  Mesh[0m 💡 [36mStarting[0m[1m🕸️  Mesh[0m 💡 [36mLoading configuration from mesh.config.ts[0m[1m🕸️  Mesh[0m 💡 [36mLoaded configuration from mesh.config.ts[0m[1m🕸️  Mesh[0m 💡 [36mLoading Fusiongraph from [0m[1m🕸️  Mesh[0m 💡 [36mStarting server on http://0.0.0.0:55001[0m[1m🕸️  Mesh[0m 💡 [36mStarted server on http://0.0.0.0:55001[0m[1m🕸️  Mesh[0m 💡 [36mClosing http://0.0.0.0:55001 for SIGTERM[0m[1m🕸️  Mesh[0m 💡 [36mClosing watcher for /Users/enisdenjo/Develop/src/github.com/ardatan/graphql-mesh/e2e/logs-to-stderr-...<Message is too long. Enable DEBUG=1 to see the full message.>[0m"`,
  );
});

it('should write compose output to stdout and logs to stderr', async () => {
  const proc = await compose();
  await proc.waitForExit;

  expect(proc.getStd('out')).toMatchInlineSnapshot(`
"schema {
  query: Query
}

type Query {
  hello: String @resolver(subgraph: "test", operation: "query hello { hello }") @source(subgraph: "test", name: "hello", type: "String")
}
"
`);

  // prefer relative paths for logs consistency
  const stderr = proc.getStd('err').replaceAll(__dirname, '');

  expect(stderr).toMatchInlineSnapshot(`
"- Starting Mesh Compose CLI
- Starting Mesh Compose CLI
- Loading Mesh Compose CLI Config from /mesh.config.ts
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loading subgraph test
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Composing fusiongraph
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Composed fusiongraph
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Composed fusiongraph
- Writing Fusiongraph
- Starting Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Composed fusiongraph
- Written fusiongraph to stdout
- Finished Mesh Compose CLI
- Loaded Mesh Compose CLI Config from /mesh.config.ts
- Loaded subgraph test
- Composed fusiongraph
- Written fusiongraph to stdout
"
`);
});
