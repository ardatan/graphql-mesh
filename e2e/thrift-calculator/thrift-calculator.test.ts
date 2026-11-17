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

const divideQuery = /* GraphQL */ `
  query Divide {
    divide(left: 10, right: 2)
  }
`;

const divideByZeroQuery = /* GraphQL */ `
  query DivideByZero {
    divide(left: 10, right: 0)
  }
`;

const zipQuery = /* GraphQL */ `
  query Zip {
    zip
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
    expect(result).toMatch(/messageType:\s*ONEWAY/);
    expect(result).toMatch(/function:\s*"divide"/);
    // Single-service generate omits per-field `service:` (path is on `@transport`).
    expect(result).not.toMatch(/function:\s*"add"[\s\S]*?service:\s*"/);
    expect(result).not.toMatch(/@fieldTypeMap\(/);
    expect(result).not.toMatch(/topTypeMap/);
    expect(result).not.toMatch(/clientAnnotations/);
    expect(result).not.toMatch(/options:\s*\{/);
    expect(result).not.toMatch(/@thrift__method\(/);
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
    const err = result.errors?.[0];
    // Prefer the Thrift message; Hive may mask as "Unexpected error." in `message`
    // while still attaching the upstream text under extensions / cause.
    const text = [
      err?.message,
      err?.extensions?.message,
      (err?.extensions as { originalError?: { message?: string } } | undefined)?.originalError
        ?.message,
      (err as { originalError?: { message?: string } } | undefined)?.originalError?.message,
    ]
      .filter(v => typeof v === 'string' && v.length)
      .join(' | ');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/left must not be -1|Unexpected error/i);
  });

  it('executes divide and maps declared throws as GraphQL errors', async () => {
    const { output } = await compose({
      services: [calculator],
      output: 'graphql',
    });
    const { execute } = await serve({ supergraph: output, runner: 'hive' });
    await expect(execute({ query: divideQuery })).resolves.toEqual({
      data: { divide: 5 },
    });
    const boom = await execute({ query: divideByZeroQuery });
    expect(boom.data?.divide ?? null).toBeNull();
    expect(boom.errors?.length).toBeGreaterThan(0);
    const text = String(boom.errors?.[0]?.message || '');
    // Binary ignoreExceptions:true → doRequest "unknown result" (declared throw field).
    expect(text.length).toBeGreaterThan(0);
  });

  it('ONEWAY zip returns null without waiting for a reply body', async () => {
    const { output } = await compose({
      services: [calculator],
      output: 'graphql',
    });
    const { execute } = await serve({ supergraph: output, runner: 'hive' });
    const result = await execute({ query: zipQuery });
    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({ zip: null });
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
    const normalized = result.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    expect(normalized).toMatch(
      /\$->get\(2\)->eq\(2\)->and\(\$->get\(4\)->get\("0"\)->ne\(null\)\)/,
    );
    expect(normalized).toMatch(/"zip",\s*4,\s*1,/); // ONEWAY message type in TJSON body
    expect(result).not.toMatch(/@thrift__rpc\(/);
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

    it('maps declared IDL throws via isSuccess ne(null) on field "0"', async () => {
      const composition = await compose({
        services: [calculator],
        output: 'graphql',
        args: ['-c', 'mesh.json.config.ts'],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const ok = await execute({ query: divideQuery });
      expect(ok.errors).toBeFalsy();
      expect(ok.data).toEqual({ divide: 5 });
      const boom = await execute({ query: divideByZeroQuery });
      expect(boom.data?.divide ?? null).toBeNull();
      expect(boom.errors?.length).toBeGreaterThan(0);
      expect(String(boom.errors?.[0]?.message || '')).toMatch(/division by zero/i);
    });
  });
});
