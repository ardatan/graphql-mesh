import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadNonExecutableGraphQLSchemaFromIDL } from '../src/index.js';

describe('thrift', () => {
  const schemas: Record<
    string,
    {
      idl: string;
      path: string;
      serviceName: string;
    }
  > = {
    Twitter: {
      idl: 'twitter.thrift',
      path: '/twitter',
      serviceName: 'twitter-service',
    },
    Calc: {
      idl: 'calc.thrift',
      path: '/thrift-with-imports',
      serviceName: 'Calculator',
    },
    Recursive: {
      idl: 'recursive_types.thrift',
      path: '/recursive',
      serviceName: 'Recursive',
    },
  };
  Object.entries(schemas).forEach(([schemaName, schemaObj]) => {
    it(schemaName, async () => {
      const schema = await loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: schemaName,
        source: `./fixtures/${schemaObj.idl}`,
        baseDir: __dirname,
        endpoint: `http://localhost:4000${schemaObj.path}`,
        operationHeaders: {
          'x-api-key': '123',
        },
        serviceName: schemaObj.serviceName,
        protocol: 'binary',
      });
      const sdl = printSchemaWithDirectives(schema);
      expect(sdl).toMatchSnapshot(`${schemaName}-schema`);
      expect(sdl).toMatch(/@thrift__rpc\(/);
    });
  });

  it('Calc json protocol emits @connect with isSuccess/errors', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Calc',
      source: './fixtures/calc.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/thrift-json',
      protocol: 'json',
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatchSnapshot('Calc-json-connect-schema');
    expect(sdl).toMatch(/@connect\(/);
    expect(sdl).toMatch(/application\/vnd\.apache\.thrift\.json/);
    expect(sdl).toMatch(/isSuccess/);
    expect(sdl).toMatch(/\$->get\(2\)->eq\(2\)/);
    expect(sdl).not.toMatch(/@thrift__rpc\(/);
  });

  it('entityMethods stamps entity: true', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Calc',
      source: './fixtures/calc.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/thrift',
      serviceName: 'Calculator',
      protocol: 'binary',
      entityMethods: ['add'],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/@thrift__rpc\([\s\S]*entity:\s*true/);
  });

  it('ignoreExceptions: false models throws as union', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'binary',
      ignoreExceptions: false,
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/type TwitterUnavailable/);
    expect(sdl).toMatch(/union PostTweetResult/);
    expect(sdl).toMatch(/type PostTweetSuccess/);
    expect(sdl).toMatch(/messageType:\s*ONEWAY/);
    expect(sdl).toMatch(/throws:\s*"""[\s\S]*TwitterUnavailable:\s*1/);
    expect(sdl).not.toMatch(/@fieldTypeMap\(/);
    expect(sdl).not.toMatch(/@thrift__method\(/);
  });

  it('json protocol ONEWAY body uses message type 4 and void isSuccess', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'json',
    });
    const sdl = printSchemaWithDirectives(schema);
    // Unescape printed GraphQL string escapes so body layout is readable.
    const normalized = sdl.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const zipField = normalized.slice(normalized.indexOf('zip: Void'));
    // zip is oneway — TJSON body message type 4, no isSuccess (no reply wait).
    expect(zipField).toContain('zip: Void @connect(');
    expect(zipField).toMatch(/"zip",\s*4,\s*1,/);
    expect(zipField).toContain('selection: "null"');
    const zipDirectiveEnd = zipField.indexOf(')');
    expect(zipField.slice(0, zipDirectiveEnd + 1)).not.toContain('isSuccess');
    // Non-void CALL methods require success field "0" (declared throws are not silent null).
    expect(normalized).toMatch(
      /\$->get\(2\)->eq\(2\)->and\(\$->get\(4\)->get\("0"\)->ne\(null\)\)/,
    );
  });
});
