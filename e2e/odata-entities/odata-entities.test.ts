import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

describe('OData Federation entities without @merge', () => {
  let odata: Service;
  let catalog: Service;

  beforeAll(async () => {
    odata = await service('OData');
    catalog = await service('catalog');
  });

  it('composes OData entity:true + catalog stub without Mesh @merge', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [odata, catalog],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    expect(result).toMatch(/AirlinesByAirlineCode[\s\S]*entity:\s*true/);
    expect(result).toMatch(
      /type Airline[\s\S]*@join__type\(graph: TRIPPIN,\s*key: "AirlineCode"\)/,
    );
    expect(result).toMatch(
      /@join__directive\(graphs: \[TRIPPIN\], name: "connect", args: \{source: "Trippin"[\s\S]*\$this\.AirlineCode[\s\S]*entity: true/,
    );
    expect(result).not.toMatch(
      /type Airline[\s\S]*@join__directive\(graphs: \[CATALOG\], name: "connect"/,
    );
    expect(result).toMatch(
      /type Trip[\s\S]*@join__type\(graph: TRIPPIN,\s*key: "TripId",\s*resolvable: false\)/,
    );
    expect(result).not.toMatch(/@merge\(/);
    expect(result).not.toMatch(/import:\s*\[[^\]]*@merge/);
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('resolves Airline stub fields from OData owner', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [odata, catalog],
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
            AirlinesByAirlineCode(AirlineCode: "UA") {
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
          AirlineCode: 'UA',
          Name: 'United Airlines',
        },
      });
    });
  });
});
