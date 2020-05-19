import * as express from 'express';
import * as graphqlHTTP from 'express-graphql';
import { getMesh, findAndParseConfig } from '@graphql-mesh/runtime';

async function main() {
  const meshConfig = await findAndParseConfig();
  const { schema, contextBuilder } = await getMesh(meshConfig);

  const app = express();

  app.use(
    graphqlHTTP(async req => ({
      schema,
      context: await contextBuilder(req),
      graphiql: {
        defaultQuery: /* GraphQL */ `{
  findCitiesUsingGET(limit: 5) {
    data {
      name
      dailyForecast {
        weather{
          description
        }
      }
    }
  }
}`.trim(),
      } as any,
    }))
  );

  app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000`);
  });
}

main().catch(err => console.error(err));
