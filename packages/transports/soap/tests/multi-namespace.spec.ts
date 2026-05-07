import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { fetch, Response } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';

describe('SOAP multi-namespace, headers, and arrays', () => {
  it('routes header parts, qualifies per-schema namespaces, and serializes arrays as repeated siblings', async () => {
    const soapLoader = new SOAPLoader({ subgraphName: 'Test', fetch, logger });
    await soapLoader.loadWSDL(
      readFileSync(join(__dirname, './fixtures/multi-namespace-headers.wsdl'), 'utf-8'),
    );
    const schema = soapLoader.buildSchema();

    const fetchSpy = jest.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(Response.error()),
    );
    const executor = createExecutorFromSchemaAST(schema, fetchSpy as unknown as MeshFetch);

    await executor({
      document: parse(/* GraphQL */ `
        mutation {
          OrderService_OrderService_OrderPort_submitOrder(
            AuthHeader: { token: "tok-123" }
            SubmitOrder: {
              customerId: "cust-1"
              items: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }]
            }
          ) {
            orderId
          }
        }
      `),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestBody = fetchSpy.mock.calls[0][1].body as string;

    // Auth part is routed to <soap:Header> and qualified with the auth XSD namespace;
    // body part is routed to <soap:Body> and qualified with the orders XSD namespace.
    // Array items render as repeated siblings, not <orders:0>, <orders:1>.
    expect(requestBody).toBe(
      [
        '<soap:Envelope ',
        'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ',
        'xmlns:auth="http://example.com/auth" ',
        'xmlns:orders="http://example.com/orders">',
        '<soap:Header>',
        '<auth:AuthHeader><auth:token>tok-123</auth:token></auth:AuthHeader>',
        '</soap:Header>',
        '<soap:Body>',
        '<orders:SubmitOrder>',
        '<orders:customerId>cust-1</orders:customerId>',
        '<orders:items><orders:productId>p1</orders:productId><orders:quantity>2</orders:quantity></orders:items>',
        '<orders:items><orders:productId>p2</orders:productId><orders:quantity>1</orders:quantity></orders:items>',
        '</orders:SubmitOrder>',
        '</soap:Body>',
        '</soap:Envelope>',
      ].join(''),
    );
  });

  it('query args take priority over soapHeaders config on the same header element', async () => {
    // Regression guard for the ordering bug: when both the soapHeaders config and a
    // WSDL-declared soap:header arg map to the same XML element, the explicit
    // GraphQL arg must win. The loader-level config is seeded first; the args loop
    // runs second and overwrites the matching key.
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'http://example.com/auth',
        headers: { AuthHeader: { token: 'cfg-tok' } },
      },
    });
    await soapLoader.loadWSDL(
      readFileSync(join(__dirname, './fixtures/multi-namespace-headers.wsdl'), 'utf-8'),
    );
    const schema = soapLoader.buildSchema();

    const fetchSpy = jest.fn(() => Promise.resolve(Response.error()));
    const executor = createExecutorFromSchemaAST(schema, fetchSpy as unknown as MeshFetch);

    await executor({
      document: parse(/* GraphQL */ `
        mutation {
          OrderService_OrderService_OrderPort_submitOrder(
            AuthHeader: { token: "gql-tok" }
            SubmitOrder: {
              customerId: "cust-1"
              items: [{ productId: "p1", quantity: 1 }]
            }
          ) {
            orderId
          }
        }
      `),
    });

    const body = fetchSpy.mock.calls[0][1].body as string;
    expect(body).toContain('gql-tok');
    expect(body).not.toContain('cfg-tok');
  });

  it('soapHeaders config entries appear alongside WSDL header args when keys do not collide', async () => {
    // When the soapHeaders config contributes a different element than the GraphQL arg,
    // both elements must appear in soap:Header.
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'http://example.com/auth',
        headers: { SecurityToken: { value: 'sec-1' } },
      },
    });
    await soapLoader.loadWSDL(
      readFileSync(join(__dirname, './fixtures/multi-namespace-headers.wsdl'), 'utf-8'),
    );
    const schema = soapLoader.buildSchema();

    const fetchSpy = jest.fn(() => Promise.resolve(Response.error()));
    const executor = createExecutorFromSchemaAST(schema, fetchSpy as unknown as MeshFetch);

    await executor({
      document: parse(/* GraphQL */ `
        mutation {
          OrderService_OrderService_OrderPort_submitOrder(
            AuthHeader: { token: "arg-tok" }
            SubmitOrder: {
              customerId: "cust-1"
              items: [{ productId: "p1", quantity: 1 }]
            }
          ) {
            orderId
          }
        }
      `),
    });

    const body = fetchSpy.mock.calls[0][1].body as string;
    // Both the config-supplied SecurityToken and the arg-supplied AuthHeader must be present.
    expect(body).toContain('sec-1');
    expect(body).toContain('arg-tok');
    expect(body).toContain('soap:Header');
  });

  it('soapHeaders config appears in soap:Header when the WSDL header arg is omitted', async () => {
    // If the caller does not pass the WSDL-declared header arg, the loader-level
    // soapHeaders config must still populate soap:Header by itself.
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'http://example.com/auth',
        headers: { AuthHeader: { token: 'cfg-tok' } },
      },
    });
    await soapLoader.loadWSDL(
      readFileSync(join(__dirname, './fixtures/multi-namespace-headers.wsdl'), 'utf-8'),
    );
    const schema = soapLoader.buildSchema();

    const fetchSpy = jest.fn(() => Promise.resolve(Response.error()));
    const executor = createExecutorFromSchemaAST(schema, fetchSpy as unknown as MeshFetch);

    await executor({
      document: parse(/* GraphQL */ `
        mutation {
          OrderService_OrderService_OrderPort_submitOrder(
            SubmitOrder: {
              customerId: "cust-1"
              items: [{ productId: "p1", quantity: 1 }]
            }
          ) {
            orderId
          }
        }
      `),
    });

    const body = fetchSpy.mock.calls[0][1].body as string;
    expect(body).toContain('cfg-tok');
    expect(body).toContain('soap:Header');
  });

  it('preserves legacy wire format for single-namespace WSDLs without bodyAlias', async () => {
    // Regression guard: a WSDL with one XSD namespace and no bodyAlias must produce
    // the same envelope it did before namespace-awareness was introduced — same
    // "body" prefix, same xmlns binding, same element structure.
    const soapLoader = new SOAPLoader({ subgraphName: 'Test', fetch, logger });
    await soapLoader.loadWSDL(
      readFileSync(
        join(__dirname, '../../../loaders/soap/test/fixtures/tempconvert.wsdl'),
        'utf-8',
      ),
    );
    const schema = soapLoader.buildSchema();

    const fetchSpy = jest.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(Response.error()),
    );
    const executor = createExecutorFromSchemaAST(schema, fetchSpy as unknown as MeshFetch);

    await executor({
      document: parse(/* GraphQL */ `
        mutation {
          tns_TempConvert_TempConvertSoap12_FahrenheitToCelsius(
            FahrenheitToCelsius: { Fahrenheit: "100" }
          ) {
            FahrenheitToCelsiusResult
          }
        }
      `),
    });

    expect(fetchSpy.mock.calls[0][1].body).toBe(
      [
        '<soap:Envelope ',
        'xmlns:soap="http://www.w3.org/2003/05/soap-envelope" ',
        'xmlns:body="https://www.w3schools.com/xml/">',
        '<soap:Body>',
        '<body:FahrenheitToCelsius><body:Fahrenheit>100</body:Fahrenheit></body:FahrenheitToCelsius>',
        '</soap:Body>',
        '</soap:Envelope>',
      ].join(''),
    );
  });
});
