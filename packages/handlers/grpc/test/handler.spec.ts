import { join } from 'path';
import { GraphQLSchema } from 'graphql';

import handler from '../src';

describe.each<[string, string, string]>([
  ['Movie', 'io.xtech', 'movie.proto'],
  ['Empty', 'io.xtech', 'empty.proto'],
  ['Nested', 'io.xtech', 'nested.proto'],
  ['With All Values', 'io.xtech', 'allvalues.proto'],
  ['No Package Nested', '', 'nopackage-nested.proto'],
  ['With Underscores', 'io.xtech', 'underscores.proto'],
  ['Outide', 'io.outside', 'outside.proto'],
])('Interpreting Protos', (name, packageName, file) => {
  test(`should load the ${name} proto`, async () => {
    const config = {
      endpoint: 'localhost',
      serviceName: 'Example',
      packageName,
      protoFilePath: {
        file,
        load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
      },
    };
    const { schema } = await handler.getMeshSource({ config });
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });
});
