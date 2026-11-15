import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';
import { isXmlContentType, jsObjectToXml, xmlToJsObject } from '../src/directives/xmlCodec.js';

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
