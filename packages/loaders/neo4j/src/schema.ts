import type { DefinitionNode, DocumentNode } from 'graphql';
import { parse } from 'graphql';
import type { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { Neo4JAuthOpts } from '@graphql-mesh/transport-neo4j';
import {
  getDriverFromOpts,
  getExecutableSchemaFromTypeDefsAndDriver,
  getNeo4jDirectiveDefinitions,
  stampSubgraphOnNeo4jDirectives,
} from '@graphql-mesh/transport-neo4j';
import { importMeshDirectives, meshSpecUrl, TRANSPORT_DIRECTIVE_SDL } from '@graphql-mesh/utils';
import { mergeSchemas } from '@graphql-tools/schema';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { polyfillStrReplaceAll, revertStrReplaceAllPolyfill } from './strReplaceAllPolyfill.js';

/**
 * Options for {@link loadGraphQLSchemaFromNeo4J} / {@link loadNeo4JSubgraph}.
 *
 * Either introspects the target database (`@neo4j/introspector`) or uses author
 * Neo4j GraphQL SDL via {@link LoadGraphQLSchemaFromNeo4JOpts.typeDefs}. The loader
 * stamps `subgraph:` on Neo4j directives and writes `@transport(kind: "neo4j")` so the
 * runtime transport can reconnect with the same endpoint / database / auth.
 *
 * @example
 * ```ts
 * import { loadNeo4JSubgraph } from '@omnigraph/neo4j'
 *
 * loadNeo4JSubgraph('Movies', {
 *   endpoint: 'neo4j+s://xxxx.databases.neo4j.io',
 *   database: 'neo4j',
 *   auth: { type: 'basic', username: 'neo4j', password: process.env.NEO4J_PASSWORD! },
 * })
 * ```
 */
export interface LoadGraphQLSchemaFromNeo4JOpts {
  /**
   * Bolt URL for the Neo4j instance (stored on `@transport.location` for the executor).
   *
   * @example 'neo4j://localhost:7687'
   * @example 'neo4j+s://xxxx.databases.neo4j.io'
   */
  endpoint: string;
  /**
   * Database name used for introspection sessions and runtime `sessionConfig`.
   * Defaults to `"neo4j"`.
   *
   * @default 'neo4j'
   * @example 'movies'
   */
  database?: string;
  /**
   * Driver authentication. Also embedded under `@transport.options.auth` for runtime so the
   * executor reconnects with the same credentials. Supports basic, Kerberos, bearer, and custom
   * schemes via {@link Neo4JAuthOpts}.
   *
   * @default unauthenticated (`scheme: "none"`) when omitted
   * @example { type: 'basic', username: 'neo4j', password: 'secret' }
   */
  auth?: Neo4JAuthOpts;
  /**
   * Mesh PubSub used at load time. When provided together with a caller-supplied {@link driver},
   * the loader keeps that driver open so Neo4j GraphQL subscription features (CDC / reactive)
   * can share it across compose and runtime. Without pubsub, a temporary introspect driver is
   * closed after schema load. Omit when load-time Neo4j subscription wiring is not needed.
   */
  pubsub?: PubSub;
  /**
   * Optional logger for driver construction and compose-time diagnostics. The compose CLI
   * injects one via {@link loadNeo4JSubgraph}; when set, driver logs are forwarded at matching
   * levels through {@link getDriverFromOpts}.
   */
  log?: Logger;
  /**
   * Optional existing Neo4j driver reused for introspection / schema build (for example a
   * process-wide pool shared with the runtime executor). When omitted, one is created from
   * {@link endpoint} and {@link auth} and closed after load unless {@link pubsub} keeps it open.
   *
   * @default created from endpoint/auth when omitted
   */
  driver?: Driver;
  /**
   * Author-written Neo4j GraphQL SDL (`@node`, `@relationship`, `@cypher`, `@alias`, …).
   * When set, skips database introspection via `@neo4j/introspector` and builds the executable
   * schema from these definitions instead. When omitted, the loader introspects the connected
   * database. Prefer `subgraph:` on Neo4j directives when composing multiple Neo4j sources;
   * the loader stamps it when missing.
   *
   * @example
   * ```graphql
   * type Movie @node {
   *   title: String!
   *   actors: [Person!]! @relationship(type: "ACTED_IN", direction: IN)
   * }
   * type Person @node { name: String! }
   * ```
   */
  typeDefs?: string | DocumentNode;
}

function parseTypeDefs(typeDefs: string | DocumentNode): DocumentNode {
  return typeof typeDefs === 'string' ? parse(typeDefs, { noLocation: true }) : typeDefs;
}

/**
 * Load a GraphQL schema for one Neo4j Mesh subgraph (introspect or author SDL).
 *
 * @param subgraphName - Mesh subgraph name; stamped onto Neo4j directives and `@transport`.
 * @param opts - Connection and schema options ({@link LoadGraphQLSchemaFromNeo4JOpts}).
 */
export async function loadGraphQLSchemaFromNeo4J(
  subgraphName: string,
  {
    endpoint,
    auth,
    log,
    pubsub,
    database = 'neo4j',
    driver,
    typeDefs: typeDefsInput,
  }: LoadGraphQLSchemaFromNeo4JOpts,
) {
  let closeDriverAfter = false;
  if (!driver) {
    closeDriverAfter = !pubsub;
    driver = getDriverFromOpts({
      endpoint,
      auth,
      log,
    });
  }

  let typeDefs: DocumentNode;
  if (typeDefsInput) {
    log?.info('Using author-provided Neo4j GraphQL typeDefs');
    typeDefs = parseTypeDefs(typeDefsInput);
  } else {
    log?.info('Inferring the schema from the database: ', `"${database}"`);
    polyfillStrReplaceAll();
    const typeDefsStr = await toGraphQLTypeDefs(() =>
      driver.session({
        database,
        defaultAccessMode: neo4j.session.READ,
      }),
    );
    typeDefs = parse(typeDefsStr, { noLocation: true });
    revertStrReplaceAllPolyfill();
  }

  // Attribute Neo4j model directives to this Mesh subgraph (multi-Neo4j compose).
  typeDefs = stampSubgraphOnNeo4jDirectives(typeDefs, subgraphName);

  // @transport is included for Mesh merge/output order, but stripped inside
  // getExecutableSchemaFromTypeDefsAndDriver before Neo4jGraphQL 7.6.6+ sees it.
  (typeDefs.definitions as DefinitionNode[]).push(
    ...getNeo4jDirectiveDefinitions(),
    ...parse(TRANSPORT_DIRECTIVE_SDL, { noLocation: true }).definitions,
  );

  const schema = await getExecutableSchemaFromTypeDefsAndDriver({
    driver,
    pubsub,
    typeDefs,
  });

  if (closeDriverAfter) {
    await driver.close();
  }

  const schemaExtensions: any = (schema.extensions ||= {});
  schemaExtensions.directives = schemaExtensions.directives || {};
  schemaExtensions.directives.transport = [
    {
      kind: 'neo4j',
      subgraph: subgraphName,
      location: endpoint,
      options: {
        database,
        auth,
      },
    },
  ];
  return importMeshDirectives(
    importMeshDirectives(
      mergeSchemas({
        schemas: [schema],
        typeDefs,
        assumeValid: true,
        assumeValidSDL: true,
      }),
      ['@node', '@relationship', '@relationshipProperties', '@alias', '@cypher', '@plural'],
      { url: meshSpecUrl('neo4j') },
    ),
    ['@transport'],
  );
}
