import { readFileSync } from 'fs';
import { join } from 'path';
import { execute, parse } from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { processDirectives, SOAPLoader } from '@omnigraph/soap';
import { fetch, Response } from '@whatwg-node/fetch';
import { dummyLogger as log } from '../../../testing/dummyLogger';

describe('SOAP Headers', () => {
  it('should pass headers to the executor', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      log,
      bodyAlias: 'guild',
      soapHeaders: {
        alias: 'guild',
        namespace: 'https://the-guild.dev',
        headers: {
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
    const fetchSpy = jest.fn((_url: string, _init: RequestInit) => Response.error());
    const executable = processDirectives(schema, { globalFetch: fetchSpy as any });
    await execute({
      schema: executable,
      document: parse(/* GraphQL */ `
        {
          tns_GlobalWeather_GlobalWeatherSoap_GetWeather(
            GetWeather: { CityName: "Rome", CountryName: "Italy" }
          ) {
            GetWeatherResult
          }
        }
      `),
      contextValue: {
        USER_NAME: 'user',
        PASSWORD: 'password',
      },
    });
    const body = String(fetchSpy.mock.calls[0][1].body);
    // Binding NS and header NS get distinct prefixes (bodyAlias vs soapHeaders.alias collision).
    expect(body).toContain('xmlns:soap="http://www.w3.org/2003/05/soap-envelope"');
    expect(body).toContain('xmlns:guild="http://www.webserviceX.NET"');
    expect(body).toContain('xmlns:the="https://the-guild.dev"');
    expect(body).toContain('<the:UserName>user</the:UserName>');
    expect(body).toContain('<the:Password>password</the:Password>');
    expect(body).toContain(
      '<guild:GetWeather><guild:CityName>Rome</guild:CityName><guild:CountryName>Italy</guild:CountryName></guild:GetWeather>',
    );
  });
});
