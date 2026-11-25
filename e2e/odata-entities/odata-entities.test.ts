import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

describe('OData Federation entities without @merge', () => {
  let catalog: Service;

  beforeAll(async () => {
    catalog = await service('catalog');
  });

  it('composes live TripPin entity:true + catalog stub without Mesh @merge', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [catalog],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    expect(result).toMatch(/AirlinesByAirlineCode[\s\S]*entity:\s*true/);
    expect(result).toMatch(
      /type Airline[\s\S]*@join__type\(graph: TRIPPIN,\s*key: "AirlineCode"\)/,
    );
    // GraphQL 17 pretty-prints directive args with newlines after `{`; allow
    // insignificant whitespace so 16/17 share the same assertion.
    expect(result).toMatch(
      /@join__directive\(\s*graphs:\s*\[TRIPPIN\],\s*name:\s*"connect",\s*args:\s*\{\s*source:\s*"Trippin"[\s\S]*\$this\.AirlineCode[\s\S]*entity:\s*true/,
    );
    expect(result).not.toMatch(
      /type Airline[\s\S]*@join__directive\(graphs: \[CATALOG\], name: "connect"/,
    );
    // Nested-only Trip: key present but not resolvable (no root entity set).
    expect(result).toMatch(
      /type Trip[\s\S]*@join__type\(graph: TRIPPIN,\s*key: "TripId",\s*resolvable: false\)/,
    );
    expect(result).not.toMatch(/@merge\(/);
    expect(result).not.toMatch(/import:\s*\[[^\]]*@merge/);
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('resolves Airline stub fields from live TripPin', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [catalog],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const queryResult = await execute({
        query: /* GraphQL */ `
          query {
            featuredAirline {
              AirlineCode
              isFeatured
              Name
            }
            AirlinesByAirlineCode(AirlineCode: "FM") {
              AirlineCode
              Name
            }
          }
        `,
      });
      expect(queryResult.errors).toBeFalsy();
      expect(queryResult.data).toEqual({
        featuredAirline: {
          AirlineCode: 'AA',
          isFeatured: true,
          Name: 'American Airlines',
        },
        AirlinesByAirlineCode: {
          AirlineCode: 'FM',
          Name: 'Shanghai Airline',
        },
      });
    });
  });
});
