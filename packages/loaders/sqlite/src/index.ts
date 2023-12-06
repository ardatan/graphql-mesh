import { GraphQLSchema } from 'graphql';
import { buildSchemaFromDatabase, buildSchemaFromInfile } from 'tuql';
import { path, process } from '@graphql-mesh/cross-helpers';
import { createDefaultExecutor } from '@graphql-tools/delegate';

interface GraphQLSQLiteLoaderOpts {
  infile?: string;
  db?: string;
  cwd?: string;
}

export default function loadGraphQLSchemaFromSQLite(_name: string, opts: GraphQLSQLiteLoaderOpts) {
  return loadGraphQLSchemaFromOptions(opts);
}

export function loadGraphQLSchemaFromOptions(
  opts: GraphQLSQLiteLoaderOpts,
): Promise<GraphQLSchema> {
  const cwd = opts.cwd || process.cwd();
  if (opts.infile != null) {
    const absolutePath = path.isAbsolute(opts.infile) ? opts.infile : path.join(cwd, opts.infile);
    return buildSchemaFromInfile(absolutePath);
  }
  if (opts.db != null) {
    const absolutePath = path.isAbsolute(opts.db) ? opts.db : path.join(cwd, opts.db);
    return buildSchemaFromDatabase(absolutePath);
  }
  throw new Error('Invalid options');
}

export function loadSQLiteSubgraph(name: string, opts: GraphQLSQLiteLoaderOpts) {
  return ({ cwd }: { cwd: string }) => ({
    name,
    schema$: loadGraphQLSchemaFromOptions(opts).then(schema => {
      schema.extensions = schema.extensions || {};
      const directivesObj: any = schema.extensions.directives || {};
      directivesObj.transport = {
        kind: 'sqlite',
        location: opts.infile || opts.db,
        options: {
          type: opts.infile != null ? 'infile' : 'db',
        },
      };
      return schema;
    }),
  });
}

interface ThriftTransportEntry {
  kind: 'thrift';
  location: string;
  options: {
    type: 'infile' | 'db';
  };
  cwd?: string;
}

export function getSubgraphExecutor(opts: ThriftTransportEntry) {
  const loaderOpts: GraphQLSQLiteLoaderOpts = {};
  if (opts.options.type === 'infile') {
    loaderOpts.infile = opts.location;
  } else {
    loaderOpts.db = opts.location;
  }
  loaderOpts.cwd = opts.cwd || process.cwd();
  return loadGraphQLSchemaFromOptions(loaderOpts).then(schema => createDefaultExecutor(schema));
}
