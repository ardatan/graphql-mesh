import type { ASTNode, ConstDirectiveNode, DefinitionNode, DocumentNode } from 'graphql';
import { Kind, parse, visit } from 'graphql';
import type { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { Neo4JAuthOpts } from '@graphql-mesh/transport-neo4j';
import {
  getDriverFromOpts,
  getExecutableSchemaFromTypeDefsAndDriver,
  getNeo4jDirectiveDefinitions,
} from '@graphql-mesh/transport-neo4j';
import { TRANSPORT_DIRECTIVE_SDL } from '@graphql-mesh/utils';
import { mergeSchemas } from '@graphql-tools/schema';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { polyfillStrReplaceAll, revertStrReplaceAllPolyfill } from './strReplaceAllPolyfill.js';

function createAddIntrospectionDirective(subgraph: string) {
  return function addIntrospectionDirective<
    TASTNode extends ASTNode & { directives?: readonly ConstDirectiveNode[] },
  >(node: TASTNode): TASTNode | void {
    if (!node.directives?.some(directive => directive.name.value === 'introspection')) {
      return {
        ...node,
        directives: [
          ...(node.directives || []),
          {
            kind: 'Directive',
            name: {
              kind: 'Name',
              value: 'introspection',
            },
            arguments: [
              {
                kind: 'Argument',
                name: {
                  kind: 'Name',
                  value: 'subgraph',
                },
                value: {
                  kind: 'StringValue',
                  value: subgraph,
                },
              },
            ],
          },
        ],
      };
    }
  };
}

function hasDirective(node: { directives?: readonly ConstDirectiveNode[] }, name: string): boolean {
  return Boolean(node.directives?.some(directive => directive.name.value === name));
}

/**
 * Stamp Mesh `@introspection(subgraph:)` on Neo4j model types so the transport can
 * re-augment without feeding Neo4j-generated Query/Mutation/filter types back in.
 * Author SDL only needs `@node` / `@relationshipProperties`; we still stamp for the
 * round-trip. Mapping stays Neo4j's own directives (`@node`, `@relationship`, …).
 */
function stampNeo4jModelIntrospection(typeDefs: DocumentNode, subgraph: string): DocumentNode {
  const addIntrospectionDirective = createAddIntrospectionDirective(subgraph);
  const rootOperationNames = new Set(['Query', 'Mutation', 'Subscription']);
  const modelTypeNames = new Set<string>();
  for (const def of typeDefs.definitions) {
    if (
      (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
      (hasDirective(def, 'node') ||
        hasDirective(def, 'relationshipProperties') ||
        hasDirective(def, 'introspection'))
    ) {
      modelTypeNames.add(def.name.value);
    }
    if (
      def.kind === Kind.OBJECT_TYPE_DEFINITION &&
      rootOperationNames.has(def.name.value) &&
      def.fields?.some(field => hasDirective(field, 'cypher'))
    ) {
      modelTypeNames.add(def.name.value);
    }
  }
  function stampTypeAndFields<
    T extends ASTNode & {
      name: { value: string };
      directives?: readonly ConstDirectiveNode[];
      fields?: readonly (ASTNode & { directives?: readonly ConstDirectiveNode[] })[];
    },
  >(node: T): T {
    if (!modelTypeNames.has(node.name.value)) {
      return node;
    }
    const stamped = (addIntrospectionDirective(node) || node) as T;
    if (!stamped.fields) {
      return stamped;
    }
    return {
      ...stamped,
      fields: stamped.fields.map(field => addIntrospectionDirective(field) || field),
    };
  }
  return visit(typeDefs, {
    ObjectTypeDefinition: stampTypeAndFields,
    InterfaceTypeDefinition: stampTypeAndFields,
  });
}

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
    typeDefs = stampNeo4jModelIntrospection(typeDefs, subgraphName);
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
    const addIntrospectionDirective = createAddIntrospectionDirective(subgraphName);
    typeDefs = visit(typeDefs, {
      EnumTypeDefinition: addIntrospectionDirective,
      ObjectTypeDefinition: addIntrospectionDirective,
      InterfaceTypeDefinition: addIntrospectionDirective,
      UnionTypeDefinition: addIntrospectionDirective,
      InputObjectTypeDefinition: addIntrospectionDirective,
      FieldDefinition: addIntrospectionDirective,
      ScalarTypeDefinition: addIntrospectionDirective,
      EnumValueDefinition: addIntrospectionDirective,
      InputValueDefinition: addIntrospectionDirective,
    });
    revertStrReplaceAllPolyfill();
  }

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
