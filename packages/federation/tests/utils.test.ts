import { buildSchema, Kind, parse } from 'graphql';
import {
  createComplementaryPercentOverrideHandlers,
  getCacheKeyFnFromKey,
  getKeyFnForFederation,
  getRngFromEnv,
  parseJoinDirective,
  progressiveOverridePossibilityHandler,
} from '../src/utils.js';

describe('@graphql-tools/federation utils', () => {
  describe('getCacheKeyFnFromKey / getKeyFnForFederation', () => {
    it('encodes composite cache keys without losing field boundaries', () => {
      const cacheKeyFn = getCacheKeyFnFromKey('id region');
      // Space-joined strings would collide: "ab c" vs "a bc"
      expect(cacheKeyFn({ id: 'ab', region: 'c' })).not.toBe(cacheKeyFn({ id: 'a', region: 'bc' }));
      expect(cacheKeyFn({ id: 'ab', region: 'c' })).toBe(JSON.stringify(['ab', 'c']));
    });

    it('preserves nullish positions in composite cache keys', () => {
      const cacheKeyFn = getCacheKeyFnFromKey('id region');
      expect(cacheKeyFn({ id: null, region: 'us' })).toBe(JSON.stringify([null, 'us']));
      expect(cacheKeyFn({ id: 'us', region: null })).toBe(JSON.stringify(['us', null]));
    });

    it('parses simple federation keys as field sets with commas or whitespace', () => {
      const byComma = getKeyFnForFederation('User', ['id, region']);
      const bySpace = getKeyFnForFederation('User', ['id region']);
      const root = { id: '1', region: 'us', extra: true };
      expect(byComma(root)).toEqual({ __typename: 'User', id: '1', region: 'us' });
      expect(bySpace(root)).toEqual({ __typename: 'User', id: '1', region: 'us' });
    });
  });

  describe('progressiveOverridePossibilityHandler', () => {
    const original = process.env.PROGRESSIVE_OVERRIDE_RNG;
    afterEach(() => {
      if (original === undefined) {
        delete process.env.PROGRESSIVE_OVERRIDE_RNG;
      } else {
        process.env.PROGRESSIVE_OVERRIDE_RNG = original;
      }
    });

    it('honors a configured RNG value of zero', () => {
      process.env.PROGRESSIVE_OVERRIDE_RNG = '0';
      expect(getRngFromEnv()).toBe(0);
      expect(progressiveOverridePossibilityHandler(0.5, () => 0.99)).toBe(true);
    });

    it('shares complementary percent decisions for destination and source', () => {
      const { destination, source } = createComplementaryPercentOverrideHandlers(0.5, () => 0.25);
      const info = { fieldName: 'f' } as any;
      const context = {};
      const dest = destination(context, info);
      const src = source(context, info);
      expect(dest).toBe(true);
      expect(src).toBe(false);
      expect(dest).not.toBe(src);
    });
  });

  describe('parseJoinDirective', () => {
    it('accepts a singleton enum in graphs', () => {
      const doc = parse(`
        type Query @join__directive(graphs: PRODUCTS, name: "tag", args: { name: "x" }) {
          hello: String
        }
      `);
      const directive = (doc.definitions[0] as any).directives[0];
      const parsed = parseJoinDirective(directive);
      expect(parsed?.graphNames).toEqual(['PRODUCTS']);
      expect(parsed?.directive.name.value).toBe('tag');
    });

    it('accepts a list of enums in graphs', () => {
      const doc = parse(`
        type Query @join__directive(graphs: [PRODUCTS, USERS], name: "tag") {
          hello: String
        }
      `);
      const directive = (doc.definitions[0] as any).directives[0];
      const parsed = parseJoinDirective(directive);
      expect(parsed?.graphNames).toEqual(['PRODUCTS', 'USERS']);
    });

    it('rejects missing graphs', () => {
      const directive = {
        kind: Kind.DIRECTIVE,
        name: { kind: Kind.NAME, value: 'join__directive' },
        arguments: [
          {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'name' },
            value: { kind: Kind.STRING, value: 'tag' },
          },
        ],
      };
      expect(parseJoinDirective(directive as any)).toBeNull();
    });
  });

  describe('filterInternalFieldsAndTypes inaccessible alias', () => {
    it('hides elements when inaccessible is imported under an alias', async () => {
      const { filterInternalFieldsAndTypes } = await import('../src/utils.js');
      const schema = buildSchema(/* GraphQL */ `
        directive @link(url: String, import: [link__Import]) repeatable on SCHEMA
        directive @hidden on FIELD_DEFINITION | OBJECT
        scalar link__Import
        schema
          @link(
            url: "https://specs.apollo.dev/inaccessible/v0.2"
            import: [{ name: "@inaccessible", as: "@hidden" }]
          ) {
          query: Query
        }
        type Query {
          visible: String
          secret: String @hidden
        }
      `);
      const filtered = filterInternalFieldsAndTypes(schema);
      expect(filtered.getQueryType()?.getFields().visible).toBeDefined();
      expect(filtered.getQueryType()?.getFields().secret).toBeUndefined();
    });
  });
});
