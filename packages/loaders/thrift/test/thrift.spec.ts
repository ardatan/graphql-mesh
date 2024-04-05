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
      });
      expect(printSchemaWithDirectives(schema)).toMatchSnapshot(`${schemaName}-schema`);
    });
  });
});
