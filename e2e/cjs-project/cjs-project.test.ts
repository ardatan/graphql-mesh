import { createTenv } from '../tenv';

const { serve, compose } = createTenv(__dirname);

it('should serve', async () => {
  const proc = await serve();
  const res = await fetch(`http://localhost:${proc.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});

it('should compose', async () => {
  const proc = await compose();
  expect(proc.result).toMatchInlineSnapshot(`
"schema {
  query: Query
}

type Query {
  hello: String @resolver(subgraph: "helloworld", operation: "query hello { hello }") @source(subgraph: "helloworld", name: "hello", type: "String")
}
"
`);
});
