import { createTenv, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

/** Public API uses renamed arg; `@protobuf__rpc(args:)` bind is rewritten to match. */
const query = /* GraphQL */ `
  query MoviesByYear($year: Int!) {
    moviesByYear(releaseYear: $year) {
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
])(
  'protobuf HTTP transport ($label)',
  ({ style, serviceName, maskedLocation, maskedTwirpLocation }) => {
    let upstream: Service;

    beforeAll(async () => {
      upstream = await service(serviceName);
    });

    it(`composes with ${style} location, rename transform, and rewritten args binds`, async () => {
      const { result } = await compose({
        services: [upstream],
        maskServicePorts: true,
        env: { PROTOBUF_HTTP_STYLE: style },
      });
      expect(result).toContain('kind: "protobuf"');
      expect(result).toContain('@protobuf__rpc');
      expect(result).toContain(maskedLocation);
      expect(result).toContain('releaseYear');
      // Connect-like: $args bind follows the public GraphQL arg name (no Mesh @source).
      expect(result).toMatch(/2\(int64\):\s*\$args\.releaseYear/);
      expect(result).not.toMatch(/\$args\.year(?![A-Za-z0-9_])/);
      expect(result).not.toMatch(/@source\(/);
      expect(result).not.toMatch(/@meshSource\(/);
      if (style === 'twirp') {
        expect(result).toContain('Content-Type');
        expect(result).toContain('application/protobuf');
      } else {
        expect(result).not.toContain(maskedTwirpLocation);
        expect(result).not.toContain('application/protobuf');
      }
    });

    it(`executes unary GetMovies over official ${style} after arg rename`, async () => {
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
  },
);
