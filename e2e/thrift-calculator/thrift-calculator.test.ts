import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

const addQuery = /* GraphQL */ `
  query Add {
    add(request: { left: 2, right: 3 })
  }
`;

const addExceptionQuery = /* GraphQL */ `
  query AddBoom {
    add(request: { left: -1, right: 3 })
  }
`;

let calculator: Service;

beforeAll(async () => {
  calculator = await service('calculator');
});

describe('binary (@thrift__rpc)', () => {
  it('composes schema with @thrift__rpc', async () => {
    const { result } = await compose({
      services: [calculator],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    expect(result).toMatch(/@thrift__rpc\(/);
    expect(result).toMatch(/function:\s*"add"/);
    expect(result).toMatch(/1\(struct\):\s*\$args\.request/);
    expect(result).toMatch(/\$\(i32\)/);
    expect(result).not.toMatch(/@fieldTypeMap\(/);
    expect(result).not.toMatch(/topTypeMap/);
    expect(result).not.toMatch(/clientAnnotations/);
  });

  it('executes add on hive', async () => {
    const { output } = await compose({
      services: [calculator],
      output: 'graphql',
    });
    const { execute } = await serve({ supergraph: output, runner: 'hive' });
    await expect(execute({ query: addQuery })).resolves.toMatchSnapshot();
  });

  it('surfaces thrift application exceptions on hive', async () => {
    const { output } = await compose({
      services: [calculator],
      output: 'graphql',
    });
    const { execute } = await serve({ supergraph: output, runner: 'hive' });
    const result = await execute({ query: addExceptionQuery });
    expect(result.data?.add ?? null).toBeNull();
    expect(result.errors?.length).toBeGreaterThan(0);
    // Hive may mask the downstream message as "Unexpected error." while logging the real one.
    expect(result.errors?.[0]?.extensions?.code || result.errors?.[0]?.message).toBeTruthy();
  });
});

describe('json (@connect TJSON)', () => {
  it('composes schema with @connect isSuccess/errors', async () => {
    const { result } = await compose({
      services: [calculator],
      maskServicePorts: true,
      args: ['-c', 'mesh.json.config.ts'],
    });
    expect(result).toMatchSnapshot();
    // Supergraph lifts Connectors as `@join__directive(name: "connect", …)`.
    expect(result).toMatch(/name:\s*"connect"/);
    expect(result).toMatch(/application\/vnd\.apache\.thrift\.json/);
    expect(result).toMatch(/\$\(\[/);
    expect(result).toMatch(/isSuccess/);
    expect(result).toMatch(/\$->get\(2\)->eq\(2\)/);
    expect(result).not.toMatch(/@thrift__rpc\(/);
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('executes add', async () => {
      const composition = await compose({
        services: [calculator],
        output: 'graphql',
        args: ['-c', 'mesh.json.config.ts'],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const result = await execute({ query: addQuery });
      expect(result.errors).toBeFalsy();
      expect(result.data).toEqual({ add: 5 });
    });

    it('maps TJSON EXCEPTION via isSuccess/errors', async () => {
      const composition = await compose({
        services: [calculator],
        output: 'graphql',
        args: ['-c', 'mesh.json.config.ts'],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const result = await execute({ query: addExceptionQuery });
      expect(result.data?.add ?? null).toBeNull();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(String(result.errors?.[0]?.message || '')).toMatch(/left must not be -1/i);
    });
  });
});
