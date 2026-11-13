import { execute, parse } from 'graphql';
import { Logger } from '@graphql-hive/logger';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import {
  loadGraphQLSchemaFromOData,
  loadNonExecutableGraphQLSchemaFromOData,
} from '../src/index.js';

const MSGRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';
const TOKEN = process.env.MSGRAPH_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN;

const log = new Logger({ level: false as any, prefix: 'msgraph-test' });

describe('Microsoft Graph + Connectors', () => {
  jest.setTimeout(180_000);

  // $metadata is public (~1.8MB). Skip in CI unless explicitly opted in.
  (process.env.CI && !TOKEN && process.env.MSGRAPH_LIVE !== '1' ? it.skip : it)(
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
      });

      const sdl = printSchemaWithDirectives(schema);
      expect(sdl).toContain('@source(');
      expect(sdl).toContain('odata.metadata=minimal');
      expect(sdl).toContain('@connect(');
      expect(sdl).toMatch(/me\b[\s\S]*@connect/);
      expect(sdl).toContain('kind: "rest"');
      // Entity keys for microsoft.graph.user
      expect(sdl).toMatch(/@key\(fields:\s*"id"\)/);

      const sourceExt = (schema.extensions as any)?.directives?.source?.[0];
      expect(sourceExt?.http?.baseURL).toContain('graph.microsoft.com');
      const accept = sourceExt?.http?.headers?.find(
        (h: { name: string }) => h.name.toLowerCase() === 'accept',
      );
      expect(accept?.value).toContain('odata.metadata');
    },
  );

  (TOKEN ? it : it.skip)(
    'live: me { displayName id } uses Bearer token and Hive $select',
    async () => {
      let requestedUrl = '';
      let requestedAuth = '';
      const fetchFn: typeof defaultFetch = async (input, init) => {
        const url = String(typeof input === 'string' ? input : (input as Request).url);
        if (!url.includes('/$metadata')) {
          requestedUrl = url;
          const headers = new Headers(
            (init?.headers as HeadersInit) ||
              (typeof input !== 'string' ? (input as Request).headers : undefined),
          );
          requestedAuth = headers.get('authorization') || headers.get('Authorization') || '';
        }
        return defaultFetch(input as any, init as any);
      };

      // Ensure Connectors `{$env.MSGRAPH_ACCESS_TOKEN}` resolves.
      process.env.MSGRAPH_ACCESS_TOKEN = TOKEN!;

      const schema = await loadGraphQLSchemaFromOData('MicrosoftGraph', {
        endpoint: MSGRAPH_ENDPOINT,
        baseDir: __dirname,
        fetchFn,
        log,
        importFn: async (id: string) => import(id),
        operationHeaders: {
          Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
        },
        expandNavProps: true,
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
      // Concrete `user` type → Hive OData profile should project leaves.
      expect(decodeURIComponent(requestedUrl)).toMatch(/\$select=/);
      expect(decodeURIComponent(requestedUrl)).toMatch(/id/);
      expect(decodeURIComponent(requestedUrl)).toMatch(/displayName/);
    },
  );
});
