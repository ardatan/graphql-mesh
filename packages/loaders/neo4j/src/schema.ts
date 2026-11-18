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
import { TRANSPORT_DIRECTIVE_SDL } from '@graphql-mesh/utils';
import { mergeSchemas } from '@graphql-tools/schema';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { polyfillStrReplaceAll, revertStrReplaceAllPolyfill } from './strReplaceAllPolyfill.js';

export interface LoadGraphQLSchemaFromNeo4JOpts {
  endpoint: string;
  database?: string;
  auth?: Neo4JAuthOpts;
  pubsub?: PubSub;
  log?: Logger;
  driver?: Driver;
  /**
   * Author-written Neo4j GraphQL SDL (`@node`, `@relationship`, `@cypher`, `@alias`, …).
   * When set, skips database introspection via `@neo4j/introspector`.
   * Prefer `subgraph:` on Neo4j directives when composing multiple Neo4j sources;
   * the loader stamps it when missing.
   */
  typeDefs?: string | DocumentNode;
}

function parseTypeDefs(typeDefs: string | DocumentNode): DocumentNode {
  return typeof typeDefs === 'string' ? parse(typeDefs, { noLocation: true }) : typeDefs;
}

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
  return mergeSchemas({
    schemas: [schema],
    typeDefs,
    assumeValid: true,
    assumeValidSDL: true,
  });
}
