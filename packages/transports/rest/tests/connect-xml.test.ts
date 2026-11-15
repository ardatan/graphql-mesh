import { buildSchema, execute, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';
import { processDirectives } from '../src/directives/process.js';
import { coerceXsdDateString } from '../src/directives/scalars.js';
import {
  coerceXmlLeafForGraphQLType,
  inheritXmlNamespacePrefixes,
  isXmlContentType,
  jsObjectToXml,
  unwrapXmlScalarLeaf,
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

  it('keeps attributed XML nodes for selection and unwraps them for scalars', () => {
    const parsed = xmlToJsObject(
      '<Envelope><Body><Name id="1">Alice</Name><Empty xsi:nil="true"/><Code>00123</Code></Body></Envelope>',
    ) as any;
    // Attributed leaves stay structured so `attributes.id` selection works.
    expect(parsed.Envelope.Body.Name).toEqual({
      innerText: 'Alice',
      attributes: { id: '1' },
    });
    expect(parsed.Envelope.Body.Empty).toEqual({
      attributes: { nil: 'true' },
    });
    // Lexical parse (parseTagValue: false): leading zeros and boolean-shaped text stay strings.
    expect(parsed.Envelope.Body.Code).toBe('00123');
    expect(unwrapXmlScalarLeaf(parsed.Envelope.Body.Name)).toBe('Alice');
    expect(unwrapXmlScalarLeaf(parsed.Envelope.Body.Empty)).toBeNull();
    expect(coerceXmlLeafForGraphQLType('true', 'ID')).toBe('true');
    expect(coerceXmlLeafForGraphQLType(true, 'ID')).toBe('true');
    expect(coerceXmlLeafForGraphQLType('true', 'Boolean')).toBe(true);
    expect(coerceXmlLeafForGraphQLType('1', 'Boolean')).toBe(true);
    expect(coerceXmlLeafForGraphQLType('0', 'Boolean')).toBe(false);
    expect(coerceXmlLeafForGraphQLType('42', 'Int')).toBe(42);
    // Ordinary JSON shaped like an XML leaf must not unwrap to null.
    const jsonLike = { attributes: { id: 'A' } };
    expect(unwrapXmlScalarLeaf(jsonLike)).toEqual({ attributes: { id: 'A' } });
  });

  it('keeps boolean-shaped XML text as GraphQL ID string', async () => {
    // Regression: FXP parseTagValue would turn <Code>true</Code> into boolean true,
    // then GraphQL ID serialize throws "ID cannot represent value: true".
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Envelope><Body><Item><Code>true</Code><Z>00123</Z></Item></Body></Envelope>`,
        { status: 200, headers: { 'content-type': 'text/xml' } },
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
              headers: [{ name: "Content-Type", value: "text/xml" }]
              body: """
              Request: { id: $("1") }
              """
            }
            selection: """
            code: Envelope.Body.Item.Code
            z: Envelope.Body.Item.Z
            """
          )
      }

      type Item {
        code: ID
        z: ID
      }
    `;

    const schema = processDirectives(buildSchema(`${CONNECTOR_DIRECTIVES}\n${sdl}`), {
      globalFetch: fetchImpl as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          item {
            code
            z
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ item: { code: 'true', z: '00123' } });
  });

  it('preserves JSON attribute-shaped objects on scalar fields', async () => {
    // Regression: installXmlScalarUnwrap must not null JSON `{ attributes: ... }`.
    const fetchImpl = async () =>
      new Response(JSON.stringify({ metadata: { attributes: { id: 'A' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const sdl = /* GraphQL */ `
      schema @source(name: "jsonApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }
      scalar JSON
      type Query {
        row: Row
          @connect(
            source: "jsonApi"
            http: { GET: "/row" }
            selection: """
            metadata
            """
          )
      }
      type Row {
        metadata: JSON
      }
    `;
    const schema = processDirectives(buildSchema(`${CONNECTOR_DIRECTIVES}\n${sdl}`), {
      globalFetch: fetchImpl as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          row {
            metadata
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ row: { metadata: { attributes: { id: 'A' } } } });
  });

  it('coerces XSD 1/0 and list Boolean connector returns', async () => {
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Root><Enabled>1</Enabled><Flag>true</Flag><Flag>0</Flag></Root>`,
        { status: 200, headers: { 'content-type': 'text/xml' } },
      );
    const sdl = /* GraphQL */ `
      schema @source(name: "xmlApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }
      type Query {
        enabled: Boolean
          @connect(
            source: "xmlApi"
            http: { GET: "/enabled" }
            selection: "$.Root.Enabled"
          )
        flags: [Boolean!]
          @connect(
            source: "xmlApi"
            http: { GET: "/flags" }
            selection: "$.Root.Flag"
          )
      }
    `;
    const schema = processDirectives(buildSchema(`${CONNECTOR_DIRECTIVES}\n${sdl}`), {
      globalFetch: fetchImpl as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          enabled
          flags
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ enabled: true, flags: [true, false] });
  });

  it('does not force parent prefix onto unprefixed children with default xmlns', () => {
    const inherited = inheritXmlNamespacePrefixes({
      'p:Root': {
        child: {
          attributes: { xmlns: 'urn:child' },
          value: 'x',
        },
      },
    });
    expect(inherited).toEqual({
      'p:Root': {
        child: {
          attributes: { xmlns: 'urn:child' },
          value: 'x',
        },
      },
    });
  });

  it('strips only valid XSD date timezone offsets', () => {
    expect(coerceXsdDateString('2017-03-10+00:00')).toBe('2017-03-10');
    expect(coerceXsdDateString('2017-03-10Z')).toBe('2017-03-10');
    expect(coerceXsdDateString('2017-03-10+13:59')).toBe('2017-03-10');
    expect(coerceXsdDateString('2017-03-10+14:00')).toBe('2017-03-10');
    expect(coerceXsdDateString('2017-03-10-14:00')).toBe('2017-03-10');
    // Invalid XSD offsets stay intact for GraphQL Date to reject.
    expect(coerceXsdDateString('2017-03-10+99:99')).toBe('2017-03-10+99:99');
    expect(coerceXsdDateString('2017-03-10+14:01')).toBe('2017-03-10+14:01');
    expect(coerceXsdDateString('2017-03-10+00:60')).toBe('2017-03-10+00:60');
  });

  it('rejects invalid XSD date offsets via GraphQL Date after coerce', async () => {
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Envelope><Body><Person><DOB>2017-03-10+14:01</DOB></Person></Body></Envelope>`,
        { status: 200, headers: { 'content-type': 'text/xml' } },
      );
    const sdl = /* GraphQL */ `
      schema @source(name: "xmlApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }
      scalar Date
      type Query {
        person: Person
          @connect(
            source: "xmlApi"
            http: {
              POST: "/person"
              headers: [{ name: "Content-Type", value: "text/xml" }]
              body: """
              Request: { id: $("1") }
              """
            }
            selection: "dob: Envelope.Body.Person.DOB"
          )
      }
      type Person {
        dob: Date
      }
    `;
    const schema = processDirectives(buildSchema(`${CONNECTOR_DIRECTIVES}\n${sdl}`), {
      globalFetch: fetchImpl as any,
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person {
            dob
          }
        }
      `),
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(String(result.errors?.[0]?.message)).toContain('invalid date-string');
  });

  it('coerces XSD xs:date with timezone to GraphQL Date YYYY-MM-DD', async () => {
    // Imposter / InterSystems SOAP returns DOB as e.g. 2017-03-10+00:00.
    // GraphQL Date rejects the zone; processDirectives must strip it.
    const fetchImpl = async () =>
      new Response(
        `<?xml version="1.0"?><Envelope><Body><Person><DOB>2017-03-10+00:00</DOB><Name>Ada</Name></Person></Body></Envelope>`,
        { status: 200, headers: { 'content-type': 'text/xml' } },
      );

    const sdl = /* GraphQL */ `
      schema @source(name: "xmlApi", http: { baseURL: "http://localhost" }) {
        query: Query
      }

      scalar Date

      type Query {
        person: Person
          @connect(
            source: "xmlApi"
            http: {
              POST: "/person"
              headers: [{ name: "Content-Type", value: "text/xml" }]
              body: """
              Request: { id: $("1") }
              """
            }
            selection: """
            dob: Envelope.Body.Person.DOB
            name: Envelope.Body.Person.Name
            """
          )
      }

      type Person {
        dob: Date
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
          person {
            dob
            name
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ person: { dob: '2017-03-10', name: 'Ada' } });
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
