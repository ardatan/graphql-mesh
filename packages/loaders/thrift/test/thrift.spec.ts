import { isUnionType, type GraphQLUnionType } from 'graphql';
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

  it('GraphQL enums use member names; compact i32 leaves use ->match', async () => {
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
    expect(values.find(v => v.name === 'TWEET')?.value).toBe('TWEET');
    expect(values.find(v => v.name === 'RETWEET')?.value).toBe('RETWEET');
    expect(values.find(v => v.name === 'DM')?.value).toBe('DM');
    expect(values.find(v => v.name === 'REPLY')?.value).toBe('REPLY');
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toMatch(/@enum\(/);
    expect(sdl).toMatch(
      /5\(i32\):\s*tweetType->match\(\["TWEET", 0\], \["RETWEET", 2\], \["DM", 10\], \["REPLY", 11\], \[@, 0\]\)/,
    );
    expect(sdl).toMatch(
      /tweetType:\s*5\(i32\)->match\(\[0, "TWEET"\], \[2, "RETWEET"\], \[10, "DM"\], \[11, "REPLY"\], \[@, @\]\)/,
    );
  });

  it('does not stamp Mesh @enum on thrift enum values', async () => {
    const { getDirectiveExtensions } = await import('@graphql-tools/utils');
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'binary',
    });
    const tweetType = schema.getType('TweetType') as import('graphql').GraphQLEnumType;
    const retweet = tweetType.getValues().find(v => v.name === 'RETWEET')!;
    expect(retweet.value).toBe('RETWEET');
    expect(getDirectiveExtensions(retweet)?.enum).toBeUndefined();
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
    expect(connect.selection).toBe('$(null)');
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
    const flushConnect = (json.getQueryType()!.getFields().flush.extensions as any).directives
      .connect;
    expect(flushConnect.selection).toMatch(/^\$\(\{/);
    expect(flushConnect.selection).toMatch(/ok:\s*\$->get\(4\)->size->eq\(0\)/);
    expect(flushConnect.selection).not.toMatch(/\bok:\s*true\b/);
  });

  it('TJSON list args fail at generate (no LitArray spread / Router concat)', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'ListSvc',
        source: './fixtures/list_arg.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/list',
        protocol: 'json',
      }),
    ).rejects.toThrow(/list\/set arguments cannot be emitted as TJSON/);
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

  it('TJSON map with struct values fails at generate', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'StructMapSvc',
        source: './fixtures/struct_map_arg.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/struct-map',
        protocol: 'json',
      }),
    ).rejects.toThrow(/map with composite values cannot be emitted as TJSON/);
  });

  it('binary map<string,struct> args expand value field descriptors', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'StructMapSvc',
      source: './fixtures/struct_map_arg.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/struct-map',
      protocol: 'binary',
    });
    const args = (schema.getQueryType()!.getFields().putItems.extensions as any).directives
      .thrift__rpc.args as string;
    expect(args).toMatch(/1\(map<string,\s*struct>\):\s*\$args\.items\s*\{/);
    expect(args).toMatch(/7\(i32\):\s*value/);
  });

  it('TJSON ignoreExceptions:false unions emit $({…}) selection', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const postTweet = (schema.getQueryType()!.getFields().postTweet.extensions as any).directives
      .connect.selection as string;
    expect(postTweet.trim().startsWith('$({')).toBe(true);
    expect(postTweet).toMatch(/value:\s*\$->get\(4\)/);
    expect(postTweet).not.toMatch(/^ok:\s*true$/m);
    expect(postTweet).not.toMatch(/^value:\s*\$->get/m);
  });

  it('forward typedef resolves after named types register', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'ForwardTypedef',
      source: './fixtures/forward_typedef.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/forward',
      protocol: 'binary',
    });
    const getDigits = schema.getQueryType()!.getFields().getDigits;
    expect(getDigits.type.toString()).toMatch(/Later/);
  });

  it('TJSON root and list enum selections map i32 to member names', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'EnumReturn',
      source: './fixtures/enum_return.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/enum',
      protocol: 'json',
    });
    const getState = (schema.getQueryType()!.getFields().getState.extensions as any).directives
      .connect.selection as string;
    expect(getState).toMatch(/->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)/);
    const listStates = (schema.getQueryType()!.getFields().listStates.extensions as any).directives
      .connect.selection as string;
    expect(listStates).toMatch(/->map\(@->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)\)/);
  });

  it('TJSON struct list/set enum fields map i32 to member names', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'EnumReturn',
      source: './fixtures/enum_return.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/enum',
      protocol: 'json',
    });
    const selection = (schema.getQueryType()!.getFields().getStatusBag.extensions as any).directives
      .connect.selection as string;
    expect(selection).toMatch(
      /states:\s*\$->get\(4\)->get\("0"\)->get\("rec"\)->get\("1"\)->get\("lst"\)->slice\(2\)->map\(@->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)\)/,
    );
    expect(selection).toMatch(
      /uniqueStates:\s*\$->get\(4\)->get\("0"\)->get\("rec"\)->get\("2"\)->get\("set"\)->slice\(2\)->map\(@->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)\)/,
    );
  });

  it('TJSON union selections map nested list/set enum fields to member names', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'EnumReturn',
      source: './fixtures/enum_return.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/enum',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const selection = (schema.getQueryType()!.getFields().getStatusBagOrThrow.extensions as any)
      .directives.connect.selection as string;
    expect(selection).toMatch(
      /states:\s*\$->get\(4\)->get\("0"\)->get\("rec"\)->get\("1"\)->get\("lst"\)->slice\(2\)->map\(@->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)\)/,
    );
    expect(selection).toMatch(
      /uniqueStates:\s*\$->get\(4\)->get\("0"\)->get\("rec"\)->get\("2"\)->get\("set"\)->slice\(2\)->map\(@->match\(\[7,\s*"READY"\].*\[@,\s*@\]\)\)/,
    );
  });

  it('TJSON union stamps throw-id discriminators when exceptions share fields', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'SharedThrowSvc',
      source: './fixtures/shared_throw_fields.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/shared-throw',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const go = schema.getQueryType()!.getFields().go;
    const selection = (go.extensions as any).directives.connect.selection as string;
    expect(selection).toMatch(/__throw_First:\s*\$->get\(4\)->get\("1"\)->ne\(null\)/);
    expect(selection).toMatch(/__throw_Second:\s*\$->get\(4\)->get\("2"\)->ne\(null\)/);
    const resultType = go.type;
    expect(isUnionType(resultType)).toBe(true);
    const resolveType = (resultType as GraphQLUnionType).resolveType!;
    expect(
      resolveType({ message: 'x', __throw_Second: true }, null as any, null as any, null as any),
    ).toBe('Second');
    expect(
      resolveType({ message: 'x', __throw_First: true }, null as any, null as any, null as any),
    ).toBe('First');
    // Hive may keep value:{ left: undefined } on exception replies — field0 wins.
    expect(
      resolveType(
        { field0: false, value: { left: undefined }, message: 'x', __throw_Second: true },
        null as any,
        null as any,
        null as any,
      ),
    ).toBe('Second');
    expect(
      resolveType(
        { field0: true, value: { left: 1 }, __throw_First: false },
        null as any,
        null as any,
        null as any,
      ),
    ).toBe('GoSuccess');
  });

  it('keeps i32->match name↔i32 table in @thrift__rpc after SDL print/rebuild', async () => {
    const { buildSchema } = await import('graphql');
    const { getDirectiveExtensions } = await import('@graphql-tools/utils');
    const { TType } = await import('@creditkarma/thrift-server-core');
    const { parseCompactArgsToTypeMap, parseCompactSelection, applyCompactSelection } =
      await import('../../../transports/thrift/src/compact-mapping.js');
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'Twitter',
      source: './fixtures/twitter.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/twitter',
      serviceName: 'Twitter',
      protocol: 'binary',
    });
    const sdl = printSchemaWithDirectives(schema);
    const rebuilt = buildSchema(sdl, { assumeValidSDL: true });
    const retweet = (rebuilt.getType('TweetType') as import('graphql').GraphQLEnumType)
      .getValues()
      .find(v => v.name === 'RETWEET')!;
    // GraphQL stays on member names; wire ints live in compact ->match arms.
    expect(retweet.value).toBe('RETWEET');
    const postTweet = rebuilt.getQueryType()!.getFields().postTweet;
    const rpc = getDirectiveExtensions(postTweet)?.thrift__rpc?.[0];
    expect(rpc?.args).toMatch(
      /tweetType->match\(\["TWEET", 0\], \["RETWEET", 2\], \["DM", 10\], \["REPLY", 11\], \[@, 0\]\)/,
    );
    const argsMap = parseCompactArgsToTypeMap(rpc.args);
    const tweet = argsMap.tweet;
    expect(tweet.type).toBe(TType.STRUCT);
    if (tweet.type !== TType.STRUCT) throw new Error('expected STRUCT');
    const tweetTypeField = tweet.fields.tweetType;
    expect(tweetTypeField.type).toBe(TType.ENUM);
    expect((tweetTypeField as any).values).toEqual({
      TWEET: 0,
      RETWEET: 2,
      DM: 10,
      REPLY: 11,
    });
    // selection leaf: wire i32 → GraphQL name via the same ->match shape.
    const searchRpc = getDirectiveExtensions(rebuilt.getQueryType()!.getFields().searchTweets)
      ?.thrift__rpc?.[0];
    expect(searchRpc?.selection).toMatch(
      /tweetType:\s*5\(i32\)->match\(\[0, "TWEET"\], \[2, "RETWEET"\]/,
    );
    const leaf = parseCompactSelection(
      'tweetType: 5(i32)->match([0, "TWEET"], [2, "RETWEET"], [10, "DM"], [11, "REPLY"], [@, @])',
    );
    expect(applyCompactSelection(leaf, new Map([[5, 2]]))).toEqual({
      tweetType: 'RETWEET',
    });
  });

  it('binary list<map<string,struct>> args keep MAP value field descriptors', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'ListMapSvc',
      source: './fixtures/list_map_arg.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/list-map',
      protocol: 'binary',
    });
    const args = (schema.getQueryType()!.getFields().putBatches.extensions as any).directives
      .thrift__rpc.args as string;
    expect(args).toMatch(/1\(list<map<string,\s*struct>>\):\s*\$args\.batches\s*\{/);
    expect(args).toMatch(/7\(i32\):\s*value/);
  });

  it('binary list<map<string,i32>> args emit full nested wire token', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'ListMapScalarSvc',
      source: './fixtures/list_map_scalar_arg.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/list-map-scalar',
      protocol: 'binary',
    });
    const args = (schema.getQueryType()!.getFields().putCounts.extensions as any).directives
      .thrift__rpc.args as string;
    expect(args).toMatch(/1\(list<map<string,\s*i32>>\):\s*\$args\.counts/);
    expect(args).not.toMatch(/cannot be emitted/);
  });

  it('binary list<map<string,list<Item>>> args fail at generate', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'ListMapNestedSvc',
        source: './fixtures/list_map_nested_struct_arg.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/list-map-nested',
        protocol: 'binary',
      }),
    ).rejects.toThrow(/composite map values cannot be emitted/);
  });

  it('TJSON union selection coalesces shared exception fields', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'SharedThrowSvc',
      source: './fixtures/shared_throw_fields.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/shared-throw',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const selection = (schema.getQueryType()!.getFields().go.extensions as any).directives.connect
      .selection as string;
    // One `message` property with throw-gated `??` — not two keys that clobber at eval time.
    expect(selection.match(/\bmessage:/g)?.length).toBe(1);
    expect(selection).toMatch(
      /message:\s*\$\(\$->get\(4\)->get\("1"\)->ne\(null\)->match\(\[true,/,
    );
    expect(selection).toMatch(/\?\?\s*\$->get\(4\)->get\("2"\)->ne\(null\)->match\(\[true,/);
  });

  it('binary list<list<enum>> args fail at generate', async () => {
    await expect(
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: 'NestedEnumListSvc',
        source: './fixtures/nested_enum_list_arg.thrift',
        baseDir: __dirname,
        endpoint: 'http://localhost:4000/nested-enum-list',
        protocol: 'binary',
      }),
    ).rejects.toThrow(/nested list arguments with enum elements cannot be emitted/);
  });

  it('generated TJSON union selection preserves shared struct fields after processDirectives', async () => {
    const { buildSchema } = await import('graphql');
    const { applySelection } = await import('../../../transports/rest/src/directives/connect.js');
    const { processDirectives } =
      await import('../../../transports/rest/src/directives/process.js');
    const schema = await loadNonExecutableGraphQLSchemaFromIDL({
      subgraphName: 'SharedThrowStructSvc',
      source: './fixtures/shared_throw_struct_fields.thrift',
      baseDir: __dirname,
      endpoint: 'http://localhost:4000/shared-throw-struct',
      protocol: 'json',
      ignoreExceptions: false,
    });
    const go = schema.getQueryType()!.getFields().go;
    const selection = (go.extensions as any).directives.connect.selection as string;
    expect(selection).toMatch(/detail:\s*\$\(\$->get\(4\)->get\("1"\)->ne\(null\)->match/);
    expect(selection.match(/\bdetail:/g)?.length).toBe(1);

    const rebuilt = processDirectives(buildSchema(printSchemaWithDirectives(schema)), {});
    const union = rebuilt.getType('GoResult') as GraphQLUnionType;
    const resolveType = union.resolveType!;
    const extras = {
      status: 200,
      vars: { args: {}, thisValue: undefined, env: {}, context: {} },
    };

    const successReply = [1, 'go', 2, 1, { '0': { rec: { '1': { i32: 42 } } } }];
    const successData = applySelection(selection, successReply, extras);
    expect(successData.field0).toBe(true);
    expect(successData.value).toEqual({ left: 42 });
    expect(resolveType(successData, null as any, { schema: rebuilt } as any, union)).toBe(
      'GoSuccess',
    );

    const firstReply = [
      1,
      'go',
      2,
      1,
      { '1': { rec: { '1': { rec: { '1': { str: 'from-first' }, '2': { i32: 7 } } } } } },
    ];
    const firstData = applySelection(selection, firstReply, extras);
    expect(firstData.__throw_First).toBe(true);
    expect(firstData.detail).toEqual({ text: 'from-first', code: 7 });
    expect(resolveType(firstData, null as any, { schema: rebuilt } as any, union)).toBe('First');

    const secondReply = [
      1,
      'go',
      2,
      1,
      { '2': { rec: { '1': { rec: { '1': { str: 'from-second' }, '2': { i32: 9 } } } } } },
    ];
    const secondData = applySelection(selection, secondReply, extras);
    expect(secondData.__throw_Second).toBe(true);
    expect(secondData.detail).toEqual({ text: 'from-second', code: 9 });
    expect(resolveType(secondData, null as any, { schema: rebuilt } as any, union)).toBe('Second');
  });
});
