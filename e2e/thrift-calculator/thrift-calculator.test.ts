import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

const addQuery = /* GraphQL */ `
  query Add {
    add(request: { left: 2, right: 3 })
  }
`;

let calculator: Service;

beforeAll(async () => {
  calculator = await service('calculator');
});

describe('binary (@thrift__method)', () => {
  it('composes schema with @thrift__method', async () => {
    const { result } = await compose({
      services: [calculator],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    expect(result).toMatch(/@thrift__method\(/);
    expect(result).toMatch(/method:\s*"add"/);
    expect(result).toMatch(/1\(struct\):\s*\$args\.request/);
    expect(result).toMatch(/\$\(i32\)/);
    expect(result).toMatch(/@fieldTypeMap\(/);
  });

  it('executes add on hive', async () => {
    const { output } = await compose({
      services: [calculator],
      output: 'graphql',
    });
    const { execute } = await serve({ supergraph: output, runner: 'hive' });
    await expect(execute({ query: addQuery })).resolves.toMatchSnapshot();
  });
});

describe('json (@connect TJSON)', () => {
  it('composes schema with @connect', async () => {
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
    expect(result).not.toMatch(/@thrift__method\(/);
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
  });
});
