import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execute, parse, type GraphQLSchema } from 'graphql';
import { Logger } from '@graphql-hive/logger';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import {
  loadGraphQLSchemaFromOData,
  loadNonExecutableGraphQLSchemaFromOData,
} from '../src/index.js';

const MSGRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';
const TOKEN = process.env.MSGRAPH_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN;

/** Live Graph runs when a delegated Bearer token is present (CI secret or local env). */
const LIVE = Boolean(TOKEN);

/**
 * Live `$metadata` compose: public document (~1.8MB). Opt in on CI with
 * `MSGRAPH_LIVE=1` (the dedicated workflow job sets this) so default unit CI stays light.
 */
const LIVE_METADATA = LIVE || process.env.MSGRAPH_LIVE === '1' || !process.env.CI;

const EXAMPLE_QUERIES_DIR = join(
  __dirname,
  '../../../../examples/odata-microsoft/example-queries',
);

const log = new Logger({ level: false as any, prefix: 'msgraph-test' });

function loadExampleQuery(name: string): string {
  return readFileSync(join(EXAMPLE_QUERIES_DIR, name), 'utf8');
}

async function loadLiveExecutableSchema(opts?: {
  onRequest?: (url: string, auth: string) => void;
}): Promise<GraphQLSchema> {
  process.env.MSGRAPH_ACCESS_TOKEN = TOKEN!;
  const fetchFn: typeof defaultFetch = async (input, init) => {
    const url = String(typeof input === 'string' ? input : (input as Request).url);
    if (!url.includes('/$metadata') && opts?.onRequest) {
      const headers = new Headers(
        (init?.headers as HeadersInit) ||
          (typeof input !== 'string' ? (input as Request).headers : undefined),
      );
      opts.onRequest(
        url,
        headers.get('authorization') || headers.get('Authorization') || '',
      );
    }
    return defaultFetch(input as any, init as any);
  };
  return loadGraphQLSchemaFromOData('MicrosoftGraph', {
    endpoint: MSGRAPH_ENDPOINT,
    baseDir: __dirname,
    fetchFn,
    log,
    importFn: async (id: string) => import(id),
    operationHeaders: {
      Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
    },
    expandNavProps: true,
    batch: 'json',
  });
}

describe('Microsoft Graph + Connectors', () => {
  jest.setTimeout(300_000);

  (LIVE_METADATA ? it : it.skip)(
    'emits @source/@connect/@key from live MS Graph $metadata',
    async () => {
      const schema = await loadNonExecutableGraphQLSchemaFromOData('MicrosoftGraph', {
        endpoint: MSGRAPH_ENDPOINT,
        baseDir: __dirname,
        fetchFn: defaultFetch,
        log,
        importFn: async (id: string) => import(id),
        operationHeaders: TOKEN
          ? { Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}' }
          : undefined,
        expandNavProps: true,
        batch: 'json',
      });

      const sdl = printSchemaWithDirectives(schema);
      expect(sdl).toContain('@source(');
      expect(sdl).toContain('odata.metadata=minimal');
      expect(sdl).toContain('@connect(');
      // Singletons / entity sets used by v0 example queries
      expect(sdl).toMatch(/\bme\b[\s\S]*@connect/);
      expect(sdl).toMatch(/\bgroups\b[\s\S]*@connect/);
      expect(sdl).toMatch(/@key\(fields:\s*"id"\)/);
      // Options-only @transport when batch/expandNavProps set
      expect(sdl).toContain('kind: "rest"');
      expect(sdl).toMatch(/options:[\s\S]*odata/);

      const sourceExt = (schema.extensions as any)?.directives?.source?.[0];
      expect(sourceExt?.http?.baseURL).toContain('graph.microsoft.com');
      const accept = sourceExt?.http?.headers?.find(
        (h: { name: string }) => h.name.toLowerCase() === 'accept',
      );
      expect(accept?.value).toContain('odata.metadata');
    },
  );

  describe('live example queries (v0 examples/odata-microsoft)', () => {
    (LIVE ? it : it.skip)(
      'me smoke: id/displayName + Hive $select',
      async () => {
        let requestedUrl = '';
        let requestedAuth = '';
        const schema = await loadLiveExecutableSchema({
          onRequest: (url, auth) => {
            requestedUrl = url;
            requestedAuth = auth;
          },
        });

        const result = await execute({
          schema,
          document: parse(/* GraphQL */ `
            {
              me {
                id
                displayName
              }
            }
          `),
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.me).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            displayName: expect.any(String),
          }),
        );
        expect(requestedAuth.toLowerCase()).toContain('bearer ');
        expect(requestedAuth).not.toContain('{env.');
        expect(decodeURIComponent(requestedUrl)).toMatch(/\$select=/);
        expect(decodeURIComponent(requestedUrl)).toMatch(/id/);
        expect(decodeURIComponent(requestedUrl)).toMatch(/displayName/);
      },
    );

    (LIVE ? it : it.skip)(
      'fetchRecentEmails.graphql — same shape as Mesh v0 example',
      async () => {
        const schema = await loadLiveExecutableSchema();
        const result = await execute({
          schema,
          document: parse(loadExampleQuery('fetchRecentEmails.graphql')),
        });

        expect(result.errors).toBeUndefined();
        const me = result.data?.me as Record<string, unknown> | undefined;
        expect(me).toEqual(
          expect.objectContaining({
            displayName: expect.any(String),
          }),
        );
        // officeLocation may be null; messages may be empty but must be a list
        expect(Array.isArray(me?.messages)).toBe(true);
        for (const msg of (me?.messages as any[]) || []) {
          expect(msg).toEqual(
            expect.objectContaining({
              subject: expect.anything(),
              isRead: expect.any(Boolean),
            }),
          );
        }
      },
    );

    (LIVE ? it : it.skip)(
      'fetchGroupsAndMembers.graphql — same shape as Mesh v0 example',
      async () => {
        const schema = await loadLiveExecutableSchema();
        const result = await execute({
          schema,
          document: parse(loadExampleQuery('fetchGroupsAndMembers.graphql')),
        });

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
      },
    );

    (LIVE ? it : it.skip)(
      'fetchFilesFromOneDrive.graphql — same shape as Mesh v0 example',
      async () => {
        const schema = await loadLiveExecutableSchema();
        const result = await execute({
          schema,
          document: parse(loadExampleQuery('fetchFilesFromOneDrive.graphql')),
        });

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
          expect(drive?.root?.children == null || Array.isArray(drive.root.children)).toBe(
            true,
          );
        }
      },
    );
  });
});
