import { EventEmitter } from 'tsee';
import { printSchema } from 'graphql';
import handler from '../src';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';

describe('odata', () => {
  it('should create a GraphQL schema from a simple OData endpoint', async () => {
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/',
        services: [
          {
            servicePath: 'TripPinRESTierService/'
          }
        ]
      },
      hooks: new EventEmitter(),
      cache: new InMemoryLRUCache(),
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
