import { buildSchema } from 'graphql';
import { getTransportEntryMapUsingFusionAndFederationDirectives } from '../src/utils.js';

describe('getTransportEntryMapUsingFusionAndFederationDirectives', () => {
  it('does not write resolved transport entries onto the input schema extensions', () => {
    const schema = buildSchema(`
      type Query {
        hello: String
      }
    `);
    const before = schema.extensions;
    getTransportEntryMapUsingFusionAndFederationDirectives(schema, {
      '*': { kind: 'http', location: 'http://example.com/graphql' },
    });
    expect(schema.extensions).toBe(before);
    expect((schema.extensions as any)?.directives?.transport).toBeUndefined();
  });
});
