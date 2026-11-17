import { createTenv, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

const query = /* GraphQL */ `
  query MoviesByYear($year: Int!) {
    moviesByYear(year: $year) {
      result {
        name
        year
        rating
        cast
        genre
      }
    }
  }
`;

describe.each([
  {
    style: 'connect' as const,
    label: 'ConnectRPC (@connectrpc/connect-node)',
    serviceName: 'connect',
    maskedLocation: 'location: "http://localhost:<connect_port>"',
    maskedTwirpLocation: 'location: "http://localhost:<connect_port>/twirp"',
  },
  {
    style: 'twirp' as const,
    label: 'Twirp (twirp-ts)',
    serviceName: 'twirp',
    maskedLocation: 'location: "http://localhost:<twirp_port>/twirp"',
    maskedTwirpLocation: 'location: "http://localhost:<twirp_port>/twirp"',
  },
])('protobuf HTTP transport ($label)', ({ style, serviceName, maskedLocation, maskedTwirpLocation }) => {
  let upstream: Service;

  beforeAll(async () => {
    upstream = await service(serviceName);
  });

  it(`composes hand SDL with ${style} location`, async () => {
    const { result } = await compose({
      services: [upstream],
      maskServicePorts: true,
      env: { PROTOBUF_HTTP_STYLE: style },
    });
    expect(result).toContain('kind: "protobuf"');
    expect(result).toContain('@protobuf__rpc');
    expect(result).toContain(maskedLocation);
    if (style === 'twirp') {
      expect(result).toContain('Content-Type');
      expect(result).toContain('application/protobuf');
    } else {
      expect(result).not.toContain(maskedTwirpLocation);
      expect(result).not.toContain('application/protobuf');
    }
  });

  it(`executes unary GetMovies over official ${style} server`, async () => {
    const { output } = await compose({
      services: [upstream],
      output: 'graphql',
      env: { PROTOBUF_HTTP_STYLE: style },
    });
    const { execute } = await serve({ supergraph: output });
    await expect(
      execute({
        query,
        variables: { year: 2015 },
      }),
    ).resolves.toEqual({
      data: {
        moviesByYear: {
          result: [
            {
              name: 'Mission: Impossible Rogue Nation',
              year: 2015,
              rating: 0.9700000286102295,
              cast: ['Tom Cruise', 'Simon Pegg', 'Jeremy Renner'],
              genre: 'ACTION',
            },
          ],
        },
      },
    });
  });

  it(`returns empty result when no ${style} movies match`, async () => {
    const { output } = await compose({
      services: [upstream],
      output: 'graphql',
      env: { PROTOBUF_HTTP_STYLE: style },
    });
    const { execute } = await serve({ supergraph: output });
    await expect(
      execute({
        query,
        variables: { year: 1999 },
      }),
    ).resolves.toEqual({
      data: {
        moviesByYear: {
          result: [],
        },
      },
    });
  });
});
