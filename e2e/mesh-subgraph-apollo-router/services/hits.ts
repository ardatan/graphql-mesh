import type { IncomingMessage, ServerResponse } from 'node:http';

/** Shared GraphQL hit counter for proving Apollo Router delegated to a subgraph. */
export function createHitCounter() {
  let graphqlHits = 0;
  return {
    get count() {
      return graphqlHits;
    },
    bump() {
      graphqlHits += 1;
    },
    maybeServe(req: IncomingMessage, res: ServerResponse): boolean {
      if (req.url === '/_hits') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ graphqlHits }));
        return true;
      }
      if (req.method === 'POST' && (req.url === '/graphql' || req.url?.startsWith('/graphql?'))) {
        graphqlHits += 1;
      }
      return false;
    },
  };
}
