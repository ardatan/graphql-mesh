import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

/** Mock Bearer for Connectors `{$env.MSGRAPH_ACCESS_TOKEN}` against local Graph service. */
const MOCK_TOKEN = 'e2e-msgraph-mock-token';

const LIVE =
  process.env.MSGRAPH_LIVE === '1' &&
  Boolean(process.env.MSGRAPH_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN);

const LIVE_TOKEN = process.env.MSGRAPH_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN || '';

/** Same GraphQL documents as Mesh v0 `examples/odata-microsoft/example-queries`. */
const EXAMPLE_QUERIES_DIR = join(__dirname, '../../examples/odata-microsoft/example-queries');

function loadExampleQuery(name: string): string {
  return readFileSync(join(EXAMPLE_QUERIES_DIR, name), 'utf8');
}

const fetchRecentEmails = loadExampleQuery('fetchRecentEmails.graphql');
const fetchGroupsAndMembers = loadExampleQuery('fetchGroupsAndMembers.graphql');
const fetchFilesFromOneDrive = loadExampleQuery('fetchFilesFromOneDrive.graphql');

describe('Microsoft Graph Connectors', () => {
  let graph: Service;

  beforeAll(async () => {
    graph = await service('Graph');
  });

  it('composes Connectors from fixture $metadata (v0 example surface)', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [graph],
      maskServicePorts: true,
      env: { MSGRAPH_LIVE: '0' },
    });
    expect(result).toContain('name: "source"');
    expect(result).toContain('name: "connect"');
    expect(result).toContain('odata.metadata=minimal');
    expect(result).toContain('kind: "rest"');
    // Roots used by v0 example queries
    expect(result).toMatch(/\bme\b/);
    expect(result).toMatch(/\bgroups\b/);
    expect(result).toMatch(/\bmessages\b/);
    expect(result).toMatch(/\bdrives\b/);
    // Federation lifts `@key` into `@join__type(..., key: "id")`.
    expect(result).toMatch(/key:\s*"id"/);
    expect(result).toMatchSnapshot();
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    async function executeExample(query: string) {
      const composition = await compose({
        output: 'graphql',
        services: [graph],
        env: {
          MSGRAPH_LIVE: '0',
          MSGRAPH_ACCESS_TOKEN: MOCK_TOKEN,
        },
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        env: {
          MSGRAPH_LIVE: '0',
          MSGRAPH_ACCESS_TOKEN: MOCK_TOKEN,
        },
      });
      return execute({ query });
    }

    it('fetchRecentEmails (v0 example-query)', async () => {
      await expect(executeExample(fetchRecentEmails)).resolves.toMatchSnapshot();
    });

    it('fetchGroupsAndMembers (v0 example-query)', async () => {
      await expect(executeExample(fetchGroupsAndMembers)).resolves.toMatchSnapshot();
    });

    it('fetchFilesFromOneDrive (v0 example-query)', async () => {
      await expect(executeExample(fetchFilesFromOneDrive)).resolves.toMatchSnapshot();
    });
  });
});

/**
 * Real Microsoft Graph data through Hive Gateway and Apollo Router.
 * Opt in: `MSGRAPH_LIVE=1` + `MSGRAPH_ACCESS_TOKEN` (or `GRAPH_ACCESS_TOKEN`).
 * Path-filtered CI job sets these when the secret is present.
 *
 * `GRAPH_VERSION` mirrors example scripts (`v1.0` / `beta` → graph.microsoft.com/{version}).
 */
describe('Microsoft Graph Connectors (live Graph)', () => {
  const maybe = LIVE ? describe : describe.skip;
  const graphVersions = (process.env.GRAPH_VERSIONS || 'v1.0,beta')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  maybe.each(
    graphVersions.flatMap(version =>
      (['hive', 'apollo-router'] as ServeRunner[]).map(
        runner => [version, runner] as [string, ServeRunner],
      ),
    ),
  )('execute v0 example-queries with %s + %s → graph.microsoft.com', (graphVersion, runner) => {
    jest.setTimeout(300_000);

    async function executeLive(query: string) {
      const composition = await compose({
        output: 'graphql',
        env: {
          MSGRAPH_LIVE: '1',
          MSGRAPH_ACCESS_TOKEN: LIVE_TOKEN,
          GRAPH_VERSION: graphVersion,
        },
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        env: {
          MSGRAPH_LIVE: '1',
          MSGRAPH_ACCESS_TOKEN: LIVE_TOKEN,
          GRAPH_VERSION: graphVersion,
        },
      });
      return execute({ query });
    }

    it('fetchRecentEmails.graphql', async () => {
      const result = await executeLive(fetchRecentEmails);
      expect(result.errors).toBeUndefined();
      const me = result.data?.me as Record<string, unknown> | undefined;
      expect(me).toEqual(
        expect.objectContaining({
          displayName: expect.any(String),
        }),
      );
      expect(Array.isArray(me?.messages)).toBe(true);
      for (const msg of (me?.messages as any[]) || []) {
        expect(msg).toEqual(
          expect.objectContaining({
            subject: expect.anything(),
            isRead: expect.any(Boolean),
          }),
        );
      }
    });

    it('fetchGroupsAndMembers.graphql', async () => {
      const result = await executeLive(fetchGroupsAndMembers);
      expect(result.errors).toBeUndefined();
      expect(Array.isArray(result.data?.groups)).toBe(true);
      for (const group of (result.data?.groups as any[]) || []) {
        expect(group).toEqual(
          expect.objectContaining({
            displayName: expect.any(String),
          }),
        );
        expect(Array.isArray(group.members)).toBe(true);
      }
    });

    it('fetchFilesFromOneDrive.graphql', async () => {
      const result = await executeLive(fetchFilesFromOneDrive);
      expect(result.errors).toBeUndefined();
      const me = result.data?.me as Record<string, unknown> | undefined;
      expect(Array.isArray(me?.drives)).toBe(true);
      for (const drive of (me?.drives as any[]) || []) {
        expect(drive?.quota).toEqual(
          expect.objectContaining({
            used: expect.anything(),
            remaining: expect.anything(),
          }),
        );
        expect(drive?.root?.children == null || Array.isArray(drive.root.children)).toBe(true);
      }
    });
  });
});
