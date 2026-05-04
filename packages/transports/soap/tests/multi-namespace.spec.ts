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
              items: [
                { productId: "p1", quantity: 2 }
                { productId: "p2", quantity: 1 }
              ]
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
});
