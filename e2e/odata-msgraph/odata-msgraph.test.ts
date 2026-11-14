import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

/** Mock Bearer for Connectors `{$env.MSGRAPH_ACCESS_TOKEN}` against local Graph service. */
const MOCK_TOKEN = 'e2e-msgraph-mock-token';

/** Same GraphQL documents as Mesh v0 `examples/odata-microsoft/example-queries`. */
const EXAMPLE_QUERIES_DIR = join(
  __dirname,
  '../../examples/odata-microsoft/example-queries',
);

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
      process.env.MSGRAPH_ACCESS_TOKEN = MOCK_TOKEN;
      const composition = await compose({
        output: 'graphql',
        services: [graph],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        env: {
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
