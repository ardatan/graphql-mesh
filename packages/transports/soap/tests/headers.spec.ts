import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { fetch, Response } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';

describe('SOAP Headers', () => {
  it('should pass headers to the executor', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'guild',
        content: {
          MyHeader: {
            UserName: '{context.USER_NAME}',
            Password: '{context.PASSWORD}',
          },
        },
      },
    });
    await soapLoader.loadWSDL(
      readFileSync(join(__dirname, './fixtures/globalweather.wsdl'), 'utf-8'),
    );
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('soap-with-headers');
    const fetchSpy = jest.fn((_url: string, _init: ResponseInit) => Response.error());
    const executor = createExecutorFromSchemaAST(schema, fetchSpy);
    await executor({
      document: parse(/* GraphQL */ `
        {
          tns_GlobalWeather_GlobalWeatherSoap_GetWeather {
            GetWeatherResult
          }
        }
      `),
      context: {
        USER_NAME: 'user',
        PASSWORD: 'password',
      },
    });
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      body: expect.stringContaining(
        '<soap:Header><header:MyHeader><header:UserName>user</header:UserName><header:Password>password</header:Password></header:MyHeader></soap:Header>',
      ),
    });
  });
});
