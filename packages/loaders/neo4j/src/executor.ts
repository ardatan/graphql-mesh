import { DirectiveNode, GraphQLSchema, visit } from 'graphql';
import { Driver } from 'neo4j-driver';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { Executor, getDirective, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { getDriverFromOpts } from './driver';
import { getExecutableSchemaFromTypeDefsAndDriver } from './schema';

export interface Neo4JExecutorOpts {
  schema: GraphQLSchema;
  driver?: Driver;
  pubsub?: MeshPubSub;
  logger?: Logger;
}

function filterIntrospectionDefinitions<TASTNode extends { directives?: readonly DirectiveNode[] }>(
  node: TASTNode,
): TASTNode | null {
  if (!node.directives?.some(directive => directive.name.value === 'introspection')) {
    return null;
  }
  return node;
}

export async function getNeo4JExecutor(opts: Neo4JExecutorOpts): Promise<Executor> {
  const transportDirectives = getDirective(opts.schema, opts.schema, 'transport');
  if (!transportDirectives?.length) {
    throw new Error('No transport directive found on the schema!');
  }
  const {
    location: endpoint,
    options: { database, auth },
  } = transportDirectives[0];
  let driver = opts.driver;
  if (!driver) {
    driver = getDriverFromOpts({
      endpoint,
      auth,
      logger: opts.logger,
    });
  }
  let typeDefs = getDocumentNodeFromSchema(opts.schema);
  const astVisitor = {
    enter: filterIntrospectionDefinitions,
  };
  typeDefs = visit(typeDefs, {
    EnumTypeDefinition: astVisitor,
    ObjectTypeDefinition: astVisitor,
    InterfaceTypeDefinition: astVisitor,
    UnionTypeDefinition: astVisitor,
    InputObjectTypeDefinition: astVisitor,
    FieldDefinition: astVisitor,
    // DirectiveDefinition: astVisitor,
    ScalarTypeDefinition: astVisitor,
    EnumValueDefinition: astVisitor,
    InputValueDefinition: astVisitor,
  });
  const executableSchema = await getExecutableSchemaFromTypeDefsAndDriver({
    driver,
    logger: opts.logger,
    pubsub: opts.pubsub,
    typeDefs,
  });
  const defaultExecutor = createDefaultExecutor(executableSchema);
  const sessionConfig = {
    database,
  };

  return function neo4JExecutor(args) {
    return defaultExecutor({
      ...args,
      context: {
        ...args.context,
        sessionConfig,
      },
    });
  };
}
