import type { GraphQLSchema } from 'graphql';
import { path, process } from '@graphql-mesh/cross-helpers';

export interface GraphQLSQLiteLoaderOpts {
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
  const tuql$ = import('tuql').catch(e => {
    throw new Error('You need to install `tuql` package in order to use SQLite data source.');
  });
  const cwd = opts.cwd || process.cwd();
  if (opts.infile != null) {
    const absolutePath = path.isAbsolute(opts.infile) ? opts.infile : path.join(cwd, opts.infile);
    return tuql$.then(tuql => tuql.buildSchemaFromInfile(absolutePath));
  }
  if (opts.db != null) {
    const absolutePath = path.isAbsolute(opts.db) ? opts.db : path.join(cwd, opts.db);
    return tuql$.then(tuql => tuql.buildSchemaFromDatabase(absolutePath));
  }
  throw new Error('Invalid options');
}

export function loadSQLiteSubgraph(name: string, opts: GraphQLSQLiteLoaderOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromOptions(opts).then(schema => {
      const extensionsObj: any = (schema.extensions = schema.extensions || {});
      extensionsObj.directives ||= {};
      extensionsObj.directives.transport = {
        kind: 'sqlite',
        subgraph: name,
        location: opts.infile || opts.db,
        options: {
          type: opts.infile != null ? 'infile' : 'db',
        },
      };
      return schema;
    }),
  });
}
