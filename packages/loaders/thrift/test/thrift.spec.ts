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

  it('rejects recursive struct arguments instead of truncating', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'Recursive',
        source: './fixtures/recursive_types.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/recursive',
        serviceName: 'Recursive',
        protocol: 'binary',
      }),
    ).rejects.toThrow(/recursive in RPC arguments/);
  });

  it('GraphQL enum internal values are Thrift integers', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'binary',
    });
    const tweetType = schema.getType('TweetType') as import('graphql').GraphQLEnumType;
    const values = tweetType.getValues();
    expect(values.find(v => v.name === 'TWEET')?.value).toBe(0);
    expect(values.find(v => v.name === 'RETWEET')?.value).toBe(2);
    expect(values.find(v => v.name === 'DM')?.value).toBe(0xa);
    expect(values.find(v => v.name === 'REPLY')?.value).toBe(0xb);
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
    const connect = (schema.getQueryType()!.getFields().zip.extensions as any).directives.connect;
    expect(connect.isSuccess).toBeUndefined();
    expect(connect.errors).toBeUndefined();
    expect(connect.selection).toBe('null');
    // Non-void CALL methods require success field "0" (declared throws are not silent null).
    expect(normalized).toMatch(
      /\$->get\(2\)->eq\(2\)->and\(\$->get\(4\)->get\("0"\)->ne\(null\)\)/,
    );
    // ping has no throws — REPLY-only isSuccess.
    const pingConnect = (schema.getQueryType()!.getFields().ping.extensions as any).directives
      .connect;
    expect(pingConnect.isSuccess).toBe('$->get(2)->eq(2)');
    // postTweet is bool + throws — require success field "0".
    const postTweetConnect = (schema.getQueryType()!.getFields().postTweet.extensions as any)
      .directives.connect;
    expect(postTweetConnect.isSuccess).toContain('->get("0")->ne(null)');
  });

  it('void + throws + ignoreExceptions:true requires empty TJSON result', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'VoidThrows',
      source: './fixtures/void_throws.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/void-throws',
      protocol: 'json',
    });
    const connect = (schema.getQueryType()!.getFields().flush.extensions as any).directives.connect;
    expect(connect.isSuccess).toBe('$->get(2)->eq(2)->and($->get(4)->size->eq(0))');
  });

  it('void + throws + ignoreExceptions:false uses ok: Boolean! success member', async () => {
    const binary = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'VoidThrows',
      source: './fixtures/void_throws.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/void-throws',
      protocol: 'binary',
      ignoreExceptions: false,
    });
    const binarySdl = printSchemaWithDirectives(binary);
    expect(binarySdl).toMatch(/type FlushSuccess[\s\S]*ok:\s*Boolean!/);
    expect(binarySdl).not.toMatch(/type FlushSuccess[\s\S]*value:\s*Void!/);

    const json = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'VoidThrows',
      source: './fixtures/void_throws.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/void-throws',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const jsonSdl = printSchemaWithDirectives(json);
    expect(jsonSdl).toMatch(/type FlushSuccess[\s\S]*ok:\s*Boolean!/);
    expect(jsonSdl).toMatch(/ok:\s*true/);
  });

  it('TJSON bool args use integer match (0/1)', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'BoolSvc',
      source: './fixtures/bool_arg.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/bool',
      protocol: 'json',
    });
    const body = (schema.getQueryType()!.getFields().setFlag.extensions as any).directives.connect
      .http.body as string;
    expect(body).toMatch(/"tf":\s*\$args\.enabled->match\(\[true,\s*1\],\s*\[false,\s*0\]/);
  });

  it('TJSON map<string,bool> args fail at generate', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'BoolMapSvc',
        source: './fixtures/bool_map_arg.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/bool-map',
        protocol: 'json',
      }),
    ).rejects.toThrow(/map with bool values cannot be emitted as TJSON/);
  });
});
