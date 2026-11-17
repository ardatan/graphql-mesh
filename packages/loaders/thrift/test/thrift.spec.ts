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
  });
});
