import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromThriftIDL from '../src/index.js';

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
  for (const schemaName in schemas) {
    it(schemaName, async () => {
      const schemaObj = schemas[schemaName];
      const schema = await loadGraphQLSchemaFromThriftIDL(schemaName, {
        source: `./fixtures/${schemaObj.idl}`,
        baseDir: __dirname,
        endpoint: `http://localhost:4000${schemaObj.path}`,
        operationHeaders: {
          'x-api-key': '123',
        },
        serviceName: schemaObj.serviceName,
      });
      expect(printSchemaWithDirectives(schema)).toMatchSnapshot(`${schemaName}-schema`);
    });
  }
});
