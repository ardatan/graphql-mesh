import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';
import { processDirectives } from '../src/directives/process.js';
import {
  inheritXmlNamespacePrefixes,
  isXmlContentType,
  jsObjectToXml,
  xmlToJsObject,
} from '../src/directives/xmlCodec.js';

const CONNECTOR_DIRECTIVES = /* GraphQL */ `
  directive @source(
    name: String!
    http: SourceHTTP!
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on FIELD_DEFINITION | OBJECT

  input ConnectHTTP {
    GET: String
    HEAD: String
    POST: String
    PUT: String
    PATCH: String
    DELETE: String
    headers: [HTTPHeaderMapping!]
    body: String
    queryParams: String
  }

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
    queryParams: String
    errors: ConnectorErrors
    isSuccess: String
  }

  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }

  input ConnectorErrors {
    message: String
    extensions: String
  }
`;

function buildConnectorsSchema(exampleSdl: string, fetchImpl: typeof fetch): GraphQLSchema {
  const schema = buildSchema(`${CONNECTOR_DIRECTIVES}\n${exampleSdl}`);
  return processConnectDirectives(schema, { globalFetch: fetchImpl as any });
}

describe('xmlCodec helpers', () => {
  it('detects XML content types', () => {
    expect(isXmlContentType('text/xml')).toBe(true);
    expect(isXmlContentType('text/xml; charset=utf-8')).toBe(true);
    expect(isXmlContentType('application/xml')).toBe(true);
    expect(isXmlContentType('application/soap+xml')).toBe(true);
    expect(isXmlContentType('application/json')).toBe(false);
    expect(isXmlContentType('text/plain')).toBe(false);
  });

  it('round-trips FXP object shape with attributes and xmlns', () => {
    const obj = {
      'soap:Envelope': {
        attributes: {
          'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
          'xmlns:tns': 'http://tempuri.org',
        },
        'soap:Body': {
          'tns:FindPerson': {
            'tns:id': '42',
          },
        },
      },
    };
    const xml = jsObjectToXml(obj);
    expect(xml).toContain('soap:Envelope');
    expect(xml).toContain('xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"');
    expect(xml).toContain('tns:FindPerson');
    expect(xml).toContain('42');

    const parsed = xmlToJsObject(xml) as any;
    // removeNSPrefix → unprefixed selection paths
    expect(String(parsed.Envelope.Body.FindPerson.id)).toBe('42');
  });
});

describe('Federation Connectors — XML / SOAP-shaped bodies', () => {
  it('POSTs JSONSelection body as XML and selects from XML response', async () => {
    let requestBody = '';
    let requestContentType = '';
    let requestSoapAction = '';

    const fetchImpl = async (_url: string, init?: RequestInit) => {
      requestBody = String(init?.body ?? '');
      const hdrs = new Headers(init?.headers as HeadersInit);
      requestContentType = hdrs.get('content-type') || '';
      requestSoapAction = hdrs.get('SOAPAction') || '';
      const responseXml = `<?xml version="1.0"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <FindPersonResponse xmlns="http://tempuri.org">
              <FindPersonResult>
                <Name>Alice</Name>
                <SSN>111-22-3333</SSN>
                <Home><City>Istanbul</City></Home>
              </FindPersonResult>
            </FindPersonResponse>
          </soap:Body>
        </soap:Envelope>`;
      return new Response(responseXml, {
        status: 200,
        headers: { 'content-type': 'text/xml; charset=utf-8' },
      });
    };

    const sdl = /* GraphQL */ `
      schema
        @source(
          name: "soapDemo"
          http: {
            baseURL: "http://localhost:8080/csp/samples"
            headers: [{ name: "Content-Type", value: "text/xml; charset=utf-8" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(id: ID!): Person
          @connect(
            source: "soapDemo"
            http: {
              POST: "/SOAP.Demo.cls"
              headers: [{ name: "SOAPAction", value: "http://tempuri.org/SOAP.Demo.FindPerson" }]
              body: """
              "soap:Envelope": {
                attributes: {
                  "xmlns:soap": $("http://schemas.xmlsoap.org/soap/envelope/")
                  "xmlns:tns": $("http://tempuri.org")
                }
                "soap:Body": {
                  "tns:FindPerson": {
                    "tns:id": $args.id
                  }
                }
              }
              """
            }
            selection: """
            name: Envelope.Body.FindPersonResponse.FindPersonResult.Name
            ssn: Envelope.Body.FindPersonResponse.FindPersonResult.SSN
            city: Envelope.Body.FindPersonResponse.FindPersonResult.Home.City
            """
          )
      }

      type Person {
        name: String
        ssn: String
        city: String
      }
    `;

    const schema = buildConnectorsSchema(sdl, fetchImpl as any);
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "42") {
            name
            ssn
            city
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        name: 'Alice',
        ssn: '111-22-3333',
        city: 'Istanbul',
      },
    });
    expect(requestContentType).toContain('text/xml');
    expect(requestSoapAction).toBe('http://tempuri.org/SOAP.Demo.FindPerson');
    expect(requestBody).toContain('soap:Envelope');
    expect(requestBody).toContain('tns:FindPerson');
    expect(requestBody).toContain('42');
    expect(requestBody).not.toMatch(/^\s*\{/); // not JSON
  });

  it('inherits parent namespace prefixes onto unprefixed nested object keys', () => {
    const inherited = inheritXmlNamespacePrefixes({
      'orders:SubmitOrder': {
        customerId: 'c1',
        items: [{ productId: 'p1', quantity: 2 }],
      },
    });
    expect(inherited).toEqual({
      'orders:SubmitOrder': {
        'orders:customerId': 'c1',
        'orders:items': [{ 'orders:productId': 'p1', 'orders:quantity': 2 }],
      },
    });
    expect(jsObjectToXml(inherited)).toContain(
      '<orders:SubmitOrder><orders:customerId>c1</orders:customerId><orders:items><orders:productId>p1</orders:productId><orders:quantity>2</orders:quantity></orders:items></orders:SubmitOrder>',
    );
  });

  it('unwraps innerText on attributed leaves so Date/String scalars get strings', () => {
    const parsed = xmlToJsObject(
      '<Envelope><Body><Name id="1">Alice</Name><Empty xsi:nil="true"/></Body></Envelope>',
    ) as any;
    expect(parsed.Envelope.Body.Name).toBe('Alice');
    expect(parsed.Envelope.Body.Empty).toBeNull();
  });

  it('wraps a single nested XML element into a GraphQL list field', async () => {
    // Legacy soapDefaultResolver: one sibling for an unbounded element must still
    // satisfy [T]. processDirectives installs the pluralization (not connect-only).
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Envelope><Body><Items><Item><Name>Solo</Name></Item></Items></Body></Envelope>`,
        { status: 200, headers: { 'content-type': 'text/xml' } },
      );

    const sdl = /* GraphQL */ `
      schema @source(name: "xmlApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }

      type Query {
        bag: Bag
          @connect(
            source: "xmlApi"
            http: {
              POST: "/bag"
              headers: [{ name: "Content-Type", value: "text/xml" }]
              body: """
              Request: { id: $("1") }
              """
            }
            selection: "items: Envelope.Body.Items.Item { name: Name }"
          )
      }

      type Bag {
        items: [Item!]
      }

      type Item {
        name: String
      }
    `;

    const schema = processDirectives(buildSchema(`${CONNECTOR_DIRECTIVES}\n${sdl}`), {
      globalFetch: fetchImpl as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          bag {
            items {
              name
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ bag: { items: [{ name: 'Solo' }] } });
  });

  it('parses XML when Content-Type is omitted but body has an XML declaration', async () => {
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Envelope><Body><Item><Name>Bob</Name></Item></Body></Envelope>`,
        { status: 200 },
      );

    const sdl = /* GraphQL */ `
      schema @source(name: "xmlApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }

      type Query {
        item: Item
          @connect(
            source: "xmlApi"
            http: {
              POST: "/item"
              headers: [{ name: "Content-Type", value: "application/xml" }]
              body: """
              Request: { id: $("1") }
              """
            }
            selection: "name: Envelope.Body.Item.Name"
          )
      }

      type Item {
        name: String
      }
    `;

    const schema = buildConnectorsSchema(sdl, fetchImpl as any);
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          item {
            name
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ item: { name: 'Bob' } });
  });
});
